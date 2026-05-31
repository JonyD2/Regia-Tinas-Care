/**
 * js/admin_horarios.js - Gestão de Escalas e Folgas
 * Conectado ao Backend Python + Neon
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    carregarProfissionais();

    // Evento de Seleção de Profissional
    document.getElementById('profissional-select').addEventListener('change', (e) => {
        const idProfissional = e.target.value;
        if(idProfissional) {
            document.getElementById('area-agenda').style.display = 'block';
            carregarHorarioPadrao(idProfissional);
            carregarFolgas(idProfissional);
            renderizarPrevisaoSemana(idProfissional);
        }
    });

    // Forms
    document.getElementById('blockDayForm').addEventListener('submit', salvarFolga);
    document.getElementById('horariosForm').addEventListener('submit', salvarGradeHorarios);
});

// --- 1. BUSCAR FUNCIONÁRIOS ---
async function carregarProfissionais() {
    const select = document.getElementById('profissional-select');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/funcionarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const profissionais = await response.json();
            profissionais.forEach(p => {
                const opt = new Option(p.nome_completo, p.id);
                select.add(opt);
            });
        }
    } catch (error) { console.error("Erro profissionais:", error); }
}

// --- 2. CARREGAR GRADE DE HORÁRIOS ---
async function carregarHorarioPadrao(idProfissional) {
    const tbody = document.getElementById('tabela-horarios-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-brand"></div></td></tr>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/horarios-profissional/${idProfissional}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const horarios = response.ok ? await response.json() : [];
        const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

        tbody.innerHTML = diasSemana.map(dia => {
            const h = horarios.find(x => x.dia_semana === dia) || { is_folga: false, hora_inicio: '09:00', hora_fim: '18:00' };
            const isTrabalha = !h.is_folga;

            return `
            <tr data-dia="${dia}">
                <td class="fw-bold text-dark">${dia}</td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input switch-folga" type="checkbox" role="switch" ${isTrabalha ? 'checked' : ''}>
                        <label class="form-check-label small fw-bold ${isTrabalha ? 'text-success' : 'text-muted'}">${isTrabalha ? 'Ativo' : 'Folga'}</label>
                    </div>
                </td>
                <td><input type="time" class="form-control form-control-sm border-0 bg-light input-inicio" value="${h.hora_inicio || '09:00'}" ${h.is_folga ? 'disabled' : ''}></td>
                <td><input type="time" class="form-control form-control-sm border-0 bg-light input-fim" value="${h.hora_fim || '18:00'}" ${h.is_folga ? 'disabled' : ''}></td>
            </tr>`;
        }).join('');

        // Evento para habilitar/desabilitar campos
        document.querySelectorAll('.switch-folga').forEach(sw => {
            sw.addEventListener('change', (e) => {
                const tr = e.target.closest('tr');
                const works = e.target.checked;
                tr.querySelector('label').innerText = works ? 'Ativo' : 'Folga';
                tr.querySelector('label').className = `form-check-label small fw-bold ${works ? 'text-success' : 'text-muted'}`;
                tr.querySelector('.input-inicio').disabled = !works;
                tr.querySelector('.input-fim').disabled = !works;
            });
        });

    } catch (error) { tbody.innerHTML = '<tr><td colspan="4" class="text-danger text-center small">Erro ao carregar escala.</td></tr>'; }
}

// --- 3. SALVAR GRADE SEMANAL ---
async function salvarGradeHorarios(e) {
    e.preventDefault();
    const btn = document.getElementById('saveHorariosButton');
    const idProfissional = document.getElementById('profissional-select').value;
    const linhas = document.querySelectorAll('#tabela-horarios-body tr');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Gravando...';

    const grade = Array.from(linhas).map(tr => ({
        dia_semana: tr.dataset.dia,
        is_folga: !tr.querySelector('.switch-folga').checked,
        hora_inicio: tr.querySelector('.input-inicio').value,
        hora_fim: tr.querySelector('.input-fim').value
    }));

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/horarios-profissional/${idProfissional}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ grade })
        });

        if (response.ok) {
            alert("✅ Jornada semanal atualizada!");
            renderizarPrevisaoSemana(idProfissional);
        } else { alert("Erro ao salvar."); }
    } catch (error) { alert("Erro de conexão."); }
    finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>ATUALIZAR JORNADA';
    }
}

// --- 4. PREVISÃO VISUAL (MÓDULO NOVO) ---
function renderizarPrevisaoSemana(idProfissional) {
    const container = document.getElementById('calendario-preview');
    container.innerHTML = '';
    
    const hoje = new Date();
    const diasSemanaMapa = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    for (let i = 0; i < 7; i++) {
        const dataVisita = new Date();
        dataVisita.setDate(hoje.getDate() + i);
        
        const diaNome = diasSemanaMapa[dataVisita.getDay()];
        const diaMes = dataVisita.getDate();
        const mesCurto = dataVisita.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = `
            <div class="calendar-card p-3 shadow-sm text-center">
                <div class="day-badge mb-2">
                    <span class="d-block small text-uppercase">${mesCurto}</span>
                    <span class="fs-4">${diaMes}</span>
                </div>
                <small class="fw-bold text-muted">${diaNome}</small>
            </div>
        `;
        container.appendChild(col);
    }
}

// --- 5. GESTÃO DE FOLGAS PONTUAIS ---
async function carregarFolgas(idProfissional) {
    const list = document.getElementById('blockedDaysList');
    list.innerHTML = '<div class="text-center p-3"><span class="spinner-border spinner-border-sm text-brand"></span></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/ausencias-profissional/${idProfissional}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const folgas = response.ok ? await response.json() : [];
        
        if(folgas.length === 0) {
            list.innerHTML = '<p class="small text-muted text-center py-3">Nenhuma ausência futura.</p>';
            return;
        }

        list.innerHTML = folgas.map(f => `
            <div class="list-group-item d-flex justify-content-between align-items-center border-0 bg-light rounded-3 mb-2 p-3">
                <div>
                    <strong class="text-dark"><i class="bi bi-calendar-x me-2 text-danger"></i>${new Date(f.data_bloqueada).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</strong>
                    <div class="small text-muted text-capitalize">${f.motivo || 'Folga'}</div>
                </div>
                <button class="btn btn-sm btn-white text-danger shadow-sm" onclick="window.removerFolga(${f.id_bloqueio}, '${idProfissional}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<p class="text-danger small">Erro ao carregar folgas.</p>'; }
}

async function salvarFolga(e) {
    e.preventDefault();
    const idProfissional = document.getElementById('profissional-select').value;
    const dataAusencia = document.getElementById('data-ausencia').value;
    const motivo = document.getElementById('motivo-ausencia').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/bloquear-dia`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ id_funcionario: idProfissional, data: dataAusencia, motivo })
        });

        if (response.ok) {
            alert("🚀 Ausência registrada e bloqueada no site!");
            carregarFolgas(idProfissional);
        }
    } catch (error) { alert("Erro ao conectar."); }
}

window.removerFolga = async (idBloqueio, idProfissional) => {
    if(!confirm("Liberar este dia na agenda?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/remover-bloqueio/${idBloqueio}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) carregarFolgas(idProfissional);
    } catch (e) { alert("Erro de rede."); }
};