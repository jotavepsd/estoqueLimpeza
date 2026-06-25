// =========================================
// APP - INICIALIZAÇÃO
// =========================================

async function iniciar() {
  try {
    await criarProdutosIniciais();
    await Promise.all([
      carregarProdutos(),
      atualizarTabelaEstoque(),
      carregarHistorico()
    ]);
    console.log('✅ Sistema iniciado com sucesso');
  } catch (error) {
    console.error('Erro ao iniciar:', error);
    mostrarToast('Erro ao carregar dados', 'error');
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
  verificarSessao();
});
