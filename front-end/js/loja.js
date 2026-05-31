/**
 * js/loja.js - Gerenciador de Unidades Físicas (Regia & Tinas Care)
 * Conectado 100% em tempo real com as tabelas do banco de dados Neon.
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

// 1. Como o script é type="module", chamamos a função diretamente!
// Isso impede o erro de perder o tempo de carregamento da página.
carregarLojasDoBanco();

async function carregarLojasDoBanco() {
    const container = document.getElementById('lista-unidades');
    if (!container) return;

    try {
        // Puxa em tempo real do banco de dados Neon através da sua rota Python
        const response = await fetch(`${API_BASE_URL}/api/lojas`);
        
        if (!response.ok) throw new Error("Falha ao consultar a API de lojas");
        
        const lojas = await response.json();
        const listaLojas = Array.isArray(lojas) ? lojas : [];

        if (listaLojas.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center p-5 text-muted bg-white rounded-4 shadow-sm border">
                    <i class="bi bi-info-circle fs-3 text-secondary mb-2 d-block"></i>
                    <p class="mb-0 fw-medium">Nenhuma unidade física foi localizada no banco Neon.</p>
                </div>`;
            return;
        }

        // Renderiza a estrutura premium dinâmica usando as colunas exatas do seu banco
        container.innerHTML = listaLojas.map(l => {
            const nome = l.nome_loja || 'Unidade Care';
            const endereco = l.endereco || 'Endereço não informado';
            const fone = l.telefone || '(11) 99999-9999';
            
            // CORREÇÃO 1: Forçando todas as lojas a usarem a mesma imagem padrão
            const imgUrl = '../img/loja7.png';

            // CORREÇÃO 2: Ajuste da URL do Google Maps para o formato correto de busca
            const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(endereco)}`;

            return `
                <div class="col-md-6 col-lg-4">
                    <div class="store-card shadow-sm p-0">
                        <div class="store-img-container">
                            <span class="store-badge border bg-white fw-bold">Unidade Integrada</span>
                            <img src="${imgUrl}" class="store-img" alt="Unidade ${nome}" onerror="this.src='../img/logo_pequena4.png'; this.style.padding='40px';">
                        </div>
                        <div class="info-unidade p-4">
                            <div class="mb-3">
                                <h4 class="fw-bold text-dark mb-1">Unidade ${nome}</h4>
                                <p class="text-muted small mb-3"><i class="bi bi-telephone-fill text-brand me-2"></i>Contatos: ${fone}</p>
                                
                                <a href="${mapsUrl}" target="_blank" class="address-box shadow-sm" title="Clique para abrir no Google Maps">
                                    <div class="d-flex align-items-start">
                                        <i class="bi bi-geo-alt-fill text-danger fs-5 me-3 mt-1"></i>
                                        <div>
                                            <strong class="text-dark d-block small mb-1 text-uppercase">Endereço de Retirada:</strong>
                                            <span class="small text-secondary" style="line-height: 1.4;">${endereco}</span>
                                        </div>
                                    </div>
                                </a>
                            </div>
                            
                            <div class="pt-2">
                                <a href="https://wa.me/55${fone.replace(/\D/g,'')}" target="_blank" class="btn-whatsapp rounded-pill shadow-sm">
                                    <i class="bi bi-whatsapp"></i> Falar no Balcão
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Erro crítico na API de lojas:", error);
        container.innerHTML = `
            <div class="col-12 text-center p-4 text-danger small">
                <i class="bi bi-exclamation-triangle fs-4 mb-2 d-block"></i>
                Erro de comunicação. Se estiver acessando pelo Render, ele pode estar "dormindo". Recarregue a página!
            </div>`;
    }
}