/**
 * js/agendamento.js - Motor de Fluxo de Agendamento (Regia & Tinas Care)
 * Versão Final: Conectado e Blindado.
 */

// 1. CONFIGURAÇÃO DE AMBIENTE E ESTADO GLOBAL
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

let currentStep = 1;
let calendarDate = new Date(); 
const userId = localStorage.getItem('usuario_id');

const appointmentData = {
    cliente_id: userId,
    loja_id: null,
    loja_nome: null,
    servico_id: null,
    servico_nome: null,
    servico_preco: 0,
    data: null,      
    horario: null,   
    id_pet: null
};

// 2. DISPARO INICIAL COM VALIDAÇÃO LINHA DURA
document.addEventListener('DOMContentLoaded', () => {
    // Se o usuário não existir ou o login for inválido, bloqueia tudo na hora.
    if (!userId || userId === 'null' || userId === 'undefined' || userId.trim() === '') {
        document.getElementById('agendamento-wizard').style.display = 'none';
        document.getElementById('login-block').style.display = 'block';
    } else {
        // Se estiver logado, esconde o bloco de login, mostra o agendamento e carrega o sistema.
        document.getElementById('login-block').style.display = 'none';
        document.getElementById('agendamento-wizard').style.display = 'block';
        initSchedulingSystem();
    }
});

// Função acionada pelo botão do HTML quando o cara está bloqueado
window.irParaLogin = function() {
    sessionStorage.setItem('url_retorno_agendamento', window.location.href);
    window.location.href = 'usuario/login.html'; 
};

// --- INICIALIZAÇÃO DO AGENDAMENTO ---
function initSchedulingSystem() {
    loadServicesCatalog();
    loadPhysicalStores();
    bindInterfaceEvents();
}

async function loadServicesCatalog() {
    const select = document.getElementById('service-select');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/servicos`);
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        
        const data = await res.json();
        const servicos = Array.isArray(data) ? data : (data.servicos || []);
        
        select.innerHTML = '<option value="" disabled selected>O que vamos fazer hoje?</option>';

        servicos.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id_servico;
            opt.dataset.preco = s.preco_servico; 
            opt.textContent = s.nome_servico;  
            select.appendChild(opt);
        });
    } catch (e) {
        select.innerHTML = '<option value="">Erro operacional ao buscar serviços.</option>';
    }
}

async function loadPhysicalStores() {
    const select = document.getElementById('store-select');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/lojas`);
        const data = await res.json();
        const lojas = Array.isArray(data) ? data : [];
        
        select.innerHTML = '<option value="" disabled selected>Selecione a unidade...</option>';
        lojas.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id_loja;
            opt.textContent = l.nome_loja;
            select.appendChild(opt);
        });
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao buscar filiais.</option>';
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (!grid) return;

    grid.innerHTML = '';
    const daysHeader = ['D','S','T','Q','Q','S','S'];
    daysHeader.forEach(d => grid.innerHTML += `<div class="calendar-day-name">${d}</div>`);

    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();
    const mesNome = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(calendarDate);
    monthYearLabel.textContent = `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div></div>';

    for (let d = 1; d <= totalDays; d++) {
        const loopDate = new Date(year, month, d);
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isPast = loopDate < today;

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${isPast ? 'disabled' : ''}`;
        if (appointmentData.data === dateStr) dayEl.classList.add('selected');
        dayEl.textContent = d;

        if (!isPast) {
            dayEl.onclick = () => {
                appointmentData.data = dateStr;
                document.querySelectorAll('.calendar-day.selected').forEach(x => x.classList.remove('selected'));
                dayEl.classList.add('selected');
                fetchAvailableSlots(dateStr);
            };
        }
        grid.appendChild(dayEl);
    }
}

