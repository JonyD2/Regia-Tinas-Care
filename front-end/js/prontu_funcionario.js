/**
 * js/prontu_funcionario.js - Cérebro do Prontuário Médico
 * Gere a busca de pets, exibição de histórico e novos registros
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://regia-tinas.onrender.com";

// Estados globais
let petSelecionado = null;
let historicoClinico = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log("🩺 Sistema de Prontuário Juan iniciado...");
    
    // 1. Configura a barra de busca
    const inputBusca = document.querySelector('.search-box input');
    const btnBusca = document.querySelector('.search-box button');

    btnBusca.addEventListener('click', () => buscarPet(inputBusca.value));
    inputBusca.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarPet(inputBusca.value);
    });

    // 2. Configura a lógica visual do formulário (Adicionar/Alterar/Excluir)
    configurarInterfaceModal();
});

// ==========================================
// 1. BUSCA DE PETS E PERFIL
// ==========================================

async function buscarPet(termo) {
    if (!termo) return alert("Juan, digite o nome do pet ou CPF do tutor!");

    try {
        // Buscamos na nossa API de perfis
        const response = await fetch(`${API_BASE_URL}/api/perfis?busca=${termo}`);
        const perfis = await response.json();

        if (perfis.length === 0) {
            alert("Nenhum pet encontrado com esses dados.");
            return;
        }

        // Para este exemplo, pegamos o primeiro resultado
        petSelecionado = perfis[0];
        atualizarCardPerfil(petSelecionado);
        carregarHistoricoMedico(petSelecionado.id_pet || petSelecionado.id);

    } catch (error) {
        console.error("Erro ao buscar pet:", error);
    }
}

function atualizarCardPerfil(p) {
    const card = document.querySelector('.pet-profile-card');
    
    // Nome e Raça
    card.querySelector('h3').innerHTML = `${p.nome_pet || p.nome} <small class="text-muted fs-6">(${p.raca || 'Raça não inf.'})</small>`;
    
    // Detalhes (Tutor, Idade, Peso)
    const detalhes = card.querySelectorAll('.d-flex span');
    detalhes[0].innerHTML = `<i class="bi bi-person me-1"></i>Tutor: ${p.nome_tutor || p.nome_cliente || 'Não informado'}`;
    detalhes[1].innerHTML = `<i class="bi bi-calendar-event me-1"></i>Idade: ${p.idade || '?'} anos`;
    detalhes[2].innerHTML = `<i class="bi bi-speedometer2 me-1"></i>Peso: ${p.peso || '?'}kg`;

    // Imagem
    if (p.url_imagem) {
        card.querySelector('.pet-avatar').src = p.url_imagem;
    }
}

// ==========================================
// 2. HISTÓRICO E LINHA DO TEMPO (TIMELINE)
// ==========================================

async function carregarHistoricoMedico(idPet) {
    const timeline = document.querySelector('.timeline');
    timeline.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-brand-pink"></div></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/pet/historico/${idPet}`);
        historicoClinico = await response.json();

        if (historicoClinico.length === 0) {
            timeline.innerHTML = '<p class="text-muted ps-4">Nenhum histórico médico registrado para este pet.</p>';
            return;
        }

        renderizarTimeline();

    } catch (e) {
        timeline.innerHTML = '<p class="text-danger ps-4">Erro ao carregar histórico.</p>';
    }
}

function renderizarTimeline() {
    const timeline = document.querySelector('.timeline');
    
    timeline.innerHTML = historicoClinico.map(h => `
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="history-card shadow-sm">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge ${getCategoriaStyle(h.categoria)} bg-opacity-10 border">${h.categoria.toUpperCase()}</span>
                    <small class="text-muted fw-bold">${formatarData(h.data_registro)}</small>
                </div>
                <h6 class="fw-bold mb-1">${h.titulo || h.servico}</h6>
                <p class="text-muted small mb-0">${h.descricao || h.observacoes}</p>
                <div class="mt-3 text-end">
                    <small class="fw-bold text-brand-pink">Registrado por: ${h.nome_funcionario || 'Sistema'}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function getCategoriaStyle(cat) {
    const estilos = {
        'Vacina': 'bg-success text-success border-success',
        'Consulta': 'bg-info text-info border-info',
        'Cirurgia': 'bg-danger text-danger border-danger',
        'Exame': 'bg-warning text-warning border-warning'
    };
    return estilos[cat] || 'bg-secondary text-secondary border-secondary';
}

// ==========================================
// 3. PROCESSAR NOVO REGISTRO (INTEGRAÇÃO CPF)
// ==========================================

function configurarInterfaceModal() {
    const radios = document.querySelectorAll('input[name="tipo_prontu"]');
    const btnAvancar = document.querySelector('#modalGerenciarProntuario .btn-primary');

    radios.forEach(r => {
        r.addEventListener('change', (e) => {
            if (e.target.value === 'cancelar') {
                btnAvancar.className = "btn btn-danger btn-lg rounded-pill fw-bold";
                btnAvancar.innerText = "CONFIRMAR EXCLUSÃO E ASSINAR";
            } else {
                btnAvancar.className = "btn btn-primary btn-lg rounded-pill fw-bold";
                btnAvancar.innerText = "AVANÇAR PARA ASSINATURA";
            }
        });
    });
}

// Esta função é chamada pelo HTML após o sucesso do CPF
window.finalizarRegistroProntuario = async (idFuncionario) => {
    if (!petSelecionado) return alert("Selecione um pet primeiro!");

    const acao = document.querySelector('input[name="tipo_prontu"]:checked').value;
    
    const dados = {
        id_pet: petSelecionado.id_pet || petSelecionado.id,
        id_funcionario: idFuncionario,
        categoria: document.getElementById('reg-categoria').value,
        descricao: document.querySelector('#form-prontuario textarea').value,
        tipo_acao: acao
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/pet/historico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (res.ok) {
            alert(`✅ Juan, registro de ${acao} salvo com sucesso!`);
            bootstrap.Modal.getInstance(document.getElementById('modalGerenciarProntuario')).hide();
            carregarHistoricoMedico(dados.id_pet); // Atualiza a timeline
        }
    } catch (e) {
        alert("Erro ao conectar com o banco Neon.");
    }
};

// Auxiliares
function formatarData(dataISO) {
    const d = new Date(dataISO);
    return d.toLocaleDateString('pt-BR') + ' - ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}