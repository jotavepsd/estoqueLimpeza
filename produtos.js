// =========================================
// PRODUTOS
// =========================================

const produtosIniciais = [
  { nome: 'Água Sanitária', estoque: 12, estoqueMinimo: 5 },
  { nome: 'Álcool 70', estoque: 22, estoqueMinimo: 5 },
  { nome: 'Balde', estoque: 12, estoqueMinimo: 2 },
  { nome: 'Bombril', estoque: 0, estoqueMinimo: 5 },
  { nome: 'Desinfetante', estoque: 8, estoqueMinimo: 5 },
  { nome: 'Multiuso', estoque: 5, estoqueMinimo: 4 },
  { nome: 'Papel Higiênico', estoque: 21, estoqueMinimo: 10 },
  { nome: 'Papel Toalha', estoque: 7, estoqueMinimo: 5 },
  { nome: 'Rodo Grande', estoque: 11, estoqueMinimo: 2 },
  { nome: 'Sabão em Barra', estoque: 0, estoqueMinimo: 4 },
  { nome: 'Sabão em Pó', estoque: 5, estoqueMinimo: 3 },
  { nome: 'Sabonete Líquido', estoque: 8, estoqueMinimo: 4 },
  { nome: 'Saco de Lixo 100L', estoque: 46, estoqueMinimo: 15 },
  { nome: 'Saco de Lixo 30L', estoque: 470, estoqueMinimo: 50 }
];

let produtosCache = [];

function normalizarSlugProduto(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

// =========================================
// CRIAR PRODUTOS INICIAIS
// =========================================
async function criarProdutosIniciais() {
  try {
    const snapshot = await db.collection('produtos').limit(1).get();
    if (snapshot.empty) {
      const batch = db.batch();
      const agora = new Date().toLocaleString('pt-BR');

      for (const produto of produtosIniciais) {
        const id = normalizarSlugProduto(produto.nome);
        const ref = db.collection('produtos').doc(id);
        batch.set(ref, {
          id,
          nome: produto.nome,
          estoque: produto.estoque,
          estoqueMinimo: produto.estoqueMinimo ?? 3,
          ultimaAtualizacao: agora
        });
      }

      await batch.commit();
      console.log('✅ Produtos iniciais criados');
    }
  } catch (error) {
    console.error('Erro ao criar produtos iniciais:', error);
  }
}

// =========================================
// CARREGAR PRODUTOS (ÚNICA LEITURA PARA SELECT + TABELA)
// =========================================
async function carregarProdutos() {
  try {
    const snapshot = await db.collection('produtos').get();
    const produtos = [];

    snapshot.forEach(doc => {
      const produto = doc.data();
      produtos.push({
        ...produto,
        id: doc.id,
        estoque: Number(produto.estoque) || 0,
        estoqueMinimo: Number(produto.estoqueMinimo ?? 3)
      });
    });

    produtos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    produtosCache = produtos;

    atualizarSelectProdutos(produtos);
    filtrarEstoque();
    atualizarInfoProdutoSelecionado();

    return produtos;
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    mostrarToast('Erro ao carregar lista de produtos.', 'error');
    return [];
  }
}

function atualizarSelectProdutos(produtos) {
  const select = document.getElementById('produto');
  if (!select) return;

  const valorSelecionadoAnterior = select.value;
  select.innerHTML = '<option value="">Selecione um produto</option>';

  produtos.forEach(produto => {
    const option = document.createElement('option');
    option.value = produto.id;
    const alerta = produto.estoque === 0
      ? ' ⚠️ ZERADO'
      : (produto.estoque <= produto.estoqueMinimo ? ' 🟠 BAIXO' : '');
    option.textContent = `${produto.nome} (${produto.estoque})${alerta}`;
    select.appendChild(option);
  });

  if (valorSelecionadoAnterior && produtos.some(p => p.id === valorSelecionadoAnterior)) {
    select.value = valorSelecionadoAnterior;
  }
}

window.atualizarInfoProdutoSelecionado = function () {
  const select = document.getElementById('produto');
  const infoBox = document.getElementById('produtoSelecionadoInfo');
  if (!select || !infoBox) return;

  const id = select.value;
  if (!id) {
    infoBox.style.display = 'none';
    infoBox.innerHTML = '';
    return;
  }

  const produto = produtosCache.find(p => p.id === id);
  if (!produto) {
    infoBox.style.display = 'none';
    return;
  }

  const zerado = produto.estoque === 0;
  const baixo = !zerado && produto.estoque <= produto.estoqueMinimo;
  const corClasse = zerado ? 'critico' : (baixo ? 'alerta' : 'ok');

  infoBox.style.display = 'flex';
  infoBox.className = `produto-info-pill ${corClasse}`;
  infoBox.innerHTML = `
    <span>📦 Saldo atual: <strong>${produto.estoque}</strong></span>
  `;
};

// =========================================
// CADASTRAR NOVO PRODUTO
// =========================================
window.cadastrarNovoProduto = async function () {
  if (currentUser?.role !== 'admin') {
    mostrarToast('Apenas administradores podem cadastrar produtos!', 'error');
    return;
  }

  const campoNome = document.getElementById('novoProdutoNome');
  if (!campoNome) return;

  const nomeProduto = campoNome.value.trim();

  if (!nomeProduto) {
    mostrarToast('Digite o nome do produto', 'error');
    return;
  }

  setLoadingButton('btnNovoProduto', true, 'Adicionando...');

  try {
    const existe = produtosCache.some(
      p => p.nome && p.nome.toLowerCase() === nomeProduto.toLowerCase()
    );

    if (existe) {
      mostrarToast('Este produto já existe!', 'error');
      return;
    }

    const id = `${normalizarSlugProduto(nomeProduto)}_${Date.now()}`;

    await db.collection('produtos').doc(id).set({
      id,
      nome: nomeProduto,
      estoque: 0,
      estoqueMinimo: 3,
      ultimaAtualizacao: new Date().toLocaleString('pt-BR'),
      dataCadastro: new Date().toISOString()
    });

    mostrarToast(`✅ Produto "${nomeProduto}" cadastrado com sucesso!`, 'success');
    campoNome.value = '';

    await carregarProdutos();
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error);
    mostrarToast('Erro ao cadastrar produto', 'error');
  } finally {
    setLoadingButton('btnNovoProduto', false);
  }
};

