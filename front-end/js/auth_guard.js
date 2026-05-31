// js/auth_guard.js - Proteção de Rotas Regia & Tinas Care

/**
 * Verifica se o usuário tem a permissão necessária (role) para estar na página atual.
 * @param {string} roleNecessaria - 'admin' para painel gerencial, 'cliente' para área do usuário.
 */
export async function verificarAcesso(roleNecessaria) {
    // 1. Garante que o API_BASE_URL exista (mesmo que utils.js não carregue a tempo)
    const baseUrl = window.API_BASE_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000" 
        : "https://regia-tinas.onrender.com");

    // 2. Pega o ID salvo no navegador
    const userId = localStorage.getItem('usuario_id');

    // 3. Se não houver ID, expulsa direto para o login
    if (!userId) {
        console.warn("Acesso negado: Usuário não autenticado.");
        window.location.href = '../usuario/login.html';
        return false;
    }

    try {
        // 4. Pergunta ao servidor Python qual é o cargo real desse usuário
        const response = await fetch(`${baseUrl}/api/auth/verificar-role/${userId}`);
        
        if (!response.ok) {
            throw new Error("Sessão inválida ou expirada.");
        }

        // Blindagem contra erro de JSON/HTML
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            throw new Error("Erro ao processar resposta do servidor.");
        }

        // 5. Validação rigorosa de permissão
        if (roleNecessaria === 'admin' && data.role !== 'admin') {
            alert("Acesso Negado: Esta área é exclusiva para administradores da Regia & Tinas Care.");
            window.location.href = '../index.html'; // Chuta para a home
            return false;
        }

        // Se chegou até aqui, está tudo certo! O usuário tem permissão.
        return true;

    } catch (error) {
        console.error("Erro crítico de segurança:", error);
        
        // Em caso de erro crítico, limpa a sessão suspeita e manda pro login
        localStorage.removeItem('usuario_id');
        localStorage.removeItem('usuario_role');
        localStorage.removeItem('token');
        
        window.location.href = '../usuario/login.html';
        return false;
    }
}