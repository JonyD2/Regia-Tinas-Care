// js/gestao_usuarios.js

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let listaOriginal = [];
let usuarioPromocao = null;

// --- FUNÇÃO DE SEGURANÇA ---
async function checkAdminAuth() {
    const userId = localStorage.getItem('usuario_id');
    const userRole = (localStorage.getItem('usuario_role') || '').toLowerCase().trim();

    if (!userId || userRole !== 'admin') {
        console.warn("Acesso negado: Usuário não é administrador.");
        window.location.href = (userRole === 'funcionario') ? '../admin/funcionario.html' : '../usuario/login.html';
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verificar-admin/${userId}`);
        if (!response.ok) throw new Error("Servidor negou acesso.");
        const data = await response.json();
        return (data.isAdmin === true || data.isAdmin === "true") ? { id: userId, role: 'admin' } : null;
    } catch (error) {
        console.error("Erro de conexão:", error);
        return null;
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAdminAuth();
    if (!auth) return;

    await carregarUsuarios();

    const input = document.getElementById('input-busca-inteligente');
    const btn = document.getElementById('btn-buscar-manual');

    if (input) input.addEventListener('input', () => filtrarERenderizar(input.value));
    if (btn) btn.addEventListener('click', () => filtrarERenderizar(input.value));

    const formPromover = document.getElementById('formPromover');
    if (formPromover) {
        formPromover.addEventListener('submit', async (e) => {
            e.preventDefault();
            const especialidade = document.getElementById('promover_especialidade').value;
            const salario = document.getElementById('promover_salario').value;
            await executarMudancaCargo(usuarioPromocao.id, usuarioPromocao.novoRole, especialidade, salario);
            bootstrap.Modal.getInstance(document.getElementById('modalPromover')).hide();
            e.target.reset();
        });
    }
});

// --- FUNÇÕES DE CARREGAMENTO E RENDER ---
window.carregarUsuarios = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/listar-tudo`);
        listaOriginal = await res.json();
        
        // LOG IMPORTANTE: Veja o que chega do banco no seu F12 -> Console
        console.log("Usuários recebidos do servidor:", listaOriginal);
        
        const contador = document.getElementById('contador-total');
        if (contador) contador.textContent = listaOriginal.length;
        
        filtrarERenderizar('');
    } catch (error) {
        console.error("Erro ao carregar lista de usuários:", error);
    }
}

function filtrarERenderizar(termo) {
    const t = termo.toLowerCase().trim();
    const equipeContainer = document.getElementById('lista-equipe');
    const clientesContainer = document.getElementById('lista-clientes');

    const filtrados = listaOriginal.filter(u => 
        (u.nome_completo || "").toLowerCase().includes(t) || 
        (u.email || "").toLowerCase().includes(t) || 
        (u.cpf || "").includes(t)
    );

    equipeContainer.innerHTML = filtrados.filter(u => u.role === 'admin' || u.role === 'funcionario').map(cardUsuario).join('') || '<p class="text-muted ps-3">Nenhum membro da equipe encontrado.</p>';
    clientesContainer.innerHTML = filtrados.filter(u => u.role === 'cliente').map(cardUsuario).join('') || '<p class="text-muted ps-3">Nenhum cliente encontrado.</p>';
}

function cardUsuario(user) {
    // Garantimos que pegamos o ID independente do nome da coluna (id ou id_usuario)
    const userId = user.id || user.id_usuario;
    
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card user-card shadow-sm role-${user.role}">
                <div class="card-body">
                    <h6 class="fw-bold">${user.nome_completo || 'Sem Nome'}</h6>
                    <p class="small text-muted">${user.email || 'Sem E-mail'}</p>
                    <select class="form-select form-select-sm" onchange="window.verificarMudancaCargo('${userId}', '${user.role}', this.value)">
                        <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                        <option value="funcionario" ${user.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
            </div>
        </div>`;
}

// --- LÓGICA DE CARGOS ---
window.verificarMudancaCargo = (id, roleAntiga, novoRole) => {
    if (roleAntiga === 'cliente' && (novoRole === 'funcionario' || novoRole === 'admin')) {
        usuarioPromocao = { id, novoRole };
        new bootstrap.Modal(document.getElementById('modalPromover')).show();
        return;
    }
    if (confirm("Confirmar alteração de cargo?")) executarMudancaCargo(id, novoRole);
    else window.carregarUsuarios();
};

async function executarMudancaCargo(id, novoRole, esp = null, sal = null) {
    const payload = { id_usuario: id, novo_role: novoRole, especialidade: esp, salario: sal };
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/alterar-role`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) alert("Alteração realizada!");
    } catch (e) { alert("Erro de conexão"); }
    window.carregarUsuarios();
}