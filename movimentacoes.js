// =========================================
// MOVIMENTAÇÕES & AUDITORIA
// =========================================

window.registrarEntrada = async function () {
  await movimentar('Entrada');
};

window.registrarSaida = async function () {
  await movimentar('Saída');
};

// =========================================
// REGISTRAR MOVIMENTAÇÃO COM TRANSAÇÃO ATÔMICA
// =========================================
async function movimentar(tipo) {
  if (currentUser?.role !== 'admin') {
    mostrarToast('Apenas administradores podem registrar movimentações!', 'error');
    return;
  }

  const produtoId = document.getElementById('produto').value;
  const quantidade = Number(document.getElementById('quantidade').value);
  const responsavel = document.getElementById('responsavel').value.trim();
  const validade = document.getElementById('validade').value;
  const recebimento = document.getElementById('recebimento').value;
  const assinatura = document.getElementById('assinatura').value.trim();
  const observacoes = document.getElementById('observacoes').value.trim();

  if (!produtoId) {
    mostrarToast('Selecione um produto', 'error');
    return;
  }

  if (!quantidade || quantidade <= 0 || !Number.isInteger(quantidade)) {
    mostrarToast('Informe uma quantidade inteira válida maior que zero', 'error');
    return;
  }

  if (!responsavel) {
    mostrarToast('Preencha o responsável', 'error');
    return;
  }

  if (validade) {
    const hojeISO = obterDataLocalISO();
    if (validade < hojeISO) {
      const prosseguirVencido = await abrirModalConfirmacao({
        titulo: '⚠️ Validade Vencida',
        mensagem: `A data de validade informada (${formatarData(validade)}) já está vencida.\n\nDeseja registrar a ${tipo.toLowerCase()} mesmo assim?`,
        textoConfirmar: 'Registrar Mesmo Assim',
        textoCancelar: 'Cancelar',
        variante: 'warning'
      });
      if (!prosseguirVencido) return;
    }
  }

  const btnAtivo = tipo === 'Entrada' ? 'btnEntrada' : 'btnSaida';
  const btnOutro = tipo === 'Entrada' ? 'btnSaida' : 'btnEntrada';
  setLoadingButton(btnAtivo, true, tipo === 'Entrada' ? 'Registrando entrada...' : 'Registrando saída...');
  const outroEl = document.getElementById(btnOutro);
  if (outroEl) outroEl.disabled = true;

  try {
    let produtoRef = db.collection('produtos').doc(produtoId);
    const checkDoc = await produtoRef.get();

    if (!checkDoc.exists) {
      const snapshot = await db
        .collection('produtos')
        .where('id', '==', produtoId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new Error(`Produto não encontrado. ID selecionado: ${produtoId}`);
      }
      produtoRef = snapshot.docs[0].ref;
    }

    const movRef = db.collection('movimentacoes').doc();
    const agora = new Date();
    const dataFormatadaBR = agora.toLocaleString('pt-BR');
    const dataISO = agora.toISOString();

    let resultadoTransacao = { novoSaldo: 0, nomeProduto: '' };

    await db.runTransaction(async (transaction) => {
      const docAtual = await transaction.get(produtoRef);
      if (!docAtual.exists) {
        throw new Error('O produto foi removido durante a operação.');
      }

      const dadosProduto = docAtual.data();
      const saldoAtual = Number(dadosProduto.estoque) || 0;
      let novoSaldo = saldoAtual;

      if (tipo === 'Entrada') {
        novoSaldo += quantidade;
      } else {
        if (quantidade > saldoAtual) {
          throw new Error(`Estoque insuficiente. Disponível: ${saldoAtual}`);
        }
        novoSaldo -= quantidade;
      }

      transaction.update(produtoRef, {
        estoque: novoSaldo,
        ultimaAtualizacao: dataFormatadaBR
      });

      transaction.set(movRef, {
        tipo,
        produto: dadosProduto.nome,
        produtoId: docAtual.id,
        quantidade,
        saldoAnterior: saldoAtual,
        saldoPosterior: novoSaldo,
        responsavel,
        validade: validade || null,
        recebimento: recebimento || null,
        assinatura: assinatura || null,
        observacoes: observacoes || null,
        data: dataFormatadaBR,
        dataCriacao: dataISO,
        usuario: currentUser.name
      });

      resultadoTransacao = {
        novoSaldo,
        nomeProduto: dadosProduto.nome
      };
    });

    mostrarToast(
      `✅ ${tipo} de ${resultadoTransacao.nomeProduto} registrada! Novo saldo: ${resultadoTransacao.novoSaldo}`,
      'success'
    );

    document.getElementById('quantidade').value = '';
    document.getElementById('validade').value = '';
    document.getElementById('recebimento').value = '';
    document.getElementById('assinatura').value = '';
    document.getElementById('observacoes').value = '';

    await Promise.all([
      carregarProdutos(),
      carregarHistorico()
    ]);

  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    mostrarToast(error.message || 'Erro ao registrar movimentação', 'error');
  } finally {
    setLoadingButton(btnAtivo, false);
    if (outroEl) outroEl.disabled = currentUser?.role !== 'admin';
  }
}

