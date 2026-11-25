// =========================================
// APP
// =========================================
let iniciando = false;

async function iniciar() {
  if (iniciando) return;
  iniciando = true;
  try {
    await criarProdutosIniciais();
    await Promise.all([carregarProdutos(), carregarHistorico()]);
  } catch (e) {
    console.error(e);
    mostrarToast('Erro ao carregar o sistema.', 'error');
  } finally {
    iniciando = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  verificarSessao();

  const loginPassword = document.getElementById('loginPassword');
  const loginUser = document.getElementById('loginUser');
  [loginUser, loginPassword].forEach(el => {
    if (el) {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') fazerLogin();
      });
    }
  });
});
