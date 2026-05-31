// js/busca.js
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

let todosOsProdutos = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Sistema de Busca inicializando...");

    // 1. Inicializa Geolocalização (se existir)
    if (typeof inicializarGeolocalizador === 'function') {
        try {
            await inicializarGeolocalizador();
        } catch (e) {
            console.warn("Geolocalização não pôde ser carregada, usando padrão.");
        }
    }

    // 2. Configura eventos de filtro (apenas se os elementos existirem na página)
    const priceRange = document.getElementById('price-range');
    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            const val = document.getElementById('price-value');
            if (val) val.textContent = `R$ ${e.target.value}`;
            aplicarFiltros();
        });
    }

    // 3. Carrega os produtos
    await loadProducts('search-results');
});

// 1. CARREGAMENTO DOS PRODUTOS
async function loadProducts(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border" style="color: var(--brand-pink);" role="status"></div><p>Buscando produtos...</p></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        
        const allProducts = await response.json();
        todosOsProdutos = allProducts; 
        
        renderizarVitrine(allProducts);
    } catch (e) { 
        console.error("❌ Erro ao carregar produtos:", e); 
        container.innerHTML = `<div class="col-12 text-center text-danger py-5">Erro ao comunicar com o servidor.</div>`;
    }
}

// 2. RENDERIZAÇÃO DA VITRINE
function renderizarVitrine(produtos) {
    const container = document.getElementById('search-results');
    const resultsCount = document.getElementById('results-count');
    
    if (resultsCount) resultsCount.textContent = `${produtos.length} produto(s) no catálogo`;

    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                <h5 class="mt-3 fw-bold text-muted">Nenhum produto encontrado.</h5>
            </div>`;
        return;
    }

    container.innerHTML = produtos.map(p => `
        <div class="col">
            <div class="product-card shadow-sm border position-relative">
                <div onclick="abrirModalProduto(${p.id_produto})" style="cursor: pointer;">
                    <div class="img-container">
                        <img src="${p.url_imagem || 'img/logo_pequena4.png'}" alt="${p.nome_produto}" class="product-img" onerror="this.src='img/logo_pequena4.png'">
                    </div>
                    <div class="card-body border-top">
                        <span class="badge bg-light text-secondary mb-2">${p.categoria || 'Geral'}</span>
                        <h6 class="fw-bold text-dark mb-1 text-truncate">${p.nome_produto}</h6>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="price-tag fw-bold" style="color: var(--brand-pink);">
                                R$ ${parseFloat(p.preco || 0).toFixed(2).replace('.', ',')}
                            </span>
                            <span class="badge bg-dark text-white rounded-pill"><i class="bi bi-geo-alt"></i> Lojas</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// 3. FILTROS
function aplicarFiltros() {
    const categoriasSelecionadas = Array.from(document.querySelectorAll('.filtro-categoria:checked')).map(cb => cb.value);
    const marcasSelecionadas = Array.from(document.querySelectorAll('.filtro-marca:checked')).map(cb => cb.value);
    const precoMaximo = document.getElementById('price-range') ? parseFloat(document.getElementById('price-range').value) : Infinity;

    const produtosFiltrados = todosOsProdutos.filter(p => {
        const preco = parseFloat(p.preco) || 0;
        const passaCategoria = categoriasSelecionadas.length === 0 || categoriasSelecionadas.includes(p.categoria);
        const passaMarca = marcasSelecionadas.length === 0 || marcasSelecionadas.includes(p.marca);
        const passaPreco = preco <= precoMaximo;
        return passaCategoria && passaMarca && passaPreco;
    });
    renderizarVitrine(produtosFiltrados);
}

// 4. MODAL
window.abrirModalProduto = async function(idProduto) {
    produtoAtualModal = todosOsProdutos.find(p => p.id_produto === idProduto);
    if (!produtoAtualModal) return;

    document.getElementById('modal-img').src = produtoAtualModal.url_imagem || 'img/logo_pequena4.png';
    document.getElementById('modal-nome').textContent = produtoAtualModal.nome_produto;
    document.getElementById('modal-preco-box').textContent = `R$ ${parseFloat(produtoAtualModal.preco || 0).toFixed(2).replace('.', ',')}`;
    
    const modal = new bootstrap.Modal(document.getElementById('modalProduto'));
    modal.show();
    
    if (typeof verificarEstoque === 'function') verificarEstoque(idProduto);
};