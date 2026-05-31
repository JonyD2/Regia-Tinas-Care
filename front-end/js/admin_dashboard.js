/**
 * js/admin_dashboard.js - O Painel de Comando Master
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

document.addEventListener("DOMContentLoaded", async () => {
    const userRole = localStorage.getItem('usuario_role');
    if (userRole !== 'admin') {
        window.location.href = '../usuario/login.html';
        return;
    }

    atualizarBoasVindas();
    carregarDadosDashboard();
    
    document.getElementById('logout-button')?.addEventListener('click', () => {
        if (confirm('Encerrar sessão master?')) {
            localStorage.clear();
            window.location.href = '../usuario/login.html';
        }
    });
});

function atualizarBoasVindas() {
    const nome = localStorage.getItem('usuario_nome');
    const display = document.querySelector('h2.fw-bold');
    if (display && nome) display.innerHTML = `Olá, ${nome.split(' ')[0]} 🚀`;
}

async function carregarDadosDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard-completo`);
        const dados = await response.json();

        // Atualiza KPIs
        document.getElementById('kpi-vendas').innerText = `R$ ${dados.stats.faturamento.toFixed(2)}`;
        document.getElementById('kpi-agendamentos').innerText = String(dados.stats.total_agendamentos).padStart(2, '0');
        document.getElementById('kpi-pets').innerText = String(dados.stats.total_pets).padStart(2, '0');
        document.getElementById('kpi-clientes').innerText = String(dados.stats.total_clientes).padStart(2, '0');

        renderizarEstoqueCritico(dados.estoque_critico);
        inicializarGraficos(); // Chama a nova função de gráficos

    } catch (err) { console.error("Erro dashboard:", err); }
}

function inicializarGraficos() {
    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    // Gráfico 1: Receitas (Verde)
    new Chart(document.getElementById('chartReceita').getContext('2d'), {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Receitas', data: [1200, 1900, 1500, 2200, 2800, 3500, 4000], borderColor: '#198754', backgroundColor: 'rgba(25, 135, 84, 0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // Gráfico 2: Despesas (Vermelho)
    new Chart(document.getElementById('chartDespesas').getContext('2d'), {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Despesas', data: [500, 800, 600, 1000, 1200, 1500, 1300], borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // Gráfico 3: Lucro (Azul)
    new Chart(document.getElementById('chartLucro').getContext('2d'), {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Lucro', data: [700, 1100, 900, 1200, 1600, 2000, 2700], borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function renderizarEstoqueCritico(produtos) {
    const container = document.getElementById('lista-estoque-critico');
    if (!container || !produtos) return;
    container.innerHTML = produtos.map(p => `
        <li class="mb-2"><i class="bi bi-dot text-danger"></i> ${p.nome_produto} (Restam: ${p.quantidade_estoque})</li>
    `).join('');
}