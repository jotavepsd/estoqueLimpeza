// =========================================
// AUTENTICAÇÃO LOCAL
// =========================================
let currentUser = null;

const USERS = {
  admin: {
    password: 'admin123',
    role: 'admin',
    name: 'Administrador'
  },
  cris: {
    password: '1',
    role: 'admin',
    name: 'Cris'
  },
  caren: {
    password: '2',
    role: 'admin',
    name: 'Caren'
  },
  cida: {
    password: '3',
    role: 'admin',
    name: 'Cida'
  },
  terrinha: {
    password: '4',
    role: 'admin',
    name: 'Terrinha'
  },
  adelson: {
    password: '5',
    role: 'admin',
    name: 'Adelson'
  },
  user: {
    password: 'user123',
    role: 'user',
    name: 'Usuário'
  }
};

function atualizarInterfaceUsuario() {
  const logado = !!currentUser;
  document.getElementById('loginContainer').style.display = logado ? 'none' : 'flex';
  document.getElementById('mainApp').style.display = logado ? 'block' : 'none';
  if (!logado) return;

  document.getElementById('userNameDisplay').textContent = currentUser.name;
  const role = document.getElementById('userRoleDisplay');
  role.textContent = currentUser.role === 'admin' ? '👑 ADMIN' : '👤 USUÁRIO';
  role.className = 'user-role' + (currentUser.role === 'admin' ? ' admin' : '');
  aplicarRestricoes();
}

function aplicarRestricoes() {
  const admin = currentUser?.role === 'admin';
  const btnEntrada = document.getElementById('btnEntrada');
  const btnSaida = document.getElementById('btnSaida');
  const novoProdutoGroup = document.getElementById('novoProdutoGroup');
  const btnLimparHistorico = document.getElementById('btnLimparHistorico');

  if (btnEntrada) btnEntrada.disabled = !admin;
  if (btnSaida) btnSaida.disabled = !admin;
  if (novoProdutoGroup) novoProdutoGroup.style.display = admin ? 'block' : 'none';
  if (btnLimparHistorico) btnLimparHistorico.style.display = admin ? 'inline-flex' : 'none';
}

window.fazerLogin = async function () {
  const username = document.getElementById('loginUser').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const user = USERS[username];

  if (!user || user.password !== password) {
    document.getElementById('loginError').textContent = '❌ Usuário ou senha inválidos!';
    return;
  }

  currentUser = { username, role: user.role, name: user.name };
  sessionStorage.setItem('estoqueUser', JSON.stringify(currentUser));
  document.getElementById('loginError').textContent = '';

  const respInput = document.getElementById('responsavel');
  if (respInput && !respInput.value) {
    respInput.value = currentUser.name;
  }

  atualizarInterfaceUsuario();
  await iniciar();
};

window.logout = function () {
  currentUser = null;
  sessionStorage.removeItem('estoqueUser');
  atualizarInterfaceUsuario();
};

window.verificarSessao = function () {
  const saved = sessionStorage.getItem('estoqueUser');
  if (!saved) return atualizarInterfaceUsuario();
  try {
    currentUser = JSON.parse(saved);
    atualizarInterfaceUsuario();
    iniciar();
  } catch {
    sessionStorage.removeItem('estoqueUser');
    currentUser = null;
    atualizarInterfaceUsuario();
  }
};

window.getCurrentUser = () => currentUser;
