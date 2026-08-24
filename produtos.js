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


// =========================================
// CRIAR PRODUTOS INICIAIS
// =========================================

async function criarProdutosIniciais() {
  try {
    const snapshot = await db.collection("produtos").get();

    if (snapshot.empty) {
      for (const produto of produtosIniciais) {

        const id = produto.nome
          .replace(/\s+/g, '_')
          .toLowerCase();

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


// =========================================
// CARREGAR PRODUTOS
// =========================================

async function carregarProdutos() {
  try {

    const snapshot = await db.collection("produtos").get();

    const produtos = [];

    snapshot.forEach(doc => {

      const produto = doc.data();

      produtos.push({
        ...produto,
        id: doc.id
      });

    });

    produtosCache = produtos;

    produtos.sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );


    // Atualiza select de produtos

    const select = document.getElementById('produto');

    if (select) {

      select.innerHTML =
        '<option value="">Selecione um produto</option>';

      produtos.forEach(produto => {

        const option = document.createElement('option');

        // ID REAL do documento Firestore
        option.value = produto.id;

        option.textContent =
          `${produto.nome} (${produto.estoque || 0})`;

        select.appendChild(option);

      });

    }

    return produtos;

  } catch (error) {

    console.error(
      'Erro ao carregar produtos:',
      error
    );

    return [];
  }
}


// =========================================
// CADASTRAR NOVO PRODUTO
// =========================================

window.cadastrarNovoProduto = async function() {

  if (currentUser?.role !== 'admin') {

    mostrarToast(
      'Apenas administradores podem cadastrar produtos!',
      'error'
    );

    return;
  }


  const campoNome =
    document.getElementById('novoProdutoNome');

  if (!campoNome) {

    mostrarToast(
      'Campo de nome do produto não encontrado.',
      'error'
    );

    return;
  }


  const nomeProduto =
    campoNome.value.trim();


  if (!nomeProduto) {

    mostrarToast(
      'Digite o nome do produto',
      'error'
    );

    return;
  }


  try {

    // Verifica se já existe

    const snapshot =
      await db.collection("produtos").get();

    let existe = false;

    snapshot.forEach(doc => {

      const produto = doc.data();

      if (
        produto.nome &&
        produto.nome.toLowerCase() ===
        nomeProduto.toLowerCase()
      ) {

        existe = true;

      }

    });


    if (existe) {

      mostrarToast(
        'Este produto já existe!',
        'error'
      );

      return;
    }


    // Cria ID único

    const id =
      nomeProduto
        .replace(/\s+/g, '_')
        .toLowerCase()
      + '_'
      + Date.now();


    // Salva no Firestore

    await db
      .collection("produtos")
      .doc(id)
      .set({

        id: id,

        nome: nomeProduto,

        estoque: 0,

        ultimaAtualizacao:
          new Date().toLocaleString('pt-BR'),

        dataCadastro:
          new Date().toISOString()

      });


    mostrarToast(
      `✅ Produto "${nomeProduto}" cadastrado com sucesso!`,
      'success'
    );


    campoNome.value = '';


    // Atualiza o sistema

    await carregarProdutos();

    await atualizarTabelaEstoque();


  } catch (error) {

    console.error(
      'Erro ao cadastrar produto:',
      error
    );

    mostrarToast(
      'Erro ao cadastrar produto',
      'error'
    );

  }

};


// =========================================
// EXCLUIR PRODUTO
// =========================================

window.excluirProduto = async function(id, nome) {

  // Somente administrador

  if (currentUser?.role !== 'admin') {

    mostrarToast(
      'Apenas administradores podem excluir produtos!',
      'error'
    );

    return;
  }


  // Verifica ID

  if (!id) {

    mostrarToast(
      'Não foi possível identificar o produto.',
      'error'
    );

    return;
  }


  // Confirmação

  const confirmar = confirm(

    `Tem certeza que deseja excluir o produto "${nome}"?\n\n` +

    'O produto será removido da lista de produtos. ' +

    'O histórico de movimentações não será apagado.'

  );


  if (!confirmar) {
    return;
  }


  try {

    // Exclui do Firestore

    await db
      .collection('produtos')
      .doc(id)
      .delete();


    mostrarToast(
      `🗑️ Produto "${nome}" excluído com sucesso!`,
      'success'
    );


    // Atualiza a lista de produtos

    await carregarProdutos();


    // Atualiza tabela

    await atualizarTabelaEstoque();


  } catch (error) {

    console.error(
      'Erro ao excluir produto:',
      error
    );

    mostrarToast(
      'Erro ao excluir produto. Tente novamente.',
      'error'
    );

  }

};


// =========================================
// RENDERIZAR TABELA DE ESTOQUE
// =========================================

function renderizarTabelaEstoque(produtos) {

  const tabela =
    document.getElementById('estoqueTabela');


  if (!tabela) {
    return;
  }


  tabela.innerHTML = '';


  // Nenhum produto

  if (produtos.length === 0) {

    tabela.innerHTML = `
      <tr>
        <td
          colspan="3"
          class="empty-state"
        >
          Nenhum produto cadastrado
        </td>
      </tr>
    `;

    return;
  }


  // Produtos

  produtos.forEach(produto => {

    const tr =
      document.createElement('tr');


    const estoqueValue =
      produto.estoque || 0;


    const isEstoqueBaixo =
      estoqueValue === 0;


    const podeExcluir =
      currentUser?.role === 'admin';


    // Escapa caracteres para evitar problemas no onclick

    const nomeSeguro =
      String(produto.nome)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");


    tr.innerHTML = `

      <td>

        <strong>
          ${produto.nome}
        </strong>


        ${
          podeExcluir
            ? `

              <button

                type="button"

                onclick="excluirProduto(
                  '${produto.id}',
                  '${nomeSeguro}'
                )"

                class="no-print"

                style="
                  margin-left:10px;
                  padding:4px 8px;
                  border:0;
                  border-radius:5px;
                  background:#d63031;
                  color:white;
                  cursor:pointer;
                  font-size:11px;
                "

                title="Excluir produto"

              >
                🗑️ Excluir
              </button>

            `
            : ''
        }

      </td>


      <td

        class="${isEstoqueBaixo ? 'baixo' : ''}"

        style="
          text-align:center;
          font-weight:bold;
          font-size:16px;
        "

      >

        ${estoqueValue}

        ${
          isEstoqueBaixo
            ? ' ⚠️'
            : ''
        }

      </td>


      <td

        class="no-print"

        style="
          font-size:12px;
          color:#636e72;
        "

      >

        ${produto.ultimaAtualizacao || '-'}

      </td>

    `;


    tabela.appendChild(tr);

  });

}


// =========================================
// ATUALIZAR TABELA DE ESTOQUE
// =========================================

async function atualizarTabelaEstoque() {

  try {

    const snapshot =
      await db.collection("produtos").get();


    const produtos = [];


    snapshot.forEach(doc => {

      produtos.push({

        ...doc.data(),

        id: doc.id

      });

    });


    produtosCache = produtos;


    produtos.sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );


    renderizarTabelaEstoque(
      produtos
    );


    console.log(
      '📊 Tabela atualizada com',
      produtos.length,
      'produtos'
    );


  } catch (error) {

    console.error(
      'Erro ao atualizar tabela:',
      error
    );

  }

}


// =========================================
// FILTRAR ESTOQUE
// =========================================

window.filtrarEstoque = function() {

  const campo =
    document.getElementById(
      'filtroProduto'
    );


  if (!campo) {
    return;
  }


  const filtro =
    campo.value.toLowerCase();


  const filtrados =
    produtosCache

      .filter(produto =>
        produto.nome
          .toLowerCase()
          .includes(filtro)
      )

      .sort((a, b) =>
        a.nome.localeCompare(b.nome)
      );


  renderizarTabelaEstoque(
    filtrados
  );

};


// =========================================
// EXPORTAR FUNÇÕES
// =========================================

window.produtosCache =
  produtosCache;

window.criarProdutosIniciais =
  criarProdutosIniciais;

window.carregarProdutos =
  carregarProdutos;

window.atualizarTabelaEstoque =
  atualizarTabelaEstoque;