/**
 * js/perfil.js - Gestão Unificada e SPA do Painel do Cliente (Tutor)
 * Sincronizado com as tabelas do Neon, rotas do app.py e o novo perfil.html
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('usuario_id');
    
    // Proteção de rota do lado do cliente
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    // --- DISPARO DE CARREGAMENTO INICIAL DO NEON ---
    carregarDadosUsuario(userId);
    carregarPets(userId);
    carregarAgendamentos(userId);
    
    // Renderiza a saudação personalizada no topo (Nome do Tutor)
    const nomeSalvo = localStorage.getItem('usuario_nome');
    if (nomeSalvo) {
        const greetingElement = document.getElementById('user-greeting');
        if (greetingElement) greetingElement.innerHTML = `Tutor(a) <span class="text-white">${nomeSalvo.split(' ')[0]}</span>`;
    }

    // --- CONFIGURAÇÃO DE OUVINTES DE EVENTOS (LISTENERS) ---
    
    // Atualização de Dados de Perfil
    document.getElementById('form-perfil')?.addEventListener('submit', (e) => {
        e.preventDefault();
        salvarPerfil(userId);
    });
    
    // Cadastro de Novo Pet
    document.getElementById('form-cadastro-pet')?.addEventListener('submit', (e) => {
        cadastrarPet(e, userId);
    });
    
    // Encerramento de Sessão (Logout)
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if (confirm('Deseja realmente sair da sua conta com segurança?')) {
            localStorage.clear();
            sessionStorage.clear();
            showToast("Sessão encerrada. Até logo! 🐾", "sucesso");
            setTimeout(() => { window.location.href = '../index.html'; }, 1000);
        }
    });
});

// ==========================================
// 1. GESTÃO DOS DADOS PESSOAIS DO TUTOR
// ==========================================
async function carregarDadosUsuario(id) {
    if (!id || id === "null") return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/usuario/dados/${id}`);
        if (!response.ok) throw new Error(`Erro ao carregar dados`);
        
        const data = await response.json();
        
        const inputNome = document.getElementById('nome_completo');
        const inputTelefone = document.getElementById('telefone');
        const inputEmail = document.getElementById('email_display');

        if (inputNome) inputNome.value = data.nome_completo || '';
        if (inputTelefone) inputTelefone.value = data.telefone || '';
        if (inputEmail) inputEmail.value = data.email || '';
        
    } catch (error) {
        console.error("❌ ERRO CRÍTICO NO PERFIL:", error);
        showToast("Erro ao carregar dados.", "erro");
    }
}

async function salvarPerfil(id) {
    const btn = document.getElementById('btnSalvarPerfil');
    if (!btn) return;

    const originalText = btn.innerText;
    const payload = {
        nome_completo: document.getElementById('nome_completo').value.trim(),
        telefone: document.getElementById('telefone').value.trim()
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Salvando...';
        
        const response = await fetch(`${API_BASE_URL}/api/perfil/atualizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, ...payload })
        });

        if (response.ok) {
            showToast("✨ Dados pessoais atualizados com sucesso!", "sucesso");
            localStorage.setItem('usuario_nome', payload.nome_completo);
            
            const greetingElement = document.getElementById('user-greeting');
            if (greetingElement) greetingElement.innerHTML = `Tutor(a) <span class="text-white">${payload.nome_completo.split(' ')[0]}</span>`;
        } else {
            throw new Error("Erro na resposta do servidor");
        }
    } catch (error) {
        console.error(error);
        showToast("Não foi possível salvar as alterações.", "erro");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// ==========================================
// 2. GESTÃO INTEGRADA DE PETS
// ==========================================
async function carregarPets(id) {
    const container = document.getElementById('lista-pets');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/pets/usuario/${id}`);
        if (!response.ok) throw new Error("Erro de requisição");
        
        const pets = await response.json();
        const listaPets = Array.isArray(pets) ? pets : [];

        if (listaPets.length === 0) {
            container.innerHTML = '<div class="col-12 text-center p-3 text-muted small"><i class="bi bi-info-circle me-1"></i> Nenhum pet cadastrado nesta conta.</div>';
            return;
        }

        container.innerHTML = listaPets.map(pet => {
            const idPet = pet.id_pet || pet.id;
            return `
                <div class="col-md-6 mb-3">
                    <div class="d-flex align-items-center p-3 border border-light-subtle rounded-4 bg-white shadow-sm" style="border-left: 5px solid #FE8697 !important;">
                        <div class="flex-grow-1">
                            <h6 class="fw-bold text-dark mb-1">${pet.nome_pet || 'Meu Pet'}</h6>
                            <small class="text-muted fw-medium">${pet.especie || 'Cão'} • <span class="text-secondary">${pet.raca || 'SRD'}</span></small>
                        </div>
                        <div class="text-end">
                            <span class="badge bg-light text-dark border rounded-pill px-2 py-1 mb-2 d-inline-block small fw-semibold" style="font-size: 0.72rem;">${pet.porte || 'Médio'}</span>
                            <button class="btn btn-sm btn-link text-danger p-0 d-block ms-auto me-1 border-0" onclick="window.confirmarExclusaoPet('${idPet}')" title="Excluir Pet">
                                <i class="bi bi-trash3-fill"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Erro ao processar minicards de pets:", error);
        container.innerHTML = '<p class="text-danger small p-3">Falha ao processar lista de animais.</p>';
    }
}

async function cadastrarPet(e, id) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (!btn) return;

    const payload = {
        id_tutor: id,
        nome_pet: document.getElementById('input_nome_pet').value.trim(),
        especie: document.getElementById('input_especie').value,
        raca: document.getElementById('input_raca').value.trim() || 'SRD',
        porte: document.getElementById('input_porte').value,
        observacoes: document.getElementById('input_obs').value.trim()
    };

    try {
        btn.disabled = true;
        const response = await fetch(`${API_BASE_URL}/api/pets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast(`🐾 ${payload.nome_pet} foi registrado na sua conta!`, "sucesso");
            e.target.reset();
            if (typeof window.toggleFormPet === 'function') window.toggleFormPet();
            await carregarPets(id);
        } else {
            alert("Erro ao salvar o pet.");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de ligação com a nuvem.", "erro");
    } finally {
        btn.disabled = false;
    }
}

window.confirmarExclusaoPet = async (idPet) => {
    if (!confirm("Tem certeza que deseja remover este pet?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/pets/${idPet}`, { method: 'DELETE' });
        if (response.ok) {
            showToast("Pet removido da conta.", "sucesso");
            await carregarPets(localStorage.getItem('usuario_id'));
        }
    } catch (error) {
        showToast("Erro ao processar exclusão.", "erro");
    }
};

// ==========================================
// 3. TABELA HISTÓRICA DE AGENDAMENTOS (SPA)
// ==========================================
async function carregarAgendamentos(id) {
    const tbody = document.getElementById('tabela-meus-agendamentos');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/cliente/${id}`);
        const listaAgendas = await response.json();

        if (listaAgendas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-secondary small"><i class="bi bi-info-circle me-1"></i> Nenhum agendamento encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = listaAgendas.map(ag => {
            const dataFinal = ag.data_hora_inicio ? new Date(ag.data_hora_inicio).toLocaleString('pt-BR') : "Data a confirmar";
            return `
                <tr>
                    <td class="fw-semibold text-secondary">${dataFinal}</td>
                    <td><span class="badge bg-light text-dark border px-2 py-1 rounded-pill small">${ag.nome_pet || 'Meu Pet'}</span></td>
                    <td class="fw-medium text-dark">${ag.nome_servico || 'Serviço'}</td>
                    <td><span class="badge ${getStatusBadgeClass(ag.status || 'pendente')} text-uppercase px-3 py-1-5 rounded-pill small fw-bold">${ag.status || 'pendente'}</span></td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger text-center small p-4">Erro ao carregar agendamentos.</td></tr>';
    }
}

function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmado': return 'bg-success text-white';
        case 'pendente': return 'bg-warning text-dark';
        case 'concluido': return 'bg-info text-white';
        case 'cancelado': return 'bg-danger text-white';
        default: return 'bg-secondary text-white';
    }
}

// ==========================================
// 4. CONTROLADOR DE TOASTS
// ==========================================
function showToast(mensagem, tipo = "sucesso") {
    const toastEl = document.getElementById('liveToast');
    const msgEl = document.getElementById('toast-mensagem');
    
    if (!toastEl || !msgEl) return;

    msgEl.innerText = mensagem;
    toastEl.className = (tipo === "erro") 
        ? "toast align-items-center text-white bg-danger border-0 rounded-4" 
        : "toast align-items-center text-white bg-dark border-0 rounded-4";

    new bootstrap.Toast(toastEl).show();
}