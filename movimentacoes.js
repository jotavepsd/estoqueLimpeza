// =========================================
// MOVIMENTAÇÕES
// =========================================

// Registrar entrada
window.registrarEntrada = async function () {
  await movimentar('Entrada');
};

// Registrar saída
window.registrarSaida = async function () {
  await movimentar('Saída');
};


// =========================================
// REGISTRAR MOVIMENTAÇÃO
// =========================================

async function movimentar(tipo) {

  if (currentUser?.role !== 'admin') {
    mostrarToast(
      'Apenas administradores podem registrar movimentações!',
      'error'
    );
    return;
  }

  const produtoId = document.getElementById('produto').value;
  const quantidade = Number(
    document.getElementById('quantidade').value
  );
  const responsavel =
    document.getElementById('responsavel').value.trim();

  const validade =
    document.getElementById('validade').value;

  const recebimento =
    document.getElementById('recebimento').value;

  const assinatura =
    document.getElementById('assinatura').value.trim();

  const observacoes =
    document.getElementById('observacoes').value.trim();


  if (!produtoId) {
    mostrarToast('Selecione um produto', 'error');
    return;
  }

  if (!quantidade || quantidade <= 0) {
    mostrarToast('Quantidade inválida', 'error');
    return;
  }

  if (!responsavel) {
    mostrarToast('Preencha o responsável', 'error');
    return;
  }


  try {

    let produtoRef =
      db.collection('produtos').doc(produtoId);

    let doc =
      await produtoRef.get();


    // Caso o ID selecionado seja o campo "id"
    // e não o ID do documento

    if (!doc.exists) {

      const snapshot =
        await db
          .collection('produtos')
          .where('id', '==', produtoId)
          .limit(1)
          .get();


      if (snapshot.empty) {
        throw new Error(
          `Produto não encontrado. ID selecionado: ${produtoId}`
        );
      }


      doc = snapshot.docs[0];
      produtoRef = doc.ref;
    }


    const produto = doc.data();

    let novoSaldo =
      Number(produto.estoque) || 0;


    // =========================================
    // ENTRADA
    // =========================================

    if (tipo === 'Entrada') {

      novoSaldo += quantidade;

    }


    // =========================================
    // SAÍDA
    // =========================================

    else {

      if (quantidade > novoSaldo) {

        throw new Error(
          `Estoque insuficiente. Disponível: ${novoSaldo}`
        );

      }

      novoSaldo -= quantidade;
    }


    // =========================================
    // ATUALIZA ESTOQUE
    // =========================================

    await produtoRef.update({

      estoque: novoSaldo,

      ultimaAtualizacao:
        new Date().toLocaleString('pt-BR')

    });


    // =========================================
    // SALVA MOVIMENTAÇÃO
    // =========================================

    await db.collection('movimentacoes').add({

      tipo: tipo,

      produto: produto.nome,

      produtoId: doc.id,

      quantidade: quantidade,

      responsavel: responsavel,

      validade: validade || null,

      recebimento: recebimento || null,

      assinatura: assinatura || null,

      observacoes: observacoes || null,

      data:
        new Date().toLocaleString('pt-BR'),

      dataCriacao:
        new Date().toISOString(),

      usuario:
        currentUser.name

    });


    mostrarToast(
      `✅ ${tipo} registrada! Novo saldo: ${novoSaldo}`,
      'success'
    );


    // =========================================
    // LIMPAR FORMULÁRIO
    // =========================================

    document.getElementById('quantidade').value = '';

    document.getElementById('responsavel').value = '';

    document.getElementById('validade').value = '';

    document.getElementById('recebimento').value = '';

    document.getElementById('assinatura').value = '';

    document.getElementById('observacoes').value = '';


    // =========================================
    // ATUALIZAR SISTEMA
    // =========================================

    await Promise.all([

      atualizarTabelaEstoque(),

      carregarHistorico(),

      carregarProdutos()

    ]);


  } catch (error) {

    console.error(
      'Erro ao registrar movimentação:',
      error
    );

    mostrarToast(
      error.message ||
      'Erro ao registrar movimentação',
      'error'
    );
  }
}


// =========================================
// CARREGAR HISTÓRICO
// =========================================

async function carregarHistorico() {

  try {

    const snapshot =
      await db
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


    // Guarda o histórico para os filtros

    window.historicoMovimentacoes =
      movimentacoes;


    renderizarHistorico(
      movimentacoes
    );


  } catch (error) {

    console.error(
      'Erro ao carregar histórico:',
      error
    );

  }
}


// =========================================
// RENDERIZAR HISTÓRICO
// =========================================

function renderizarHistorico(movimentacoes) {

  const tabela =
    document.getElementById(
      'historicoTabela'
    );


  if (!tabela) {
    return;
  }


  tabela.innerHTML = '';


  if (!movimentacoes.length) {

    tabela.innerHTML = `

      <tr>

        <td
          colspan="7"
          class="empty-state"
        >
          Nenhuma movimentação encontrada
        </td>

      </tr>

    `;

    return;
  }


  movimentacoes.forEach(mov => {

    const tr =
      document.createElement('tr');


    tr.innerHTML = `

      <td>

        <span
          class="badge ${
            mov.tipo === 'Entrada'
              ? 'entrada'
              : 'saida'
          }"
        >
          ${escaparHTML(mov.tipo || '-')}
        </span>

      </td>


      <td>

        <strong>
          ${escaparHTML(mov.produto || '-')}
        </strong>

      </td>


      <td
        style="text-align:center;"
      >

        ${mov.quantidade || '-'}

      </td>


      <td>

        ${escaparHTML(
          mov.responsavel || '-'
        )}

      </td>


      <td
        style="font-size:12px;"
      >

        ${formatarDataHora(
          mov.dataCriacao,
          mov.data
        )}

      </td>


      <td
        style="font-size:12px;"
      >

        ${
          mov.recebimento
            ? formatarData(
                mov.recebimento
              )
            : '-'
        }

      </td>


      <td
        style="
          font-size:12px;
          max-width:150px;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        "
        title="${
          mov.observacoes || ''
        }"
      >

        ${escaparHTML(
          mov.observacoes || '-'
        )}

      </td>

    `;


    tabela.appendChild(tr);

  });

}


