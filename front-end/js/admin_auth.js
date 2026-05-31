/**
 * admin_auth.js - Validador de Segurança do Painel Administrativo
 */

export async function checkAdminAuth() {
    // 1. Buscamos o ID e o CARGO que o login.js salvou
    const userId = localStorage.getItem('usuario_id');
    const userRole = localStorage.getItem('usuario_role');

    // Se não tiver ID ou se não for admin, nem tenta ir pro servidor, já barra aqui
    if (!userId || userRole !== 'admin') {
        console.warn("Acesso negado: Usuário não possui permissão de Administrador.");
        
        if (userRole === 'funcionario') {
            window.location.href = 'funcionario.html'; // Se for o Carlos, manda pra tela dele
        } else {
            window.location.href = '../usuario/login.html'; // Se for cliente ou deslogado, vai pro login
        }
        return null;
    }

    const baseUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000" 
        : "https://regia-tinas.onrender.com";

    try {
        // 2. Chamamos a rota de verificação que criamos no app.py passando o ID
        const response = await fetch(`${baseUrl}/api/auth/verificar-admin/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error("Erro na comunicação com o servidor.");
        }

        const data = await response.json();

        // 3. O servidor confirmou que é admin?
        if (data.isAdmin === true) {
            console.log("Acesso administrativo confirmado pelo servidor.");
            return { 
                id: userId, 
                nome: localStorage.getItem('usuario_nome') || 'Administrador',
                role: 'admin'
            };
        } else {
            console.error("Tentativa de acesso administrativo negada pelo servidor.");
            alert("Acesso restrito! Apenas administradores podem acessar esta área.");
            window.location.href = '../usuario/perfil.html'; 
            return null;
        }
        
    } catch (error) {
        console.error("Erro técnico na segurança:", error);
        // Em caso de erro de conexão (servidor fora), por segurança, deslogamos
        window.location.href = '../usuario/login.html';
        return null;
    }
}