async function fetchAvailableSlots(dateStr) {
    const container = document.getElementById('time-slots-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center mt-4"><div class="spinner-border text-danger spinner-border-sm"></div></div>';

    try {
        const url = `${API_BASE_URL}/api/horarios-disponiveis?loja_id=${appointmentData.loja_id}&servico_id=${appointmentData.servico_id}&data=${dateStr}`;
        const res = await fetch(url);
        const slots = await res.json();
        
        container.innerHTML = '<h6 class="fw-bold mb-3 small text-uppercase text-secondary">Horários Livres:</h6>';
        
        if (!slots || slots.length === 0) {
            container.innerHTML = '<p class="small text-muted text-center py-4">Agenda cheia para este dia.</p>';
            return;
        }

        slots.forEach(time => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-secondary btn-sm m-1 time-slot-btn rounded-pill';
            btn.textContent = time;
            if (appointmentData.horario === time) btn.classList.replace('btn-outline-secondary', 'btn-danger');
            
            btn.onclick = () => {
                appointmentData.horario = time;
                document.querySelectorAll('.time-slot-btn').forEach(b => b.className = 'btn btn-outline-secondary btn-sm m-1 time-slot-btn rounded-pill');
                btn.className = 'btn bg-brand text-white btn-sm m-1 time-slot-btn rounded-pill';
                document.getElementById('nextButtonStep3').disabled = false;
            };
            container.appendChild(btn);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-danger small">Erro ao processar agenda.</p>';
    }
}

// --- PASSO 4: CARREGAR PETS DO BANCO NEON ---
async function loadUserPets() {
    const select = document.getElementById('select-pet');
    const containerSelect = document.getElementById('select-pet-container');
    const newPetFields = document.getElementById('new-pet-fields');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Buscando no sistema...</option>';

    try {
        const res = await fetch(`${API_BASE_URL}/api/pets/usuario/${appointmentData.cliente_id}`);
        const data = res.ok ? await res.json() : [];
        const listaPets = Array.isArray(data) ? data : [];
        
        if (listaPets.length === 0) {
            containerSelect.style.display = 'none';
            select.innerHTML = `<option value="NEW" selected>Novo Pet</option>`;
            newPetFields.style.display = 'block';
            appointmentData.id_pet = null;
        } else {
            containerSelect.style.display = 'block';
            newPetFields.style.display = 'none';
            select.innerHTML = '<option value="" disabled selected>Para qual pet será o atendimento?</option>';
            
            listaPets.forEach(p => {
                const opt = new Option(p.nome_pet, p.id_pet);
                select.appendChild(opt);
            });
            select.appendChild(new Option("➕ Cadastrar Outro Pet Agora", "NEW"));
        }
    } catch (e) { 
        containerSelect.style.display = 'none';
        select.innerHTML = `<option value="NEW" selected>Cadastrar Pet Manual</option>`;
        newPetFields.style.display = 'block';
    }
}

// --- NAVEGAÇÃO ENTRE OS PASSOS ---
function showStep(n) {
    document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i + 1 === n));
    const progressBar = document.getElementById('step-progressbar');
    if (progressBar) progressBar.style.width = `${(n / 5) * 100}%`;
    currentStep = n;

    if (n === 4) loadUserPets();
    if (n === 5) renderConfirmationSummary();
}

function renderConfirmationSummary() {
    const selectPet = document.getElementById('select-pet');
    const isNewPet = selectPet ? selectPet.value === 'NEW' : true;
    const nomePet = isNewPet ? document.getElementById('nome_pet').value : selectPet.options[selectPet.selectedIndex].text;

    document.getElementById('confirmation-summary').innerHTML = `
        <div class="row g-3">
            <div class="col-6"><small class="text-muted d-block">SERVIÇO</small> <strong class="text-dark">${appointmentData.servico_nome}</strong></div>
            <div class="col-6"><small class="text-muted d-block">UNIDADE</small> <strong class="text-dark">${appointmentData.loja_nome}</strong></div>
            <div class="col-6"><small class="text-muted d-block">DATA SELECIONADA</small> <strong class="text-dark">${appointmentData.data.split('-').reverse().join('/')}</strong></div>
            <div class="col-6"><small class="text-muted d-block">HORÁRIO RESERVADO</small> <strong class="text-dark">${appointmentData.horario}</strong></div>
            <div class="col-12 border-top pt-2"><small class="text-muted d-block">PACIENTE ANIMAL</small> <strong class="text-dark"><i class="bi bi-paw-fill text-danger me-1"></i>${nomePet || 'Meu Pet'}</strong></div>
        </div>
    `;
}

