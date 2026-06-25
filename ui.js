// =========================================
// UI - TOAST e IMPRESSÃO
// =========================================

// Toast
function mostrarToast(mensagem, tipo = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensagem;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Imprimir estoque
window.imprimirEstoque = function() {
  const produtos = produtosCache.sort((a, b) => a.nome.localeCompare(b.nome));
  
  if (produtos.length === 0) {
    mostrarToast('Nenhum produto para imprimir', 'error');
    return;
  }

  const conteudoImpressao = `
    <div class="print-header">
      <h1>📦 Relatório de Estoque</h1>
      <p>Produtos de Limpeza - ${new Date().toLocaleDateString('pt-BR')}</p>
      <p style="font-size: 12px; color: #636e72;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      <hr style="margin: 15px 0;">
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 10px; background: #1a5276; color: white;">Produto</th>
          <th style="text-align: center; padding: 10px; background: #1a5276; color: white;">Quantidade</th>
        </tr>
      </thead>
      <tbody>
        ${produtos.map(p => `
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #ddd;">${p.nome}</td>
            <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #ddd; font-weight: ${p.estoque === 0 ? 'bold' : 'normal'}; color: ${p.estoque === 0 ? '#e17055' : '#2d3436'};">
              ${p.estoque || 0} ${p.estoque === 0 ? '⚠️' : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #b2bec3;">
      Total de produtos: ${produtos.length}
    </div>
  `;

  const janela = window.open('', '_blank', 'width=800,height=600');
  if (!janela) {
    mostrarToast('Permita pop-ups para imprimir', 'error');
    return;
  }

  janela.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relatório de Estoque</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
          body { padding: 40px; background: white; }
          .print-header { text-align: center; margin-bottom: 30px; }
          .print-header h1 { color: #1a5276; font-size: 28px; margin-bottom: 5px; }
          .print-header p { color: #636e72; font-size: 14px; margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th { background: #1a5276; color: white; padding: 10px; text-align: left; font-weight: 600; }
          td { padding: 8px 10px; border-bottom: 1px solid #ecf0f1; }
          hr { border: 0; border-top: 2px solid #ecf0f1; margin: 15px 0; }
          @media print {
            body { padding: 20px; }
            th { background: #1a5276 !important; color: white !important; }
          }
        </style>
      </head>
      <body>
        ${conteudoImpressao}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        <\/script>
      </body>
    </html>
  `);
  janela.document.close();
};

// Exportar
window.mostrarToast = mostrarToast;
