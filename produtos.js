// =========================================
// PRODUTOS
// =========================================

const produtosIniciais = [
  { nome: 'Água Sanitária', estoque: 12 },
  { nome: 'Álcool 70', estoque: 22 },
  { nome: 'Balde', estoque: 12 },
  { nome: 'Bombril', estoque: 0 },
  { nome: 'Desinfetante', estoque: 8 },
  { nome: 'Multiuso', estoque: 5 },
  { nome: 'Papel Higiênico', estoque: 21 },
  { nome: 'Papel Toalha', estoque: 7 },
  { nome: 'Rodo Grande', estoque: 11 },
  { nome: 'Sabão em Barra', estoque: 0 },
  { nome: 'Sabão em Pó', estoque: 5 },
  { nome: 'Sabonete Líquido', estoque: 8 },
  { nome: 'Saco de Lixo 100L', estoque: 46 },
  { nome: 'Saco de Lixo 30L', estoque: 470 }
];

let produtosCache = [];

// Criar produtos iniciais
async function criarProdutosIniciais() {
  try {
    const snapshot = await db.collection("produtos").get();
    
    if (snapshot.empty) {
      for (const produto of produtosIniciais) {
        const id = produto.nome.replace(/\s+/g, '_').toLowerCase();
        
        await db.collection("produtos").doc(id).set({
          id: id,
          nome: produto.nome,
          estoque: produto.estoque,
          ultimaAtualizacao: new Date().toLocaleString('pt-BR')
        });
      }
      console.log('✅ Produtos iniciais criados');
    }
  } catch (error) {
    console.error('Erro ao criar produtos iniciais:', error);
  }
}

// Carregar produtos
async function carregarProdutos() {
  try {
    const snapshot = await db.collection("produtos").get();
    
    const produtos = [];
    snapshot.forEach(doc => {
      produtos.push(doc.data());
    });
    
    produtosCache = produtos;
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));
    
    const select = document.getElementById('produto');
    select.innerHTML = '';
    
    produtos.forEach(produto => {
      const option = document.createElement('option');
      option.value = produto.id;
      option.textContent = `${produto.nome} (${produto.estoque || 0})`;
      select.appendChild(option);
    });
    
    return produtos;
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    return [];
  }
}

// Cadastrar novo produto
window.cadastrarNovoProduto = async function() {
  if (currentUser?.role !== 'admin') {
    mostrarToast('Apenas administradores podem cadastrar produtos!', 'error');
    return;
  }
  
  const nomeProduto = document.getElementById('novoProdutoNome').value.trim();
  
  if (!nomeProduto) {
    mostrarToast('Digite o nome do produto', 'error');
    return;
  }
  
  try {
    const snapshot = await db.collection("produtos").get();
    let existe = false;
    snapshot.forEach(doc => {
      if (doc.data().nome.toLowerCase() === nomeProduto.toLowerCase()) {
        existe = true;
      }
    });
    
    if (existe) {
      mostrarToast('Este produto já existe!', 'error');
      return;
    }
    
    const id = nomeProduto.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
    
    await db.collection("produtos").doc(id).set({
      id: id,
      nome: nomeProduto,
      estoque: 0,
      ultimaAtualizacao: new Date().toLocaleString('pt-BR'),
      dataCadastro: new Date().toISOString()
    });
    
    mostrarToast(`✅ Produto "${nomeProduto}" cadastrado com sucesso!`, 'success');
    document.getElementById('novoProdutoNome').value = '';
    
    await carregarProdutos();
    await atualizarTabelaEstoque();
    
  } catch (error) {
    mostrarToast('Erro ao cadastrar produto', 'error');
    console.error(error);
  }
};

// Atualizar tabela de estoque
async function atualizarTabelaEstoque() {
  try {
    const snapshot = await db.collection("produtos").get();
    
    const produtos = [];
    snapshot.forEach(doc => {
      produtos.push(doc.data());
    });
    
    produtosCache = produtos;
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));
    
    const tabela = document.getElementById('estoqueTabela');
    tabela.innerHTML = '';
    
    if (produtos.length === 0) {
      tabela.innerHTML = '<tr><td colspan="3" class="empty-state">Nenhum produto cadastrado</td></tr>';
      return;
    }
    
    produtos.forEach(produto => {
      const tr = document.createElement('tr');
      const estoqueValue = produto.estoque || 0;
      const isEstoqueBaixo = estoqueValue === 0;
      
      tr.innerHTML = `
        <td><strong>${produto.nome}</strong></td>
        <td class="${isEstoqueBaixo ? 'baixo' : ''}" style="text-align:center; font-weight:bold; font-size:16px;">
          ${estoqueValue}
          ${isEstoqueBaixo ? ' ⚠️' : ''}
        </td>
        <td class="no-print" style="font-size:12px; color:#636e72;">${produto.ultimaAtualizacao || '-'}</td>
      `;
      tabela.appendChild(tr);
    });
    
    console.log('📊 Tabela atualizada com', produtos.length, 'produtos');
  } catch (error) {
    console.error('Erro ao atualizar tabela:', error);
  }
}

// Filtrar estoque
window.filtrarEstoque = function() {
  const filtro = document.getElementById('filtroProduto').value.toLowerCase();
  const filtrados = produtosCache.filter(p => p.nome.toLowerCase().includes(filtro));
  const tabela = document.getElementById('estoqueTabela');
  tabela.innerHTML = '';
  
  if (filtrados.length === 0) {
    tabela.innerHTML = '<tr><td colspan="3" class="empty-state">Nenhum produto encontrado</td></tr>';
    return;
  }
  
  filtrados.forEach(produto => {
    const tr = document.createElement('tr');
    const estoqueValue = produto.estoque || 0;
    const isEstoqueBaixo = estoqueValue === 0;
    
    tr.innerHTML = `
      <td><strong>${produto.nome}</strong></td>
      <td class="${isEstoqueBaixo ? 'baixo' : ''}" style="text-align:center; font-weight:bold; font-size:16px;">
        ${estoqueValue}
        ${isEstoqueBaixo ? ' ⚠️' : ''}
      </td>
      <td class="no-print" style="font-size:12px; color:#636e72;">${produto.ultimaAtualizacao || '-'}</td>
    `;
    tabela.appendChild(tr);
  });
};

// Exportar
window.produtosCache = produtosCache;
window.criarProdutosIniciais = criarProdutosIniciais;
window.carregarProdutos = carregarProdutos;
window.atualizarTabelaEstoque = atualizarTabelaEstoque;
