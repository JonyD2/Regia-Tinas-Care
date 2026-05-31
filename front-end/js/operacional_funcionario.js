/**
 * js/operacional_funcionario.js - Lógica da Fila de Trabalho
 * Gerencia o Kanban, o Formulário de Ações e a Validação por CPF
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://regia-tinas.onrender.com";

// Estado Global da Tela
let atendimentosHoje = [];
let acaoSelecionada = 'adicionar'; 

document.addEventListener('DOMContentLoaded', () => {
    console.log("🛠️ Sistema de Fila Juan iniciado...");
    
    // 1. Inicializa os Listeners do Formulário
    configurarListenersFormulario();
    
    // 2. Busca os dados reais do Banco Neon
    carregarFilaDoBanco();
});

// ==========================================
// 1. GERENCIAMENTO DO FORMULÁRIO (MODAL)
// ==========================================

function configurarListenersFormulario() {
    const radioButtons = document.querySelectorAll('input[name="tipo_acao"]');
    const formCampos = document.getElementById('campos-form');
    const btnAvancar = document.querySelector('#modalAcaoRapida .btn-primary');

    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            acaoSelecionada = e.target.value;
            atualizarInterfaceForm(acaoSelecionada, formCampos, btnAvancar);
        });
    });
}

function atualizarInterfaceForm(acao, container, botao) {
    // Juan, aqui a gente muda o visual do formulário dependendo do que o cara quer fazer
    if (acao === 'cancelar') {
        container.style.opacity = '0.5';
        container.style.pointerEvents = 'none'; // Trava os campos
        botao.className = "btn btn-danger btn-lg rounded-pill fw-bold";
        botao.innerText = "CONFIRMAR CANCELAMENTO E VALIDAR CPF";
    } else if (acao === 'alterar') {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
        botao.className = "btn btn-warning btn-lg rounded-pill fw-bold";
        botao.innerText = "SALVAR ALTERAÇÕES E VALIDAR CPF";
    } else {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
        botao.className = "btn btn-primary btn-lg rounded-pill fw-bold";
        botao.innerText = "AVANÇAR E VALIDAR CPF";
    }
}

// ==========================================
// 2. COMUNICAÇÃO COM O BANCO (API)
// ==========================================

async function carregarFilaDoBanco() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamentos`);
        const dados = await response.json();
        
        // Filtramos apenas o que é para HOJE e que não foi finalizado/cancelado
        atendimentosHoje = dados.filter(a => a.status !== 'concluido' && a.status !== 'cancelado');
        
        renderizarKanban();
    } catch (error) {
        console.error("Erro ao carregar fila:", error);
    }
}


// ==========================================
// 3. RENDERIZAÇÃO DO KANBAN (DINÂMICO)
// ==========================================

function renderizarKanban() {
    const colAguardando = document.getElementById('col-aguardando');
    const colAndamento = document.getElementById('col-andamento');
    const colSaida = document.getElementById('col-concluido');

    // Limpa as colunas antes de desenhar
    colAguardando.innerHTML = '';
    colAndamento.innerHTML = '';
    colSaida.innerHTML = '';

    atendimentosHoje.forEach(atend => {
        const card = criarCardHTML(atend);
        
        if (atend.status === 'aguardando' || atend.status === 'pendente') {
            colAguardando.appendChild(card);
        } else if (atend.status === 'em_andamento') {
            colAndamento.appendChild(card);
        } else if (atend.status === 'pronto') {
            colSaida.appendChild(card);
        }
    });
}

function criarCardHTML(a) {
    const div = document.createElement('div');
    div.className = 'task-card';
    
    // Ajusta a cor da borda dependendo do status
    if (a.status === 'em_andamento') div.style.borderLeftColor = '#0d6efd';
    if (a.status === 'pronto') div.style.borderLeftColor = '#198754';

    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <span class="pet-name">${a.nome_pet}</span>
            <span class="service-badge">${a.nome_servico}</span>
        </div>
        <small class="tutor-name">${a.nome_cliente}</small>
        <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="small fw-bold text-muted">
                <i class="bi bi-clock me-1"></i>${extrairHora(a.data_hora_inicio)}
            </span>
            ${renderizarBotaoAcao(a)}
        </div>
    `;
    return div;
}

function renderizarBotaoAcao(a) {
    if (a.status === 'aguardando' || a.status === 'pendente') {
        return `<button class="btn btn-dark btn-sm rounded-pill px-3 fw-bold" onclick="solicitarAssinatura((id) => mudarStatus('${a.id_agendamento}', 'em_andamento', id))">INICIAR</button>`;
    }
    if (a.status === 'em_andamento') {
        return `<button class="btn btn-success btn-sm rounded-pill px-3 fw-bold" onclick="solicitarAssinatura((id) => mudarStatus('${a.id_agendamento}', 'pronto', id))">CONCLUIR</button>`;
    }
    return `<button class="btn btn-outline-success btn-sm rounded-pill"><i class="bi bi-whatsapp"></i></button>`;
}

// ==========================================
// 4. MOVIMENTAÇÃO DE STATUS
// ==========================================

async function mudarStatus(id, novoStatus, idFuncionario) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/agendamentos/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_agendamento: id,
                novo_status: novoStatus,
                id_funcionario_acao: idFuncionario // Log de quem moveu o card
            })
        });

        if (res.ok) carregarFilaDoBanco();
    } catch (e) { console.error("Erro ao mover card"); }
}

function extrairHora(dataISO) {
    const d = new Date(dataISO);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}