// =========================================
// CARREGAR HISTÓRICO
// =========================================
async function carregarHistorico() {
  try {
    const snapshot = await db
      .collection('movimentacoes')
      .orderBy('dataCriacao', 'desc')
      .limit(500)
      .get();

    const movimentacoes = [];
    snapshot.forEach(doc => {
      movimentacoes.push({
        id: doc.id,
        ...doc.data()
      });
    });

    window.historicoMovimentacoes = movimentacoes;
    filtrarHistorico();
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    mostrarToast('Erro ao carregar histórico de movimentações.', 'error');
  }
}

// =========================================
// RENDERIZAR HISTÓRICO
// =========================================
function renderizarHistorico(movimentacoes) {
  window.historicoFiltradoAtual = movimentacoes;

  const tabela = document.getElementById('historicoTabela');
  if (!tabela) return;

  tabela.innerHTML = '';

  if (!movimentacoes.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          Nenhuma movimentação encontrada
        </td>
      </tr>
    `;
    return;
  }

  const hojeISO = obterDataLocalISO();

  movimentacoes.forEach(mov => {
    const tr = document.createElement('tr');
    const vencido = mov.validade && mov.validade < hojeISO;

    const detalhesExtras = [];
    if (mov.validade) {
      detalhesExtras.push(`Val: ${formatarData(mov.validade)}${vencido ? ' (Vencida)' : ''}`);
    }
    if (mov.assinatura) {
      detalhesExtras.push(`Ass: ${mov.assinatura}`);
    }
    if (mov.observacoes) {
      detalhesExtras.push(mov.observacoes);
    }
    const obsTexto = detalhesExtras.join(' | ') || '-';

    let badgeClasse = 'saida';
    if (mov.tipo === 'Entrada') badgeClasse = 'entrada';
    else if (mov.tipo === 'Ajuste') badgeClasse = 'ajuste';

    let qtdTexto = `${Number(mov.quantidade) ?? '-'}`;
    if (mov.tipo === 'Ajuste' && mov.saldoAnterior !== undefined && mov.saldoPosterior !== undefined) {
      qtdTexto = `${mov.saldoAnterior} → ${mov.saldoPosterior}`;
    }

    tr.innerHTML = `
      <td>
        <span class="badge ${badgeClasse}">
          ${escapeHtml(mov.tipo || '-')}
        </span>
      </td>
      <td>
        <strong>${escapeHtml(mov.produto || '-')}</strong>
      </td>
      <td style="text-align:center; font-weight:700;">
        ${escapeHtml(qtdTexto)}
      </td>
      <td>
        ${escapeHtml(mov.responsavel || '-')}
      </td>
      <td style="font-size:12px;">
        ${escapeHtml(formatarDataHora(mov.dataCriacao, mov.data))}
      </td>
      <td style="font-size:12px;">
        ${mov.recebimento ? escapeHtml(formatarData(mov.recebimento)) : '-'}
      </td>
      <td class="obs-celula ${vencido ? 'baixo' : ''}" title="${escapeHtml(obsTexto)}">
        ${escapeHtml(obsTexto)}
      </td>
    `;

    tabela.appendChild(tr);
  });
}

// =========================================
// FILTRAR HISTÓRICO (PRODUTO, TIPO, RESPONSÁVEL, DATA LOCAL)
// =========================================
window.filtrarHistorico = function () {
  const produtoFiltro = (document.getElementById('filtroHistoricoProduto')?.value || '').trim().toLowerCase();
  const tipoFiltro = document.getElementById('filtroHistoricoTipo')?.value || '';
  const responsavelFiltro = (document.getElementById('filtroHistoricoResponsavel')?.value || '').trim().toLowerCase();
  const dataInicial = document.getElementById('filtroHistoricoDataInicial')?.value || '';
  const dataFinal = document.getElementById('filtroHistoricoDataFinal')?.value || '';

  const historico = window.historicoMovimentacoes || [];

  const filtrados = historico.filter(mov => {
    if (produtoFiltro) {
      const nomeProduto = String(mov.produto || '').toLowerCase();
      if (!nomeProduto.includes(produtoFiltro)) return false;
    }

    if (tipoFiltro && mov.tipo !== tipoFiltro) {
      return false;
    }

    if (responsavelFiltro) {
      const resp = String(mov.responsavel || '').toLowerCase();
      if (!resp.includes(responsavelFiltro)) return false;
    }

    const dataMovimentacao = obterDataMovimentacaoLocal(mov);

    if (dataInicial && (!dataMovimentacao || dataMovimentacao < dataInicial)) {
      return false;
    }

    if (dataFinal && (!dataMovimentacao || dataMovimentacao > dataFinal)) {
      return false;
    }

    return true;
  });

  renderizarHistorico(filtrados);
};

// =========================================
// LIMPAR FILTROS DO HISTÓRICO
// =========================================
window.limparFiltrosHistorico = function () {
  const ids = [
    'filtroHistoricoProduto',
    'filtroHistoricoTipo',
    'filtroHistoricoResponsavel',
    'filtroHistoricoDataInicial',
    'filtroHistoricoDataFinal'
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  renderizarHistorico(window.historicoMovimentacoes || []);
};

// =========================================
// LIMPAR TODO O HISTÓRICO (MODAL COM CONFIRMAÇÃO APAGAR)
// =========================================
window.limparHistorico = async function () {
  if (currentUser?.role !== 'admin') {
    mostrarToast('Apenas administradores podem limpar o histórico!', 'error');
    return;
  }

  const confirmar = await abrirModalConfirmacao({
    titulo: '⚠️ Limpar Histórico e Auditoria',
    mensagem: 'Você está prestes a apagar TODO o histórico de movimentações e auditoria.\n\nEssa ação NÃO altera o estoque dos produtos, mas os registros apagados não poderão ser recuperados.',
    textoConfirmar: 'Apagar Tudo',
    textoCancelar: 'Cancelar',
    variante: 'danger',
    palavraObrigatoria: 'APAGAR',
    placeholderPalavra: 'Digite APAGAR'
  });

  if (!confirmar) {
    mostrarToast('Operação cancelada.', 'info');
    return;
  }

  setLoadingButton('btnLimparHistorico', true, 'Limpando...');

  try {
    const snapshot = await db.collection('movimentacoes').get();

    if (snapshot.empty) {
      mostrarToast('O histórico já está vazio.', 'info');
      return;
    }

    const documentos = snapshot.docs;
    for (let i = 0; i < documentos.length; i += 500) {
      const batch = db.batch();
      const lote = documentos.slice(i, i + 500);
      lote.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    window.historicoMovimentacoes = [];
    renderizarHistorico([]);
    mostrarToast('🗑️ Histórico apagado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    mostrarToast('Erro ao limpar histórico. Tente novamente.', 'error');
  } finally {
    setLoadingButton('btnLimparHistorico', false);
  }
};

// =========================================
// DATA LOCAL DA MOVIMENTAÇÃO (CORRIGE BUG UTC)
// =========================================
function obterDataMovimentacaoLocal(mov) {
  if (mov.dataCriacao) {
    const dataLocal = obterDataLocalISO(mov.dataCriacao);
    if (dataLocal) return dataLocal;
  }

  if (mov.data) {
    const match = String(mov.data).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }

  return '';
}

window.carregarHistorico = carregarHistorico;
