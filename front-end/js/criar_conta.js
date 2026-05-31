// 1. CONFIGURAÇÃO DO BACKEND (Consistente com o ecossistema)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.getElementById('criarContaForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar_senha').value;
    const btn = e.target.querySelector('button');

    // 2. VALIDAÇÕES BÁSICAS NO FRONTEND
    if (!nome || !email || !senha) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    if (senha !== confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    if (senha.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    // Bloqueia o botão para evitar cliques duplos/concorrência de requisições
    btn.disabled = true;
    btn.innerText = "CRIANDO CONTA...";

    try {
        // 3. ENVIO PARA O PYTHON BACKEND
        const response = await fetch(`${API_BASE_URL}/api/auth/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome_completo: nome,
                email: email,
                senha: senha
            })
        });

        // 4. BLINDAGEM CONTRA ERROS E RETORNOS HTML DO SERVIDOR
        if (!response.ok) {
            let errorMessage = "Falha ao criar conta.";
            try {
                const data = await response.json();
                errorMessage = data.mensagem || data.error || errorMessage;
            } catch (err) {
                if (response.status === 404) errorMessage = "Rota de cadastro não encontrada no servidor.";
                if (response.status === 500) errorMessage = "Erro interno no servidor (Banco de dados temporariamente indisponível).";
            }
            throw new Error(errorMessage);
        }

        // Se a resposta retornou sucesso (status 200/201)
        const data = await response.json();
        alert(data.mensagem || "Conta criada com sucesso! Agora você pode fazer login.");
        window.location.href = 'login.html';

    } catch (error) {
        console.error("Erro na requisição de cadastro:", error.message);
        alert(`Erro: ${error.message}`);
    } finally {
        // Garante a reativação do botão para controle de UX
        if (btn) {
            btn.disabled = false;
            btn.innerText = "CRIAR CONTA";
        }
    }
});