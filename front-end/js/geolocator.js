// js/geolocator.js - Geolocalização Regia & Tinas Care

// 1. CONFIGURAÇÃO DA URL CENTRALIZADA
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

export const REGIA_TINAS_SELECTED_STORE_KEY = 'regia_tinas_selected_store';

// 2. FUNÇÃO HAVERSINE (Cálculo matemático de distância no globo terrestre)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 3. BUSCAR LOJAS REAIS DA API PÚBLICA
async function getUnidadesDoBanco() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/lojas`);
        if (!response.ok) throw new Error("Erro na API");
        return await response.json();
    } catch (error) {
        console.error("Erro ao carregar unidades para geolocalização:", error);
        return [];
    }
}

// 4. DEFINIR LOJA SELECIONADA E EXIBIR NA TELA
function setSelectedStore(storeId, storeName, distance = null) {
    const locationSpan = document.getElementById('unidade-proxima');
    
    localStorage.setItem(REGIA_TINAS_SELECTED_STORE_KEY, JSON.stringify({ id: storeId, name: storeName }));
    
    let display = `<i class="bi bi-geo-alt-fill text-danger me-1"></i> Você está vendo o estoque da unidade: <strong>${storeName}</strong>`;
    if (distance !== null) {
        display += ` <small class="text-muted">(a ${distance.toFixed(1)} km de você)</small>`;
    }

    if (locationSpan) locationSpan.innerHTML = display;
    
    // CORREÇÃO: Nome do evento exato que o home.js está escutando
    window.dispatchEvent(new Event('regiaTinasStoreChanged'));
}

// 5. ENCONTRAR A LOJA MAIS PRÓXIMA DO USUÁRIO
async function findNearestStore(userLat, userLon) {
    const unidades = await getUnidadesDoBanco();
    let nearestStore = null;
    let minDistance = Infinity;

    unidades.forEach(store => {
        // Verifica se a loja tem latitude e longitude cadastradas no banco Neon
        if (store.latitude && store.longitude) {
            const dist = getDistance(userLat, userLon, parseFloat(store.latitude), parseFloat(store.longitude));
            if (dist < minDistance) {
                minDistance = dist;
                nearestStore = store;
            }
        }
    });

    if (nearestStore) {
        setSelectedStore(nearestStore.id_loja || nearestStore.id, nearestStore.nome_loja, minDistance);
    } else {
        // Se nenhuma loja tiver coordenada cadastrada, joga para a matriz
        setSelectedStore(1, "São Caetano do Sul (Matriz)");
    }
}

// 6. INICIALIZAÇÃO DA GEOLOCALIZAÇÃO
export function initGeolocation() {
    const locationSpan = document.getElementById('unidade-proxima');

    // Se já calculou antes e salvou no navegador, não precisa pedir o GPS de novo
    const saved = localStorage.getItem(REGIA_TINAS_SELECTED_STORE_KEY);
    if (saved) {
        const { id, name } = JSON.parse(saved);
        setSelectedStore(id, name);
        return;
    }

    // Pede permissão de GPS para o usuário
    if (navigator.geolocation) {
        if (locationSpan) locationSpan.innerHTML = '<span class="spinner-border spinner-border-sm text-danger" role="status"></span> Localizando a loja mais próxima...';
        
        navigator.geolocation.getCurrentPosition(
            (pos) => findNearestStore(pos.coords.latitude, pos.coords.longitude),
            () => setSelectedStore(1, "São Caetano do Sul (Matriz)"), // Fallback caso o usuário clique em "Bloquear GPS"
            { timeout: 5000 }
        );
    } else {
        setSelectedStore(1, "São Caetano do Sul (Matriz)");
    }
}

// Inicia automaticamente quando a página carregar
document.addEventListener('DOMContentLoaded', initGeolocation);