/**
 * js/meus_pets.js - Gerenciamento de Pets do Cliente (Portal do Tutor)
 * Totalmente integrado com o banco Neon + Design premium unificado
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    const clienteId = localStorage.getItem('usuario_id');
    
    // Proteção de rota do lado do cliente
    if (!clienteId) {
        window.location.href = 'login.html';
        return;
    }

    // ==========================================
    // ENCERRAMENTO DE SESSÃO (LOGOUT)
    // ==========================================
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Deseja realmente sair da sua conta?')) {
                localStorage.clear(); // Limpa a memória do ID
                sessionStorage.clear();
                window.location.href = '../index.html'; // Manda de volta pra loja desconectado
            }
        });
    }

    // Carrega os pets inicialmente assim que a página abre
    await carregarPets(clienteId);

    // ==========================================
    // ESCUTA O ENVIO DO FORMULÁRIO DE CADASTRO
    // ==========================================
    const form = document.getElementById('formCadastroPet');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSalvar = form.querySelector('button[type="submit"]');
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Salvando no Neon...';

            const novoPet = {
                id_tutor: clienteId,
                nome_pet: document.getElementById('nome_pet').value.trim(),
                especie: document.getElementById('especie').value,
                raca: document.getElementById('raca').value.trim() || 'SDR',
                porte: document.getElementById('porte').value,
                observacoes: document.getElementById('observacoes').value.trim()
            };

            try {
                const res = await fetch(`${API_BASE_URL}/api/pets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoPet)
                });

                if (res.ok) {
                    alert(`🐾 ${novoPet.nome_pet} foi cadastrado com sucesso!`);
                    
                    const modalEl = document.getElementById('petModal');
                    if (modalEl) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        modalInstance.hide();
                    }
                    
                    form.reset();
                    await carregarPets(clienteId); 
                } else {
                    const errData = await res.json().catch(() => null);
                    alert(`Ops: ${errData?.error || "Erro ao cadastrar pet. Verifique os dados fornecidos."}`);
                }
            } catch (error) {
                console.error("Erro na conexão com a API:", error);
                alert("Erro de conexão com o servidor.");
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.innerText = 'Salvar Pet';
            }
        });
    }
});

// ==========================================
// BUSCA E RENDERIZAÇÃO DOS CARDS DE PETS
// ==========================================
async function carregarPets(id) {
    const container = document.getElementById('lista-pets');
    if (!container) return;

    container.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-secondary" role="status"></div><p class="text-muted small mt-2">Buscando seus amiguinhos...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/pets/usuario/${id}`);
        if (!response.ok) throw new Error("Erro ao buscar dados");
        
        const pets = await response.json();
        const listaPets = Array.isArray(pets) ? pets : [];

        if (listaPets.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-patch-question fs-1 text-muted"></i>
                    <p class="text-muted mt-3">Você ainda não cadastrou nenhum pet.<br>Adicione o seu primeiro amiguinho no botão acima!</p>
                </div>`;
            return;
        }

        container.innerHTML = listaPets.map(pet => {
            const idPet = pet.id_pet || pet.id;
            const nome = pet.nome_pet || 'Meu Pet';
            const raca = pet.raca || 'SDR (Sem Raça Definida)';
            const porte = pet.porte || 'Não Informado';
            const especie = pet.especie || 'Cão';
            const obs = pet.observacoes || pet.observacoes_cliente || 'Nenhuma restrição ou observação informada.';

            return `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card pet-card h-100 shadow-sm border-0 rounded-4 bg-white p-2">
                        <div class="card-body p-4 d-flex flex-column h-100">
                            <div class="d-flex align-items-center mb-3">
                                <div class="text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 50px; height: 50px; background-color: #FE8697;">
                                    <i class="bi bi-paw-fill fs-4"></i>
                                </div>
                                <div class="ms-3">
                                    <h5 class="fw-bold mb-0 text-dark text-truncate" style="max-width: 150px;">${nome}</h5>
                                    <span class="badge bg-light text-dark border small mt-1 px-2 py-1 rounded-pill">${especie}</span>
                                </div>
                            </div>
                            
                            <div class="small text-secondary mb-4 flex-grow-1">
                                <div class="mb-1"><strong class="text-dark">Raça:</strong> ${raca}</div>
                                <div class="mb-1"><strong class="text-dark">Porte:</strong> ${porte}</div>
                                <div class="mt-2 text-muted" style="font-style: italic; line-height: 1.3;">
                                    <strong class="text-dark" style="font-style: normal;">Notas:</strong> ${obs}
                                </div>
                            </div>

                            <div class="d-flex gap-2 mt-auto border-top pt-3">
                                <button class="btn btn-sm btn-light rounded-pill w-100 fw-medium text-secondary" onclick="alert('Módulo de edição em manutenção técnica no balcão.')">
                                    <i class="bi bi-pencil me-1"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="window.removerPet('${idPet}')" title="Remover Pet">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Erro ao processar lista de pets:", error);
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-danger small">Não foi possível carregar os seus pets. Verifique a sua conexão.</p></div>';
    }
}

// ==========================================
// REMOÇÃO LÓGICA DO PET VIA API
// ==========================================
window.removerPet = async (idPet) => {
    if (!confirm("Deseja realmente remover este pet da sua conta? Esta ação preservará apenas históricos antigos.")) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/pets/${idPet}`, { method: 'DELETE' });
        
        if (res.ok) {
            alert("✅ Pet removido com sucesso!");
            const clienteId = localStorage.getItem('usuario_id');
            await carregarPets(clienteId);
        } else {
            const errData = await res.json().catch(() => null);
            alert(`Ops: ${errData?.error || "Não foi possível excluir o pet. Verifique se ele possui agendamentos ativos."}`);
        }
    } catch (e) { 
        console.error("Erro no disparo do DELETE:", e);
        alert("Erro de conexão ao tentar deletar o registro."); 
    }
};