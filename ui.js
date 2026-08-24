// =========================================
// UI
// =========================================
function mostrarToast(mensagem,tipo='info'){
  const antigo=document.querySelector('.toast'); if(antigo) antigo.remove();
  const toast=document.createElement('div'); toast.className=`toast ${tipo}`; toast.textContent=mensagem; document.body.appendChild(toast);
  setTimeout(()=>toast.remove(),3500);
}

window.imprimirEstoque=function(){
  const produtos=getProdutosCache().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  if(!produtos.length) return mostrarToast('Nenhum produto para imprimir.','error');
  const linhas=produtos.map(p=>`<tr><td>${escapeHtml(p.nome)}</td><td style="text-align:center">${Number(p.estoque)||0}</td></tr>`).join('');
  const w=window.open('','_blank','width=800,height=600');
  if(!w) return mostrarToast('Permita pop-ups para imprimir.','error');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório de Estoque</title><style>body{font-family:Arial;padding:32px;color:#222}h1{text-align:center;color:#1a5276}p{text-align:center;color:#666}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:10px}th{background:#1a5276;color:#fff}@media print{body{padding:15px}}</style></head><body><h1>Controle de Estoque</h1><p>Produtos de Limpeza</p><p>Gerado em ${new Date().toLocaleString('pt-BR')}</p><table><thead><tr><th>Produto</th><th>Saldo</th></tr></thead><tbody>${linhas}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
};
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
window.mostrarToast=mostrarToast;
