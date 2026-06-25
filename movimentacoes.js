// =========================================
// MOVIMENTAÇÕES
// =========================================

// Registrar entrada
window.registrarEntrada = async function() {
  await movimentar('Entrada');
};

// Registrar saída
window.registrarSaida = async function() {
  await movimentar('Saída');
};

// Movimentar
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
  const entrega = document.getElementById('entrega').value;
  const assinatura = document.getElementById('assinatura').value.trim();
  const observacoes = document.getElementById('observacoes').value.trim();

  if (!produtoId) { mostrarToast('Selecione um produto', 'error'); return; }
  if (!quantidade || quantidade <= 0) { mostrarToast('Quantidade inválida', 'error'); return; }
  if (!responsavel) { mostrarToast('Preencha o responsável', 'error'); return; }

  try {
    const produtoRef = db.collection("produtos").doc(produtoId);
    const doc = await produtoRef.get();
    
    if (!doc.exists) {
      throw new Error('Produto não encontrado');
    }
    
    const produto = doc.data();
    let novoSaldo = produto.estoque || 0;
    
    if (tipo === 'Entrada') {
      novoSaldo += quantidade;
    } else {
      if (quantidade > novoSaldo) {
        throw new Error(`Estoque insuficiente. Disponível: ${novoSaldo}`);
      }
      novoSaldo -= quantidade;
    }
    
    await produtoRef.update({
      estoque: novoSaldo,
      ultimaAtualizacao: new Date().toLocaleString('pt-BR')
    });
    
    await db.collection("movimentacoes").add({
      tipo,
      produto: produto.nome,
      quantidade,
      responsavel,
      validade: validade || null,
      recebimento: recebimento || null,
      entrega: entrega || null,
      assinatura: assinatura || null,
      observacoes: observacoes || null,
      data: new Date().toLocaleString('pt-BR'),
      dataCriacao: new Date().toISOString(),
      usuario: currentUser.name
    });
    
    mostrarToast(`✅ ${tipo} registrada! Novo saldo: ${novoSaldo}`, 'success');
    
    document.getElementById('quantidade').value = '';
    document.getElementById('responsavel').value = '';
    document.getElementById('validade').value = '';
    document.getElementById('recebimento').value = '';
    document.getElementById('entrega').value = '';
    document.getElementById('assinatura').value = '';
    document.getElementById('observacoes').value = '';
    
    await Promise.all([
      atualizarTabelaEstoque(),
      carregarHistorico(),
      carregarProdutos()
    ]);
    
  } catch (error) {
    mostrarToast(error.message || 'Erro ao registrar movimentação', 'error');
    console.error(error);
  }
}

// Carregar histórico
async function carregarHistorico() {
  try {
    const snapshot = await db.collection("movimentacoes")
      .orderBy("dataCriacao", "desc")
      .limit(100)
      .get();
    
    const movimentacoes = [];
    snapshot.forEach(doc => {
      movimentacoes.push(doc.data());
    });
    
    const tabela = document.getElementById('historicoTabela');
    tabela.innerHTML = '';
    
    if (movimentacoes.length === 0) {
      tabela.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhuma movimentação registrada</td></tr>';
      return;
    }
    
    movimentacoes.forEach(mov => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="badge ${mov.tipo === 'Entrada' ? 'entrada' : 'saida'}">${mov.tipo}</span></td>
        <td><strong>${mov.produto || '-'}</strong></td>
        <td style="text-align:center;">${mov.quantidade || '-'}</td>
        <td>${mov.responsavel || '-'}</td>
        <td style="font-size:12px;">${mov.data || '-'}</td>
        <td style="font-size:12px; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${mov.observacoes || '-'}
        </td>
      `;
      tabela.appendChild(tr);
    });
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
  }
}

// Exportar
window.carregarHistorico = carregarHistorico;