// =========================================
// ATUALIZAR ESTOQUE DIRETO (MODAL + AUDITORIA)
// =========================================
window.atualizarEstoqueDireto = async function (id, nome, saldoAtual) {
  if (currentUser?.role !== 'admin') {
    mostrarToast('Apenas administradores podem atualizar o estoque direto!', 'error');
    return;
  }

  const dadosModal = await abrirModalAjusteEstoque({
    nomeProduto: nome,
    saldoAtual,
    usuarioAtual: currentUser.name
  });

  if (!dadosModal) return;

  const { novoSaldo, motivo, responsavel } = dadosModal;

  try {
    const produtoRef = db.collection('produtos').doc(id);
    const movRef = db.collection('movimentacoes').doc();
    const agora = new Date();
    const dataFormatadaBR = agora.toLocaleString('pt-BR');
    const dataISO = agora.toISOString();

    await db.runTransaction(async (transaction) => {
      const docAtual = await transaction.get(produtoRef);
      if (!docAtual.exists) {
        throw new Error('Produto não encontrado no banco de dados.');
      }

      const dados = docAtual.data();
      const saldoAnterior = Number(dados.estoque) || 0;
      const diferenca = novoSaldo - saldoAnterior;

      if (diferenca === 0) {
        throw new Error('O saldo já está atualizado com este valor.');
      }

      transaction.update(produtoRef, {
        estoque: novoSaldo,
        ultimaAtualizacao: dataFormatadaBR
      });

      const sinal = diferenca > 0 ? `+${diferenca}` : `${diferenca}`;
      transaction.set(movRef, {
        tipo: 'Ajuste',
        produto: dados.nome,
        produtoId: docAtual.id,
        quantidade: Math.abs(diferenca),
        diferenca,
        saldoAnterior,
        saldoPosterior: novoSaldo,
        responsavel,
        validade: null,
        recebimento: null,
        assinatura: null,
        observacoes: `Ajuste direto (${saldoAnterior} → ${novoSaldo} | ${sinal}): ${motivo}`,
        data: dataFormatadaBR,
        dataCriacao: dataISO,
        usuario: currentUser.name
      });
    });

    mostrarToast(`✏️ Estoque de "${nome}" atualizado para ${novoSaldo} e registado na auditoria!`, 'success');

    await Promise.all([
      carregarProdutos(),
      carregarHistorico()
    ]);
  } catch (error) {
    console.error('Erro ao atualizar estoque direto:', error);
    mostrarToast(error.message || 'Erro ao atualizar estoque direto.', 'error');
  }
};

// =========================================
// EXCLUIR PRODUTO (MODAL DE CONFIRMAÇÃO)
// =========================================
window.excluirProduto = async function (id, nome) {
  if (currentUser?.role !== 'admin') {
    mostrarToast('Apenas administradores podem excluir produtos!', 'error');
    return;
  }

  if (!id) {
    mostrarToast('Não foi possível identificar o produto.', 'error');
    return;
  }

  const confirmar = await abrirModalConfirmacao({
    titulo: '🗑️ Excluir Produto',
    mensagem: `Tem certeza que deseja excluir o produto "${nome}"?\n\nO produto será removido da lista de produtos. O histórico de movimentações não será apagado.`,
    textoConfirmar: 'Excluir Produto',
    textoCancelar: 'Cancelar',
    variante: 'danger'
  });

  if (!confirmar) return;

  try {
    await db.collection('produtos').doc(id).delete();
    mostrarToast(`🗑️ Produto "${nome}" excluído com sucesso!`, 'success');
    await carregarProdutos();
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    mostrarToast('Erro ao excluir produto. Tente novamente.', 'error');
  }
};

