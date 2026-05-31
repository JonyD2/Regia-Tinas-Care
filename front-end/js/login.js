const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', () => { 
    const loginForm = document.getElementById('loginForm'); 
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('senha'); 
    const emailInput = document.getElementById('email'); 
    const rememberCheckbox = document.getElementById('remember'); 
    
    // Lógica do olho (senha)
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            this.classList.toggle('bi-eye-slash-fill');
            this.classList.toggle('bi-eye-fill');
        });
    }

    // Lembrar de mim
    if (localStorage.getItem('lembrar_email') && emailInput) { 
        emailInput.value = localStorage.getItem('lembrar_email'); 
        if (rememberCheckbox) rememberCheckbox.checked = true; 
    }

    // Envio do formulário
    if (loginForm) { 
        loginForm.addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            
            const email = emailInput.value.trim(); 
            const password = passwordInput.value;
            const btn = loginForm.querySelector('button[type="submit"]');

            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('lembrar_email', email);
            } else {
                localStorage.removeItem('lembrar_email');
            }

            btn.disabled = true; 
            btn.textContent = 'ACESSANDO...';

            try { 
                const response = await fetch(`${API_BASE_URL}/api/login`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ email, senha: password }) 
                });

                const data = await response.json();
                console.log("Resposta do servidor:", data); // Debug essencial

                if (!response.ok) {
                    throw new Error(data.error || "Credenciais inválidas");
                }

                // Salva dados
                localStorage.setItem('usuario_id', data.id); 
                localStorage.setItem('usuario_nome', data.nome); 
                localStorage.setItem('usuario_role', data.role);

               // --- Lógica de Redirecionamento Blindada ---
            const cargo = (data.role || "").toString().toLowerCase().trim();
            console.log("DEBUG: Cargo recebido após processamento:", cargo);

            // Se for admin, manda pro admin. Se for funcionário, manda pro funcionário.
            if (cargo === 'admin') {
                window.location.href = '../admin/dashboard.html';
            } else if (cargo === 'funcionario') {
                window.location.href = '../admin/funcionario.html';
            } else {
                // Se não for nenhum dos dois, é cliente
                const urlRetorno = sessionStorage.getItem('url_retorno_agendamento');
                if (urlRetorno) {
                    sessionStorage.removeItem('url_retorno_agendamento');
                    window.location.href = urlRetorno;
                } else {
                    window.location.href = 'perfil.html'; 
                }
            }
            } catch (error) { 
                console.error('Erro:', error); 
                alert(error.message); 
            } finally { 
                btn.disabled = false; 
                btn.textContent = 'ENTRAR'; 
            } 
        }); 
    } 
});