/**
 * js/dash_funcionario.js - Cérebro do Painel Operacional
 * Gerencia KPIs, Fila de Hoje, Estoque e Segurança por CPF
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

// Estados Globais
let acaoPendente = null; 
let modalAssinatura = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("🛠️ Inicializando Painel do Funcionário...");
    
    // 1. Configurações Iniciais de Interface
    inicializarInterface();
    
    // 2. Carrega os Dados do Banco Neon
    carregarResumoDoDia();
    carregarListaEstoque();

    // 3. Configura o Logout
    const btnSair = document.getElementById('logout-button');
    if (btnSair) btnSair.onclick = encerrarTurno;
});

// ==========================================
// 1. INTERFACE E IDENTIDADE
// ==========================================

function inicializarInterface() {
    // Nome do Funcionário (Vem do Login)
    const nome = localStorage.getItem('usuario_nome') || "Equipe";
    const nomeDisplay = document.getElementById('nome-funcionario');
    if (nomeDisplay) nomeDisplay.innerText = nome;

    // Data Atual formatada
    const dataSpan = document.getElementById('data-atual');
    if (dataSpan) {
        const hoje = new Date();
        dataSpan.textContent = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // Máscara de CPF no Modal de Segurança
    const inputCpf = document.getElementById('input-cpf-funcionario');
    if (inputCpf) {
        inputCpf.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); 
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }

    // Listener do Botão de Confirmação do CPF
    const btnConfirmar = document.getElementById('btn-confirmar-acao');
    if (btnConfirmar) btnConfirmar.onclick = validarCpfESalvar;
}

// ==========================================
// 2. FILA E KPIs (BANCO NEON)
// ==========================================

async function carregarResumoDoDia() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/agendamentos`);
        const agendamentos = await response.json();

        // Filtramos apenas o que é para HOJE (ou pendente)
        const pendentes = agendamentos.filter(a => a.status === 'pendente' || a.status === 'aguardando');
        const emAndamento = agendamentos.filter(a => a.status === 'em_andamento' || a.status === 'em_curso');
        const concluidos = agendamentos.filter(a => a.status === 'concluido' || a.status === 'pronto');

        // Atualiza os números (KPIs)
        document.getElementById('kpi-atendimentos').innerText = pendentes.length;
        document.getElementById('kpi-em-andamento').innerText = emAndamento.length;
        document.getElementById('kpi-concluidos').innerText = concluidos.length;

        // Renderiza a Tabela de Próximos
        renderizarTabelaFila([...pendentes, ...emAndamento].slice(0, 5));

    } catch (error) {
        console.error("Erro ao carregar resumo:", error);
    }
}

function renderizarTabelaFila(lista) {
    const tbody = document.getElementById('tabela-fila-trabalho');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Nenhum atendimento para agora.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(a => `
        <tr>
            <td class="fw-bold text-secondary">${extrairHora(a.data_hora_inicio)}</td>
            <td>
                <div class="fw-bold text-dark">${a.nome_pet}</div>
                <small class="text-muted">${a.nome_cliente}</small>
            </td>
            <td>
                <span class="status-pill ${a.status === 'pendente' ? 'bg-status-waiting' : 'bg-status-active'}">
                    ${a.status === 'pendente' ? 'Aguardando' : 'Em Curso'}
                </span>
            </td>
        </tr>
    `).join('');
}

// ==========================================
// 3. ESTOQUE E CONSUMO
// ==========================================

async function carregarListaEstoque() {
    const select = document.getElementById('select-produto-estoque');
    if (!select) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const produtos = await response.json();

        select.innerHTML = '<option value="">Selecione o material...</option>' + 
            produtos.map(p => `<option value="${p.id_produto || p.id}">${p.nome_produto} (${p.quantidade_estoque} un)</option>`).join('');
    } catch (e) {
        select.innerHTML = '<option>Erro ao carregar estoque</option>';
    }
}

// ==========================================
// 4. O ESCUDO DE CPF (SEGURANÇA)
// ==========================================

window.solicitarAssinatura = (callback) => {
    acaoPendente = callback;
    
    // Limpa o modal
    document.getElementById('input-cpf-funcionario').value = '';
    document.getElementById('erro-validacao').style.display = 'none';

    // Fecha modais de formulário se existirem
    const mEstoque = bootstrap.Modal.getInstance(document.getElementById('modalEstoque'));
    if(mEstoque) mEstoque.hide();

    modalAssinatura = new bootstrap.Modal(document.getElementById('modalAssinaturaFuncionario'));
    modalAssinatura.show();
};

async function validarCpfESalvar() {
    const cpf = document.getElementById('input-cpf-funcionario').value;
    const btn = document.getElementById('btn-confirmar-acao');
    const erro = document.getElementById('erro-validacao');

    if (cpf.length < 14) {
        erro.innerText = "Digite o CPF completo!";
        erro.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> VALIDANDO...';

    try {
        // Juan, aqui conectamos com a tua tabela de PERFIS para ver se o CPF existe e é funcionário
        const res = await fetch(`${API_BASE_URL}/api/auth/validar-cpf`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') })
        });

        const data = await res.json();

        if (res.ok && data.autorizado) {
            modalAssinatura.hide();
            // Executa a ação que estava esperando (ex: processarBaixaEstoque)
            if (acaoPendente) acaoPendente(data.id_funcionario);
        } else {
            throw new Error("CPF não autorizado.");
        }

    } catch (e) {
        erro.style.display = 'block';
        erro.innerText = "Acesso Negado: CPF não reconhecido.";
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'CONFIRMAR AÇÃO';
    }
}

// ==========================================
// 5. PROCESSAMENTO DE BAIXA
// ==========================================

window.processarBaixaEstoque = async (idFuncionario) => {
    const prodId = document.getElementById('select-produto-estoque').value;
    const qtd = document.getElementById('qtd-consumo').value;

    const dados = {
        id_produto: prodId,
        quantidade: qtd,
        id_funcionario: idFuncionario // Rastreabilidade total Juan!
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/estoque/consumo`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(dados)
        });

        if (res.ok) {
            alert("✅ Sucesso! Baixa no estoque realizada e assinada digitalmente.");
            carregarResumoDoDia(); // Atualiza KPIs
            carregarListaEstoque(); // Atualiza lista
        }
    } catch (e) {
        alert("Erro ao salvar no Neon.");
    }
};

// ==========================================
// UTILITÁRIOS
// ==========================================

function extrairHora(dataISO) {
    if (!dataISO) return "--:--";
    const d = new Date(dataISO);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function encerrarTurno() {
    if(confirm("Juan, deseja realmente encerrar o turno e sair?")) {
        localStorage.clear();
        window.location.href = '../auth/login.html';
    }
}