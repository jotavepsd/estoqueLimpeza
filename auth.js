// =========================================
// AUTENTICAÇÃO
// =========================================

let currentUser = null;
const users = {
  'admin': { password: 'admin123', role: 'admin', name: 'Administrador' },
  'user': { password: 'user123', role: 'user', name: 'Usuário' }
};

// Login
window.fazerLogin = function() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPassword').value;
  const user = users[username];
  
  if (user && user.password === password) {
    currentUser = { username, role: user.role, name: user.name };
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    
    const roleSpan = document.getElementById('userRoleDisplay');
    roleSpan.textContent = currentUser.role === 'admin' ? '👑 ADMIN' : '👤 USUÁRIO';
    roleSpan.className = 'user-role' + (currentUser.role === 'admin' ? ' admin' : '');
    
    aplicarRestricoes();
    document.getElementById('loginError').textContent = '';
    
    iniciar();
  } else {
    document.getElementById('loginError').textContent = '❌ Usuário ou senha inválidos!';
  }
};

// Logout
window.logout = function() {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  document.getElementById('loginContainer').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
};

// Aplicar restrições por role
function aplicarRestricoes() {
  const isAdmin = currentUser?.role === 'admin';
  const btnEntrada = document.getElementById('btnEntrada');
  const btnSaida = document.getElementById('btnSaida');
  const novoProdutoGroup = document.getElementById('novoProdutoGroup');
  
  if (!isAdmin) {
    if (btnEntrada) btnEntrada.disabled = true;
    if (btnSaida) btnSaida.disabled = true;
    if (novoProdutoGroup) novoProdutoGroup.style.display = 'none';
  } else {
    if (btnEntrada) btnEntrada.disabled = false;
    if (btnSaida) btnSaida.disabled = false;
    if (novoProdutoGroup) novoProdutoGroup.style.display = 'block';
  }
}

// Verificar sessão
function verificarSessao() {
  const saved = sessionStorage.getItem('currentUser');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';
      document.getElementById('userNameDisplay').textContent = currentUser.name;
      const roleSpan = document.getElementById('userRoleDisplay');
      roleSpan.textContent = currentUser.role === 'admin' ? '👑 ADMIN' : '👤 USUÁRIO';
      roleSpan.className = 'user-role' + (currentUser.role === 'admin' ? ' admin' : '');
      aplicarRestricoes();
      iniciar();
    } catch (e) {
      console.error('Erro ao restaurar sessão:', e);
      sessionStorage.removeItem('currentUser');
    }
  }
}

// Exportar
window.currentUser = currentUser;
window.aplicarRestricoes = aplicarRestricoes;
window.verificarSessao = verificarSessao;
