// 1. CONFIGURAÇÃO GERAL DO BACKEND (Unificada e Segura)
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const section1 = document.getElementById('reset-section-1');
    const section2 = document.getElementById('reset-section-2');
    const sendCodeForm = document.getElementById('sendCodeForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');

    // ETAPA 1: Solicitar Código (Conecta ao Python)
    if (sendCodeForm) {
        sendCodeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email').value.trim();
            if (!emailInput) {
                alert("Por favor, digite seu e-mail.");
                return;
            }

            // Salva no sessionStorage para blindar contra perdas de estado entre as seções
            sessionStorage.setItem('email_recuperacao', emailInput);
            
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'VERIFICANDO...';

            try {
                const response = await fetch(`${API_BASE_URL}/api/recuperar-senha`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailInput })
                });

                // Blindagem contra erros de resposta estruturados ou quedas do servidor
                if (!response.ok) {
                    let errorMessage = "Erro: E-mail não encontrado na base de dados.";
                    try {
                        const data = await response.json();
                        errorMessage = data.error || data.mensagem || errorMessage;
                    } catch (err) {
                        if (response.status === 404) errorMessage = "Rota de recuperação não encontrada.";
                        if (response.status === 500) errorMessage = "Erro interno no servidor Python.";
                    }
                    throw new Error(errorMessage);
                }

                // Se o servidor respondeu OK (Status 200)
                alert("✨ Código gerado! (Se for para o TCC/Testes locais, olhe o terminal do seu VS Code para pegar os 6 dígitos).");
                
                // Transição visual das seções
                if (section1 && section2) {
                    section1.style.display = 'none';
                    section2.style.display = 'block';
                }

            } catch (error) {
                console.error("Erro na recuperação:", error.message);
                alert(error.message);
            } finally {
                button.disabled = false;
                button.textContent = 'ENVIAR CÓDIGO';
            }
        });
    }

    // ETAPA 2: Definir Nova Senha (Usa o Código de 6 dígitos)
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Resgata o e-mail que salvamos com segurança na Etapa 1
            const emailSalvo = sessionStorage.getItem('email_recuperacao');
            const codigo = document.getElementById('verification_code')?.value.trim();
            const nova_senha = document.getElementById('new_password')?.value;
            const confirmar = document.getElementById('confirm_new_password')?.value;

            if (!emailSalvo) {
                alert("Sessão expirada. Por favor, solicite o código novamente.");
                window.location.reload();
                return;
            }

            if (!codigo || codigo.length !== 6) {
                alert("Por favor, insira o código de verificação válido com 6 dígitos.");
                return;
            }

            if (nova_senha !== confirmar) {
                alert("As senhas não coincidem!");
                return;
            }

            if (nova_senha.length < 6) {
                alert("A nova senha deve ter pelo menos 6 caracteres.");
                return;
            }

            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'SALVANDO...';

            try {
                const response = await fetch(`${API_BASE_URL}/api/redefinir-senha`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: emailSalvo, 
                        codigo: codigo,
                        nova_senha: nova_senha 
                    })
                });

                if (!response.ok) {
                    let errorMessage = "Código inválido ou expirado.";
                    try {
                        const data = await response.json();
                        errorMessage = data.error || data.mensagem || errorMessage;
                    } catch (err) {
                        if (response.status === 404) errorMessage = "Rota de redefinição não encontrada.";
                        if (response.status === 500) errorMessage = "Erro ao processar alteração no servidor.";
                    }
                    throw new Error(errorMessage);
                }

                alert("Senha redefinida com sucesso! Use sua nova senha para entrar.");
                sessionStorage.removeItem('email_recuperacao'); // Limpa o dado sensível da memória
                window.location.href = 'login.html';

            } catch (error) {
                console.error("Erro na redefinição:", error.message);
                alert(error.message);
            } finally {
                button.disabled = false;
                button.textContent = 'SALVAR NOVA SENHA';
            }
        });
    }

    // Botão de Voltar da Etapa 2 para a Etapa 1
    document.getElementById('back-to-step1')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (section1 && section2) {
            section1.style.display = 'block';
            section2.style.display = 'none';
        }
        
        // Limpa os campos se o usuário desistir e voltar
        const codeField = document.getElementById('verification_code');
        const passField = document.getElementById('new_password');
        const confirmField = document.getElementById('confirm_new_password');
        
        if (codeField) codeField.value = '';
        if (passField) passField.value = '';
        if (confirmField) confirmField.value = '';
    });
});