// ========================================================
// HOME.JS - CÉREBRO INTEGRADO (Login + Vitrines + UI)
// ========================================================

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    console.log("O HTML foi carregado, iniciando o sistema...");
    
    // 1. Verificações de login
    verificarEstadoLogin(); 
    
    // 2. Inicialização da interface
    setupSidebar();
    setupMediaSliders();
    setupBeforeAfterSlider();
    setupVideoPlayers();
    
    // 3. Carregamento de dados (Vitrines)
    loadProducts('ofertas-track', 'ofertas');
    loadProducts('recomendados-track', 'recomendados');
    loadProducts('novidades-track', 'novidades');
    loadProducts('mais-vendidos-track', 'vendidos');
    
    console.log("Sistema Regia & Tinas Care operacional! 🐾🚀");
});

// --- FUNÇÕES DE APOIO ---

function verificarEstadoLogin() {
    const userId = localStorage.getItem('usuario_id');
    const userName = localStorage.getItem('usuario_nome');
    const loginButton = document.getElementById('btn-login-header');

    if (loginButton && userId) {
        const primeiroNome = userName ? userName.split(' ')[0] : 'Conta';
        loginButton.innerHTML = `<i class="bi bi-person-check-fill me-1"></i> Olá, ${primeiroNome}`;
        loginButton.href = 'usuario/perfil.html'; 
        loginButton.style.fontWeight = '600';
    }
}

function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const openButton = document.getElementById('button-menu');
    const closeButton = document.getElementById('close-sidebar');

    if (!sidebar || !overlay || !openButton || !closeButton) return;

    openButton.onclick = () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    };

    const close = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    closeButton.onclick = close;
    overlay.onclick = close;
}

function setupMediaSliders() {
    const setupSlider = (trackId, prevId, nextId) => {
        const track = document.getElementById(trackId);
        const prev = document.getElementById(prevId);
        const next = document.getElementById(nextId);

        if (track && prev && next) {
            next.onclick = () => track.scrollBy({ left: 300, behavior: 'smooth' });
            prev.onclick = () => track.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };
    setupSlider('videos-track', 'videos-prev', 'videos-next');
    setupSlider('ofertas-track', 'ofertas-prev', 'ofertas-next');
    setupSlider('recomendados-track', 'recomendados-prev', 'recomendados-next');
    setupSlider('mais-vendidos-track', 'mais-vendidos-prev', 'mais-vendidos-next');
    setupSlider('novidades-track', 'novidades-prev', 'novidades-next');
}

function createProductCard(produto) {
    const id = produto.id_produto || produto.id;
    const displayPrice = parseFloat(produto.preco_promocional) || parseFloat(produto.preco) || 0;
    
    return `
        <div class="card h-100 product-card shadow-sm mx-2" style="min-width: 220px; max-width: 250px;">
            <a href="busca.html?id=${id}"><img src="${produto.url_imagem || 'img/logo_pequena4.png'}" class="card-img-top" style="height: 180px; object-fit: contain;" onerror="this.src='img/logo_pequena4.png'"></a>
            <div class="card-body text-center">
                <h6 class="fw-bold">${produto.nome_produto || 'Produto'}</h6>
                <p class="text-brand fw-bold">R$ ${displayPrice.toFixed(2).replace('.', ',')}</p>
                <a href="busca.html?id=${id}" class="btn w-100 text-white rounded-pill" style="background-color: #FE8697;">Ver Lojas</a>
            </div>
        </div>
    `;
}

// --- 3. CARREGAMENTO E FILTRO DOS CARDS (HOME) ---
async function loadProducts(containerId, filterType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        const allProducts = await response.json();
        
        let produtosFiltrados = [];

        // LÓGICA DE FILTRAGEM (A Mágica acontece aqui!)
        switch (filterType) {
            case 'ofertas':
                // Mostra apenas produtos que têm preço promocional menor que o preço original
                produtosFiltrados = allProducts.filter(p => 
                    p.preco_promocional && parseFloat(p.preco_promocional) < parseFloat(p.preco)
                );
                break;
            case 'recomendados':
                // Exemplo: Mostra produtos de uma categoria específica ou mistura tudo
                // Aqui estou pegando os últimos produtos como exemplo
                produtosFiltrados = allProducts.slice(-6); 
                break;
            case 'novidades':
                // Exemplo: Pode filtrar por ID maior (produtos adicionados recentemente)
                produtosFiltrados = allProducts.reverse().slice(0, 6);
                break;
            case 'vendidos':
                // Exemplo: Filtra pela categoria 'Ração' ou pega os 6 primeiros
                produtosFiltrados = allProducts.slice(0, 6);
                break;
            default:
                produtosFiltrados = allProducts;
        }

        // Se não houver produtos para o filtro, mostra uma mensagem
        if (produtosFiltrados.length === 0) {
             container.innerHTML = '<p class="text-muted w-100 text-center">Nenhum produto nesta categoria.</p>';
             return;
        }

        container.classList.add('d-flex', 'flex-nowrap');
        // Usamos map para criar os cards apenas dos produtos filtrados
        container.innerHTML = produtosFiltrados.map(createProductCard).join('');
        
    } catch (e) { 
        console.error("Erro ao carregar produtos:", e); 
        container.innerHTML = '<p class="text-muted w-100 text-center">Tente novamente mais tarde.</p>';
    }
}

function setupBeforeAfterSlider() {
    const slider = document.getElementById('slider-range');
    const beforeImg = document.getElementById('before-img');
    const handle = document.getElementById('handle');

    if (!slider || !beforeImg || !handle) return;

    slider.addEventListener('input', (e) => {
        const val = e.target.value; // Valor de 0 a 100
        
        // 1. O clip-path corta a imagem. 
        // 100 - val inverte o movimento para a máscara funcionar da esquerda para direita
        const rightOffset = 100 - val;
        beforeImg.style.clipPath = `inset(0 ${rightOffset}% 0 0)`;
        
        // 2. Move a linha divisória (handle)
        handle.style.left = `${val}%`;
    });
}
// Função para controlar os vídeos
function setupVideoPlayers() {
    const videoCards = document.querySelectorAll('.video-card');

    videoCards.forEach(card => {
        const video = card.querySelector('video');
        const playBtn = card.querySelector('.play-button');

        playBtn.onclick = () => {
            if (video.paused) {
                video.play();
                playBtn.innerHTML = '<i class="bi bi-pause-circle-fill"></i>'; // Muda ícone
            } else {
                video.pause();
                playBtn.innerHTML = '<i class="bi bi-play-circle-fill"></i>'; // Volta ícone
            }
        };

        // Pausa automaticamente se o vídeo acabar
        video.onended = () => {
            playBtn.innerHTML = '<i class="bi bi-play-circle-fill"></i>';
        };
    });
}