function bindInterfaceEvents() {
    document.getElementById('service-select').onchange = (e) => {
        appointmentData.servico_id = e.target.value;
        appointmentData.servico_nome = e.target.options[e.target.selectedIndex].text;
        appointmentData.servico_preco = e.target.options[e.target.selectedIndex].dataset.preco;
        document.getElementById('nextButtonStep1').disabled = false;
    };

    document.getElementById('store-select').onchange = (e) => {
        appointmentData.loja_id = e.target.value;
        appointmentData.loja_nome = e.target.options[e.target.selectedIndex].text;
        document.getElementById('nextButtonStep2').disabled = false;
    };

    document.getElementById('select-pet').onchange = (e) => {
        const fields = document.getElementById('new-pet-fields');
        if (fields) fields.style.display = (e.target.value === 'NEW') ? 'block' : 'none';
        appointmentData.id_pet = (e.target.value === 'NEW') ? null : e.target.value;
    };

    document.getElementById('nextButtonStep1').onclick = () => showStep(2);
    document.getElementById('nextButtonStep2').onclick = () => { renderCalendar(); showStep(3); };
    document.getElementById('nextButtonStep3').onclick = () => showStep(4);
    
    document.getElementById('pet-info-form').onsubmit = (e) => {
        e.preventDefault();
        
        // Se escolheu criar um novo pet, obriga a pôr o nome
        const selectPet = document.getElementById('select-pet');
        if (selectPet && selectPet.value === 'NEW') {
            const nomeInput = document.getElementById('nome_pet').value.trim();
            if (!nomeInput) {
                alert("Por favor, digite o nome do novo pet.");
                return;
            }
        }
        
        showStep(5);
    };

    document.querySelectorAll('.btn-prev').forEach(b => {
        b.onclick = (e) => {
            e.preventDefault();
            showStep(currentStep - 1);
        };
    });

    document.getElementById('prevMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonthButton').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); };

    document.getElementById('confirmButton').onclick = executeFinalBooking;
}

// --- CONFIRMAÇÃO DO AGENDAMENTO E ENVIO AO NEON ---
async function executeFinalBooking() {
    const btn = document.getElementById('confirmButton');
    const selectPet = document.getElementById('select-pet');
    const isNewPet = selectPet ? selectPet.value === 'NEW' : true;
    
    const payload = {
        id_cliente: appointmentData.cliente_id,
        id_loja: appointmentData.loja_id,
        id_servico: appointmentData.servico_id,
        data_hora_inicio: `${appointmentData.data}T${appointmentData.horario}:00`,
        id_pet: isNewPet ? null : appointmentData.id_pet,
        novo_pet: isNewPet ? {
            nome: document.getElementById('nome_pet').value.trim(),
            raca: document.getElementById('raca').value.trim() || 'SRD',
            porte: document.getElementById('porte').value
        } : null,
        observacoes: document.getElementById('observacoes').value.trim()
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processando no Neon...';
        
        const res = await fetch(`${API_BASE_URL}/api/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("✨ Perfeito! O seu agendamento foi gravado com sucesso.");
            // REDIRECIONA PARA A TELA ONDE ELE VE O AGENDAMENTO (perfil.html)
            window.location.href = '../index.html';
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Ops: " + (err.error || "Falha ao registrar horário."));
            btn.disabled = false;
            btn.innerHTML = 'CONFIRMAR AGENDAMENTO <i class="bi bi-send-fill ms-2"></i>';
        }
    } catch (e) {
        alert("Erro de comunicação de rede. Verifique sua internet.");
        btn.disabled = false;
        btn.innerHTML = 'CONFIRMAR AGENDAMENTO <i class="bi bi-send-fill ms-2"></i>';
    }
}