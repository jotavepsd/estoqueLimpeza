// =========================================
// UI, MODAIS, TOASTS & UTILITÁRIOS
// =========================================
function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function mostrarToast(mensagem, tipo = 'info') {
  const antigo = document.querySelector('.toast');
  if (antigo) antigo.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensagem;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}

function setLoadingButton(btnId, loading, loadingText = 'Salvando...') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `⏳ ${loadingText}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
    }
  }
}

function formatarData(data) {
  if (!data) return '-';
  const partes = String(data).split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return data;
}

function formatarDataHora(dataISO, dataAntiga) {
  if (dataISO) {
    const data = new Date(dataISO);
    if (!isNaN(data.getTime())) {
      return data.toLocaleString('pt-BR');
    }
  }
  return dataAntiga || '-';
}

// Retorna YYYY-MM-DD no fuso local para evitar distorção UTC após 21h no Brasil
function obterDataLocalISO(dateObj = new Date()) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// =========================================
// SISTEMA DE MODAIS (CONFIRMAÇÃO & FORMULÁRIOS)
// =========================================
function garantirContainerModal() {
  let backdrop = document.getElementById('customModalBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'customModalBackdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.style.display = 'none';
    backdrop.innerHTML = `<div id="customModalBox" class="modal-box" role="dialog" aria-modal="true"></div>`;
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

function fecharModalCustomizado(backdrop) {
  if (!backdrop) return;
  backdrop.style.display = 'none';
  backdrop.innerHTML = `<div id="customModalBox" class="modal-box" role="dialog" aria-modal="true"></div>`;
  document.removeEventListener('keydown', backdrop._escHandler || (() => {}));
}

function abrirModalConfirmacao({
  titulo = 'Confirmar ação',
  mensagem = '',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'danger',
  palavraObrigatoria = '',
  placeholderPalavra = ''
}) {
  return new Promise((resolve) => {
    const backdrop = garantirContainerModal();
    const box = backdrop.querySelector('.modal-box');

    const linhasMensagem = String(mensagem)
      .split('\n')
      .map(linha => linha.trim() ? `<p class="modal-texto">${escapeHtml(linha)}</p>` : '<div class="modal-espaco"></div>')
      .join('');

    const blocoPalavra = palavraObrigatoria ? `
      <div class="modal-campo">
        <label for="modalConfirmInput">Digite <strong>${escapeHtml(palavraObrigatoria)}</strong> para confirmar:</label>
        <input id="modalConfirmInput" type="text" placeholder="${escapeHtml(placeholderPalavra || palavraObrigatoria)}" autocomplete="off">
        <small id="modalConfirmErro" class="modal-erro"></small>
      </div>
    ` : '';

    box.innerHTML = `
      <div class="modal-header">
        <h3>${escapeHtml(titulo)}</h3>
        <button type="button" class="modal-close" id="modalBtnFechar" aria-label="Fechar">✕</button>
      </div>
      <div class="modal-body">
        ${linhasMensagem}
        ${blocoPalavra}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-modal-cancel" id="modalBtnCancelar">${escapeHtml(textoCancelar)}</button>
        <button type="button" class="btn-modal-${variante}" id="modalBtnConfirmar">${escapeHtml(textoConfirmar)}</button>
      </div>
    `;

    backdrop.style.display = 'flex';

    const finalizar = (valor) => {
      fecharModalCustomizado(backdrop);
      resolve(valor);
    };

    const confirmarAcao = () => {
      if (palavraObrigatoria) {
        const input = document.getElementById('modalConfirmInput');
        const erro = document.getElementById('modalConfirmErro');
        const digitado = (input?.value || '').trim();
        if (digitado !== palavraObrigatoria) {
          if (erro) erro.textContent = `Digite exatamente "${palavraObrigatoria}" para prosseguir.`;
          input?.focus();
          return;
        }
      }
      finalizar(true);
    };

    box.querySelector('#modalBtnFechar').onclick = () => finalizar(false);
    box.querySelector('#modalBtnCancelar').onclick = () => finalizar(false);
    box.querySelector('#modalBtnConfirmar').onclick = confirmarAcao;

    backdrop.onclick = (e) => {
      if (e.target === backdrop) finalizar(false);
    };

    backdrop._escHandler = (e) => {
      if (e.key === 'Escape') finalizar(false);
      if (e.key === 'Enter' && palavraObrigatoria && document.activeElement?.id === 'modalConfirmInput') {
        e.preventDefault();
        confirmarAcao();
      }
    };
    document.addEventListener('keydown', backdrop._escHandler);

    setTimeout(() => {
      const input = document.getElementById('modalConfirmInput');
      if (input) input.focus();
      else box.querySelector('#modalBtnConfirmar')?.focus();
    }, 10);
  });
}

function abrirModalAjusteEstoque({ nomeProduto, saldoAtual, usuarioAtual }) {
  return new Promise((resolve) => {
    const backdrop = garantirContainerModal();
    const box = backdrop.querySelector('.modal-box');

    box.innerHTML = `
      <div class="modal-header">
        <h3>✏️ Atualizar Estoque Direto</h3>
        <button type="button" class="modal-close" id="modalBtnFechar" aria-label="Fechar">✕</button>
      </div>
      <div class="modal-body">
        <p class="modal-texto">
          Produto: <strong>${escapeHtml(nomeProduto)}</strong> · Saldo atual: <strong>${Number(saldoAtual) || 0}</strong>
        </p>
        <div class="modal-campo">
          <label for="modalNovoSaldo">Novo saldo em estoque *</label>
          <input id="modalNovoSaldo" type="number" min="0" step="1" value="${Number(saldoAtual) || 0}">
        </div>
        <div class="modal-campo">
          <label for="modalMotivoAjuste">Motivo do ajuste (auditoria)</label>
          <input id="modalMotivoAjuste" type="text" value="Ajuste direto / Inventário" placeholder="Ex: Contagem física, avaria, inventário...">
        </div>
        <div class="modal-campo">
          <label for="modalResponsavelAjuste">Responsável</label>
          <input id="modalResponsavelAjuste" type="text" value="${escapeHtml(usuarioAtual || '')}" placeholder="Nome do responsável">
        </div>
        <small id="modalAjusteErro" class="modal-erro"></small>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-modal-cancel" id="modalBtnCancelar">Cancelar</button>
        <button type="button" class="btn-modal-primary" id="modalBtnSalvarAjuste">Salvar na Auditoria</button>
      </div>
    `;

    backdrop.style.display = 'flex';

    const finalizar = (resultado) => {
      fecharModalCustomizado(backdrop);
      resolve(resultado);
    };

    const salvar = () => {
      const saldoRaw = (document.getElementById('modalNovoSaldo')?.value ?? '').trim();
      const motivoRaw = (document.getElementById('modalMotivoAjuste')?.value ?? '').trim();
      const respRaw = (document.getElementById('modalResponsavelAjuste')?.value ?? '').trim();
      const erro = document.getElementById('modalAjusteErro');

      const novoSaldo = Number(saldoRaw);
      if (saldoRaw === '' || isNaN(novoSaldo) || novoSaldo < 0 || !Number.isInteger(novoSaldo)) {
        if (erro) erro.textContent = 'Informe um número inteiro válido (0 ou maior).';
        document.getElementById('modalNovoSaldo')?.focus();
        return;
      }

      if (novoSaldo === Number(saldoAtual)) {
        if (erro) erro.textContent = 'O novo saldo é igual ao saldo atual.';
        document.getElementById('modalNovoSaldo')?.focus();
        return;
      }

      finalizar({
        novoSaldo,
        motivo: motivoRaw || 'Ajuste direto / Inventário',
        responsavel: respRaw || usuarioAtual || 'Admin'
      });
    };

    box.querySelector('#modalBtnFechar').onclick = () => finalizar(null);
    box.querySelector('#modalBtnCancelar').onclick = () => finalizar(null);
    box.querySelector('#modalBtnSalvarAjuste').onclick = salvar;

    backdrop.onclick = (e) => {
      if (e.target === backdrop) finalizar(null);
    };

    backdrop._escHandler = (e) => {
      if (e.key === 'Escape') finalizar(null);
      if (e.key === 'Enter' && document.activeElement?.tagName === 'INPUT') {
        e.preventDefault();
        salvar();
      }
    };
    document.addEventListener('keydown', backdrop._escHandler);

    setTimeout(() => {
      const saldoInput = document.getElementById('modalNovoSaldo');
      saldoInput?.focus();
      saldoInput?.select();
    }, 10);
  });
}

window.imprimirEstoque = function () {
  const produtos = (window.getProdutosCache ? window.getProdutosCache() : [])
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  if (!produtos.length) {
    return mostrarToast('Nenhum produto para imprimir.', 'error');
  }

  const linhas = produtos.map(p => {
    const saldo = Number(p.estoque) || 0;
    const minimo = Number(p.estoqueMinimo) || 0;
    const status = saldo === 0 ? 'Zerado' : (minimo > 0 && saldo <= minimo ? 'Baixo' : 'OK');
    return `
      <tr>
        <td>${escapeHtml(p.nome)}</td>
        <td style="text-align:center; font-weight:bold;">${saldo}</td>
        <td style="text-align:center;">${status}</td>
      </tr>
    `;
  }).join('');

  const w = window.open('', '_blank', 'width=850,height=650');
  if (!w) return mostrarToast('Permita pop-ups para imprimir.', 'error');

  w.document.write(`<!doctype html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Relatório de Estoque</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
      h1 { text-align: center; color: #1a5276; margin-bottom: 4px; }
      p { text-align: center; color: #666; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 10px; font-size: 14px; }
      th { background: #1a5276; color: #fff; }
      @media print { body { padding: 15px; } }
    </style>
  </head>
  <body>
    <h1>Controle de Estoque - Produtos de Limpeza</h1>
    <p>Gerado em ${new Date().toLocaleString('pt-BR')} por ${escapeHtml(window.getCurrentUser()?.name || 'Sistema')}</p>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th>Saldo Atual</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <script>window.onload = () => window.print();<\/script>
  </body>
  </html>`);
  w.document.close();
};

window.exportarHistoricoCSV = function () {
  const lista = window.historicoFiltradoAtual || window.historicoMovimentacoes || [];
  if (!lista.length) {
    return mostrarToast('Não há movimentações para exportar.', 'error');
  }

  const cabecalho = [
    'Tipo',
    'Produto',
    'Quantidade',
    'Saldo Anterior',
    'Saldo Posterior',
    'Responsável',
    'Data Movimentação',
    'Validade',
    'Recebimento',
    'Assinatura',
    'Observações',
    'Registrado Por'
  ];

  const linhas = lista.map(mov => [
    mov.tipo || '',
    mov.produto || '',
    mov.quantidade ?? 0,
    mov.saldoAnterior ?? '',
    mov.saldoPosterior ?? '',
    mov.responsavel || '',
    formatarDataHora(mov.dataCriacao, mov.data),
    mov.validade ? formatarData(mov.validade) : '',
    mov.recebimento ? formatarData(mov.recebimento) : '',
    mov.assinatura || '',
    (mov.observacoes || '').replace(/[\r\n]+/g, ' '),
    mov.usuario || ''
  ].map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(';'));

  const csv = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `historico-estoque-${obterDataLocalISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  mostrarToast('📥 Histórico exportado em CSV!', 'success');
};

window.escapeHtml = escapeHtml;
window.mostrarToast = mostrarToast;
window.setLoadingButton = setLoadingButton;
window.formatarData = formatarData;
window.formatarDataHora = formatarDataHora;
window.obterDataLocalISO = obterDataLocalISO;
window.abrirModalConfirmacao = abrirModalConfirmacao;
window.abrirModalAjusteEstoque = abrirModalAjusteEstoque;