// =========================================
// FILTRAR HISTÓRICO
// =========================================

window.filtrarHistorico = function () {

  const produtoInput =
    document.getElementById(
      'filtroHistoricoProduto'
    );

  const dataInicialInput =
    document.getElementById(
      'filtroHistoricoDataInicial'
    );

  const dataFinalInput =
    document.getElementById(
      'filtroHistoricoDataFinal'
    );


  const produtoFiltro =
    produtoInput
      ? produtoInput.value
          .trim()
          .toLowerCase()
      : '';


  const dataInicial =
    dataInicialInput
      ? dataInicialInput.value
      : '';


  const dataFinal =
    dataFinalInput
      ? dataFinalInput.value
      : '';


  const historico =
    window.historicoMovimentacoes || [];


  const filtrados =
    historico.filter(mov => {

      // =====================================
      // FILTRO POR PRODUTO
      // =====================================

      if (produtoFiltro) {

        const nomeProduto =
          String(
            mov.produto || ''
          ).toLowerCase();


        if (
          !nomeProduto.includes(
            produtoFiltro
          )
        ) {

          return false;

        }

      }


      // =====================================
      // DATA DA MOVIMENTAÇÃO
      // =====================================

      const dataMovimentacao =
        obterDataMovimentacao(mov);


      if (dataInicial) {

        if (
          !dataMovimentacao ||
          dataMovimentacao < dataInicial
        ) {

          return false;

        }

      }


      if (dataFinal) {

        if (
          !dataMovimentacao ||
          dataMovimentacao > dataFinal
        ) {

          return false;

        }

      }


      return true;

    });


  renderizarHistorico(
    filtrados
  );

};


// =========================================
// LIMPAR FILTROS DO HISTÓRICO
// =========================================

window.limparFiltrosHistorico = function () {

  const produto =
    document.getElementById(
      'filtroHistoricoProduto'
    );

  const dataInicial =
    document.getElementById(
      'filtroHistoricoDataInicial'
    );

  const dataFinal =
    document.getElementById(
      'filtroHistoricoDataFinal'
    );


  if (produto) {
    produto.value = '';
  }

  if (dataInicial) {
    dataInicial.value = '';
  }

  if (dataFinal) {
    dataFinal.value = '';
  }


  renderizarHistorico(
    window.historicoMovimentacoes || []
  );

};


// =========================================
// LIMPAR TODO O HISTÓRICO
// =========================================

window.limparHistorico = async function () {

  if (currentUser?.role !== 'admin') {

    mostrarToast(
      'Apenas administradores podem limpar o histórico!',
      'error'
    );

    return;
  }


  const confirmar =
    confirm(

      '⚠️ ATENÇÃO!\n\n' +

      'Você está prestes a apagar TODO o histórico de movimentações.\n\n' +

      'Essa ação NÃO altera o estoque dos produtos, mas as movimentações apagadas não poderão ser recuperadas.\n\n' +

      'Deseja realmente continuar?'

    );


  if (!confirmar) {
    return;
  }


  try {

    const snapshot =
      await db
        .collection('movimentacoes')
        .get();


    if (snapshot.empty) {

      mostrarToast(
        'O histórico já está vazio.',
        'info'
      );

      return;
    }


    // Firestore permite no máximo
    // 500 operações por batch.

    const documentos =
      snapshot.docs;


    for (
      let i = 0;
      i < documentos.length;
      i += 500
    ) {

      const batch =
        db.batch();


      const lote =
        documentos.slice(
          i,
          i + 500
        );


      lote.forEach(doc => {

        batch.delete(
          doc.ref
        );

      });


      await batch.commit();

    }


    window.historicoMovimentacoes =
      [];


    renderizarHistorico([]);


    mostrarToast(
      '🗑️ Histórico apagado com sucesso!',
      'success'
    );


  } catch (error) {

    console.error(
      'Erro ao limpar histórico:',
      error
    );


    mostrarToast(
      'Erro ao limpar histórico. Tente novamente.',
      'error'
    );

  }

};


// =========================================
// FUNÇÕES AUXILIARES
// =========================================

function obterDataMovimentacao(mov) {

  if (
    mov.dataCriacao
  ) {

    const data =
      new Date(
        mov.dataCriacao
      );


    if (
      !isNaN(
        data.getTime()
      )
    ) {

      return data
        .toISOString()
        .slice(0, 10);

    }

  }


  return '';

}


function formatarData(data) {

  if (!data) {
    return '-';
  }


  // Data no formato YYYY-MM-DD

  const partes =
    data.split('-');


  if (
    partes.length === 3
  ) {

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

  }


  return data;

}


function formatarDataHora(
  dataISO,
  dataAntiga
) {

  if (dataISO) {

    const data =
      new Date(dataISO);


    if (
      !isNaN(
        data.getTime()
      )
    ) {

      return data.toLocaleString(
        'pt-BR'
      );

    }

  }


  return dataAntiga || '-';

}


function escaparHTML(valor) {

  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}


// =========================================
// EXPORTAR
// =========================================

window.carregarHistorico =
  carregarHistorico;