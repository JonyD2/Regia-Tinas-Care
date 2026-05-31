/**
 * js/admin_agendamentos.js - Gestão Central de Reservas
 * Responsável por: Filtros, Listagem Dinâmica e Controle de Status.
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    carregarFiltrosIniciais();
    loadAndDisplayAppointments();

    // Eventos para recarregar a tabela quando mudar os filtros
    document.getElementById('filtro-status')?.addEventListener('change', loadAndDisplayAppointments);
    document.getElementById('filtro-servico')?.addEventListener('change', loadAndDisplayAppointments);
    document.getElementById('filtro-funcionario')?.addEventListener('change', loadAndDisplayAppointments);
    
    // Busca em tempo real no campo de texto
    document.getElementById('input-busca-agendamento')?.addEventListener('input', (e) => {
        // Implementar busca local ou via debounce para API
        loadAndDisplayAppointments();
    });
});

// --- 1. CARREGAR FILTROS (SERVIÇOS E FUNCIONÁRIOS) ---
async function carregarFiltrosIniciais() {
    try {
        const token = localStorage.getItem('token');
        
        // Busca os Serviços
        const resServicos = await fetch(`${API_BASE_URL}/api/servicos`);
        if (resServicos.ok) {
            const servicos = await resServicos.json();
            const selectServico = document.getElementById('filtro-servico');
            if (selectServico) {
                servicos.forEach(s => {
                    const opt = new Option(s.nome_servico, s.id_servico);
                    selectServico.add(opt);
                });
            }
        }

        // Busca os Funcionários
        const resFuncionarios = await fetch(`${API_BASE_URL}/api/admin/funcionarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resFuncionarios.ok) {
            const funcionarios = await resFuncionarios.json();
            const selectFunc = document.getElementById('filtro-funcionario');
            if (selectFunc) {
                funcionarios.forEach(f => {
                    const opt = new Option(f.nome, f.id_funcionario);
                    selectFunc.add(opt);
                });
            }
        }
    } catch (error) {
        console.error("Erro ao carregar os filtros:", error);
    }
}

// --- 2. GERAÇÃO DE HTML PARA A TABELA ---
function createAppointmentRowHtml(ag) {
    const dataObj = new Date(ag.data_hora_inicio);
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Mapeamento de Classes de Status (Conforme o CSS do HTML)
    let statusClass = 'status-badge';
    if (ag.status === 'confirmado') statusClass += ' status-confirmado';
    else if (ag.status === 'pendente') statusClass += ' status-pendente';
    else if (ag.status === 'concluido') statusClass += ' status-concluido';
    else if (ag.status === 'cancelado') statusClass += ' status-cancelado';
    else statusClass += ' bg-secondary text-white';

    const statusTexto = ag.status === 'em_andamento' ? 'Em Atendimento' : ag.status;

    return `
        <tr>
            <td>
                <div class="fw-bold text-dark">${ag.cliente_nome || 'Cliente'}</div>
                <small class="text-muted">🐾 ${ag.nome_pet || 'Pet'}</small>
            </td>
            <td>
                <span class="badge bg-light text-dark border-0 shadow-sm mb-1">${ag.nome_servico}</span><br>
                <small class="text-muted"><i class="bi bi-person-badge me-1"></i>${ag.nome_funcionario || 'Pendente'}</small>
            </td>
            <td>
                <div class="fw-bold">${dataFormatada}</div>
                <div class="small text-muted">${horaFormatada}</div>
            </td>
            <td class="fw-bold text-dark">
                R$ ${parseFloat(ag.valor_cobrado || 0).toFixed(2)}
            </td>
            <td>
                <span class="${statusClass}">${statusTexto}</span>
            </td>
            <td class="text-end">
                <div class="d-flex justify-content-end gap-1">
                    <button class="btn-action btn btn-outline-success" title="Concluir" onclick="window.concluirAgendamento('${ag.id_agendamento}')">
                        <i class="bi bi-check2-circle"></i>
                    </button>
                    <button class="btn-action btn btn-success" title="WhatsApp" onclick="window.avisarWhatsapp('${ag.cliente_tel}', '${ag.cliente_nome}', '${ag.nome_pet}', '${ag.nome_servico}', '${ag.data_hora_inicio}')">
                        <i class="bi bi-whatsapp"></i>
                    </button>
                    <button class="btn-action btn btn-outline-danger" title="Cancelar" onclick="window.cancelarAgendamento('${ag.id_agendamento}')">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </div>
            </td>
        </tr>`;
}

// --- 3. CARREGAMENTO INICIAL E FILTRAGEM ---
async function loadAndDisplayAppointments() {
    const tableBody = document.getElementById('appointments-table-body');
    const loadingRow = document.getElementById('loading-row-appointments');
    const noAppointmentsRow = document.getElementById('no-appointments-row');

    if (!tableBody) return;

    // Filtros
    const status = document.getElementById('filtro-status')?.value || '';
    const servico = document.getElementById('filtro-servico')?.value || '';
    const funcionario = document.getElementById('filtro-funcionario')?.value || '';
    const busca = document.getElementById('input-busca-agendamento')?.value || '';

    try {
        const token = localStorage.getItem('token'); 
        let url = `${API_BASE_URL}/api/admin/agendamentos?status=${status}&servico=${servico}&funcionario=${funcionario}&busca=${busca}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Erro ao buscar agendamentos.");

        const agendamentos = await response.json();

        if (loadingRow) loadingRow.style.display = 'none';
        
        // Limpa a tabela preservando apenas as linhas de controle
        const rows = tableBody.querySelectorAll("tr");
        rows.forEach(row => {
            if (row.id !== 'loading-row-appointments' && row.id !== 'no-appointments-row') row.remove();
        });

        if (agendamentos.length > 0) {
            if (noAppointmentsRow) noAppointmentsRow.style.display = 'none';
            agendamentos.forEach(ag => {
                tableBody.insertAdjacentHTML('beforeend', createAppointmentRowHtml(ag));
            });
        } else {
            if (noAppointmentsRow) noAppointmentsRow.style.display = 'table-row';
        }
    } catch (error) {
        if (loadingRow) loadingRow.style.display = 'none';
        console.error("Erro na carga:", error);
    }
}

// --- 4. AÇÕES DOS BOTÕES ---

window.concluirAgendamento = async (id) => {
    if (!confirm("Confirmar a conclusão deste atendimento?")) return;
    atualizarStatus(id, 'concluido');
};

window.cancelarAgendamento = async (id) => {
    if (!confirm("Tem certeza que deseja CANCELAR este agendamento?")) return;
    atualizarStatus(id, 'cancelado');
};

async function atualizarStatus(id, novoStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/atualizar-status-pedido/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: novoStatus })
        });

        if (response.ok) {
            loadAndDisplayAppointments();
        } else {
            alert("Erro ao atualizar status no servidor.");
        }
    } catch (e) {
        alert("Falha na conexão com a API.");
    }
}

window.avisarWhatsapp = (telefone, dono, pet, servico, dataHora) => {
    if (!telefone) {
        alert("Cliente sem telefone cadastrado.");
        return;
    }
    
    const data = new Date(dataHora);
    const msg = `Olá ${dono}! 🐾 Passando para confirmar o agendamento de ${servico} para o(a) ${pet} no dia ${data.toLocaleDateString()} às ${data.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Esperamos por vocês na Regia & Tinas Care!`;
    
    const link = `https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
};