/**
 * js/meus_agendamentos.js - Histórico de Agendamentos do Cliente
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    const clienteId = localStorage.getItem('usuario_id');
    
    // Proteção de rota
    if (!clienteId) {
        window.location.href = 'login.html';
        return;
    }

    // ==========================================
    // ENCERRAMENTO DE SESSÃO (LOGOUT PADRONIZADO)
    // ==========================================
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Deseja realmente sair da sua conta?')) {
                localStorage.clear();
                window.location.href = '../index.html';
            }
        });
    }

    // Carrega a agenda
    await carregarAgendamentos(clienteId);
});

async function carregarAgendamentos(id) {
    const container = document.getElementById('lista-agendamentos-cliente');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color: var(--brand-pink)" role="status"></div><p class="mt-2 text-muted small">Sincronizando agendamentos...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/cliente/${id}`);
        const agendamentos = await response.json();

        if (!agendamentos || agendamentos.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-calendar-x fs-1 text-muted"></i>
                    <p class="text-muted mt-3">Nenhum agendamento encontrado.</p>
                    <a href="agendamento.html" class="btn btn-brand rounded-pill px-4">Agendar Agora</a>
                </div>`;
            return;
        }

        container.innerHTML = agendamentos.map(ag => {
            const pet = ag.nome_pet || 'Meu Pet';
            const servico = ag.nome_servico || 'Serviço';
            const status = ag.status || 'pendente';
            const valor = parseFloat(ag.valor_cobrado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Trava de segurança para data
            let dataFinal = "Data a confirmar";
            if (ag.data_hora_inicio) {
                const dataObj = new Date(ag.data_hora_inicio);
                if (!isNaN(dataObj)) {
                    dataFinal = dataObj.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                }
            }

            return `
                <div class="col-md-6 mb-4">
                    <div class="card card-agendamento shadow-sm border-0 rounded-4 bg-white status-${status.toLowerCase()}">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h5 class="fw-bold text-dark mb-1">${servico}</h5>
                                    <span class="badge bg-light text-secondary border mt-1"><i class="bi bi-paw-fill me-1" style="color: #FE8697;"></i> ${pet}</span>
                                </div>
                                <span class="badge ${getStatusBadgeClass(status)} text-uppercase px-3 py-2 rounded-pill small fw-bold">${status}</span>
                            </div>
                            <hr class="opacity-10">
                            <div class="row text-muted small g-2">
                                <div class="col-6"><i class="bi bi-calendar3 me-2" style="color: var(--brand-pink)"></i>${dataFinal}</div>
                                <div class="col-6"><i class="bi bi-cash-coin me-2" style="color: var(--brand-pink)"></i>${valor}</div>
                            </div>
                            ${status.toLowerCase() === 'pendente' ? `
                                <div class="mt-4 text-end">
                                    <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="window.cancelarAgendamento('${ag.id_agendamento}')">
                                        <i class="bi bi-x-circle me-1"></i> Cancelar
                                    </button>
                                </div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p class="text-danger text-center">Erro ao carregar dados.</p>';
    }
}

window.cancelarAgendamento = async (idAgendamento) => {
    if (!confirm("Tem certeza que deseja cancelar?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/agendamentos/cancelar/${idAgendamento}`, { method: 'PUT' });
        if (response.ok) {
            alert("✅ Cancelado!");
            await carregarAgendamentos(localStorage.getItem('usuario_id'));
        }
    } catch (e) { alert("Erro de conexão."); }
};

function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmado': return 'bg-success text-white';
        case 'pendente': return 'bg-warning text-dark';
        case 'concluido': return 'bg-info text-white';
        default: return 'bg-secondary text-white';
    }
}