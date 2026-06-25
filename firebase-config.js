// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDyQmPBYiwC_MqlQWyGnU95Ld8Y-kgd8GA",
  authDomain: "estoquelimpeza-d22f2.firebaseapp.com",
  databaseURL: "https://estoquelimpeza-d22f2-default-rtdb.firebaseio.com",
  projectId: "estoquelimpeza-d22f2",
  storageBucket: "estoquelimpeza-d22f2.firebasestorage.app",
  messagingSenderId: "637980743711",
  appId: "1:637980743711:web:2773e86c1ca64cc9229d2a"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Exportar para uso global
window.db = db;