// =========================================
// RENDERIZAR TABELA DE ESTOQUE
// =========================================
function renderizarTabelaEstoque(produtos) {
  const tabela = document.getElementById('estoqueTabela');
  if (!tabela) return;

  tabela.innerHTML = '';
  atualizarResumoEstoque(produtosCache);

  if (produtos.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          Nenhum produto encontrado
        </td>
      </tr>
    `;
    return;
  }

  const podeEditar = currentUser?.role === 'admin';

  produtos.forEach(produto => {
    const tr = document.createElement('tr');
    const estoqueValue = Number(produto.estoque) || 0;
    const minimoValue = Number(produto.estoqueMinimo ?? 3);

    const isZerado = estoqueValue === 0;
    const isBaixo = !isZerado && estoqueValue <= minimoValue;

    const nomeEscapado = escapeHtml(produto.nome);
    const nomeJsSeguro = String(produto.nome)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");

    let statusBadge = '<span class="status-pill ok">Normal</span>';
    if (isZerado) {
      statusBadge = '<span class="status-pill critico">Zerado ⚠️</span>';
    } else if (isBaixo) {
      statusBadge = '<span class="status-pill alerta">Baixo 🟠</span>';
    }

    tr.innerHTML = `
      <td>
        <div class="produto-celula">
          <strong>${nomeEscapado}</strong>
          ${podeEditar ? `
            <div class="acoes-produto no-print">
              <button
                type="button"
                onclick="atualizarEstoqueDireto('${produto.id}', '${nomeJsSeguro}', ${estoqueValue})"
                class="btn-mini btn-mini-edit"
                title="Atualizar saldo diretamente com registo na auditoria"
              >
                ✏️ Atualizar Estoque
              </button>
              <button
                type="button"
                onclick="excluirProduto('${produto.id}', '${nomeJsSeguro}')"
                class="btn-mini btn-mini-delete"
                title="Excluir produto"
              >
                🗑️ Excluir
              </button>
            </div>
          ` : ''}
        </div>
      </td>
      <td class="${isZerado ? 'baixo' : (isBaixo ? 'alerta-texto' : '')}" style="text-align:center; font-weight:bold; font-size:16px;">
        ${estoqueValue}
      </td>
      <td style="text-align:center;">
        ${statusBadge}
      </td>
      <td class="no-print" style="font-size:12px; color:#636e72;">
        ${escapeHtml(produto.ultimaAtualizacao || '-')}
      </td>
    `;

    tabela.appendChild(tr);
  });
}

function atualizarResumoEstoque(todosProdutos) {
  const elTotal = document.getElementById('resumoTotalProdutos');
  const elBaixo = document.getElementById('resumoEstoqueBaixo');
  const elZerado = document.getElementById('resumoEstoqueZerado');

  if (!elTotal || !elBaixo || !elZerado) return;

  const total = todosProdutos.length;
  const zerados = todosProdutos.filter(p => (Number(p.estoque) || 0) === 0).length;
  const baixos = todosProdutos.filter(p => {
    const est = Number(p.estoque) || 0;
    const min = Number(p.estoqueMinimo ?? 3);
    return est > 0 && est <= min;
  }).length;

  elTotal.textContent = total;
  elBaixo.textContent = baixos;
  elZerado.textContent = zerados;
}

// =========================================
// ATUALIZAR TABELA DE ESTOQUE
// =========================================
async function atualizarTabelaEstoque() {
  await carregarProdutos();
}

// =========================================
// FILTRAR ESTOQUE
// =========================================
window.filtrarEstoque = function () {
  const campo = document.getElementById('filtroProduto');
  const filtroStatus = document.getElementById('filtroStatusEstoque');

  const termo = campo ? campo.value.trim().toLowerCase() : '';
  const status = filtroStatus ? filtroStatus.value : 'todos';

  const filtrados = produtosCache
    .filter(produto => {
      const nomeMatch = produto.nome.toLowerCase().includes(termo);
      if (!nomeMatch) return false;

      const est = Number(produto.estoque) || 0;
      const min = Number(produto.estoqueMinimo ?? 3);

      if (status === 'zerado') return est === 0;
      if (status === 'baixo') return est > 0 && est <= min;
      if (status === 'critico') return est <= min;
      return true;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  renderizarTabelaEstoque(filtrados);
};

// =========================================
// EXPORTAR FUNÇÕES E GETTER DO CACHE
// =========================================
window.getProdutosCache = () => produtosCache;
window.criarProdutosIniciais = criarProdutosIniciais;
window.carregarProdutos = carregarProdutos;
window.atualizarTabelaEstoque = atualizarTabelaEstoque;
