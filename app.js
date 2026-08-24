// =========================================
// APP
// =========================================
let iniciando=false;
async function iniciar(){
  if(iniciando) return;
  iniciando=true;
  try{
    await criarProdutosIniciais();
    await Promise.all([carregarProdutos(),carregarHistorico()]);
    atualizarTabelaEstoque();
  }catch(e){console.error(e); mostrarToast('Erro ao carregar o sistema.','error');}
  finally{iniciando=false;}
}
document.addEventListener('DOMContentLoaded',()=>verificarSessao());
