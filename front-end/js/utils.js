// js/utils.js - Configurações e Funções Globais Regia & Tinas Care

// 1. CONFIGURAÇÃO DA URL CENTRALIZADA
window.API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; // <-- SEU LINK REAL DO RENDER

// 2. VERIFICAR ADMIN
window.verificarAdmin = async (userId) => {
    if (!userId) return false;
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        if (!response.ok) return false;
        
        const data = await response.json();
        return data.isAdmin === true; 
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
        return false;
    }
};

// 3. SISTEMA DE NOTIFICAÇÕES (TOAST DO BOOTSTRAP)
window.notificar = (mensagem, tipo = 'sucesso') => {
    const toastEl = document.getElementById('liveToast');
    const msgEl = document.getElementById('toast-mensagem');
    
    if (!toastEl || !msgEl) {
        alert(mensagem); // Fallback: se a página não tiver o HTML do Toast, usa o alert comum
        return;
    }

    // Limpa as cores antigas
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-dark', 'text-dark', 'text-white');
    
    // Aplica a cor certa baseada no tipo de aviso
    switch (tipo) {
        case 'sucesso': 
            toastEl.classList.add('bg-success', 'text-white'); 
            break;
        case 'erro': 
            toastEl.classList.add('bg-danger', 'text-white'); 
            break;
        case 'aviso': 
            toastEl.classList.add('bg-warning', 'text-dark'); 
            break;
        default: 
            toastEl.classList.add('bg-dark', 'text-white');
    }

    msgEl.innerText = mensagem;
    
    try {
        // Chama a função do Bootstrap para mostrar o balãozinho
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    } catch (e) {
        alert(mensagem);
    }
};

// 4. PROTEÇÃO DE ROTA (VERIFICAR SESSÃO)
window.verificarSessao = () => {
    const usuarioId = localStorage.getItem('usuario_id');
    if (!usuarioId) {
        // Redireciona para a pasta correta caso não esteja logado
        window.location.href = '../usuario/login.html';
    }
};