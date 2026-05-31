/**
 * js/admin_produtos.js - Gestão de Estoque e Catálogo
 * Responsável por: Listagem, Cadastro, Edição e Alertas de Reposição.
 */

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com"; 

let productModal;
let listaLocalProdutos = []; // Cache local para busca rápida

document.addEventListener('DOMContentLoaded', () => {
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    
    // Carga inicial
    loadProducts();

    // Eventos
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    
    // Busca em tempo real
    document.getElementById('input-busca')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        filtrarTabela(termo);
    });

    // Limpar form ao abrir para "Novo"
    document.getElementById('add-product-button')?.addEventListener('click', () => {
        document.getElementById('productForm').reset();
        document.getElementById('editProductId').value = '';
        document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-plus-circle me-2"></i>Novo Produto para Loja';
    });
});

// --- 1. BUSCAR PRODUTOS (GET) ---
async function loadProducts() {
    const tableBody = document.getElementById('product-table-body');
    if (!tableBody) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/produtos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Erro de comunicação com o servidor.");

        listaLocalProdutos = await response.json();
        renderizarTabela(listaLocalProdutos);

    } catch (error) {
        console.error("Erro:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger p-4 fw-bold">Falha ao conectar com o banco Neon.</td></tr>`;
    }
}

function renderizarTabela(produtos) {
    const tableBody = document.getElementById('product-table-body');
    tableBody.innerHTML = ''; 

    if (produtos.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-5">Nenhum item encontrado no catálogo.</td></tr>';
        return;
    }

    produtos.forEach(p => {
        // Lógica de Preço
        const temPromo = p.preco_promocional && p.preco_promocional < p.preco;
        const htmlPreco = temPromo 
            ? `<div class="small text-muted text-decoration-line-through">R$ ${p.preco}</div><div class="fw-bold text-success">R$ ${p.preco_promocional}</div>`
            : `<div class="fw-bold text-dark">R$ ${p.preco}</div>`;

        // Lógica de Estoque (Item 6.1 da Lista de Combate)
        const minimo = p.estoque_minimo || 2;
        const isBaixo = p.quantidade_estoque <= minimo;
        const badgeEstoque = isBaixo 
            ? `<span class="stock-badge stock-low"><i class="bi bi-exclamation-triangle-fill me-1"></i>${p.quantidade_estoque} un</span>`
            : `<span class="stock-badge stock-ok">${p.quantidade_estoque} un</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="${p.url_imagem || '../img/logo_pequena4.png'}" 
                         class="product-img-mini me-3 shadow-sm" 
                         onerror="this.src='../img/logo_pequena4.png'">
                    <div>
                        <div class="fw-bold text-dark mb-0">${p.nome_produto}</div>
                        <small class="text-muted">#${p.id_produto || p.id}</small>
                    </div>
                </div>
            </td>
            <td>
                <div class="small fw-bold text-secondary text-uppercase">${p.tipo_produto}</div>
                <div class="small text-muted">${p.marca || 'Regia & Tinas'}</div>
            </td>
            <td>${htmlPreco}</td>
            <td>${badgeEstoque}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-white shadow-sm border me-1" onclick="window.prepararEdicao(${p.id_produto || p.id})">
                    <i class="bi bi-pencil brand-pink"></i>
                </button>
                <button class="btn btn-sm btn-white shadow-sm border" onclick="window.deleteProduct(${p.id_produto || p.id})">
                    <i class="bi bi-trash text-danger"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// --- 2. SALVAR E ALTERAR (POST e PUT) ---
async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('saveProductButton');
    const id = document.getElementById('editProductId').value;
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sincronizando...';

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE_URL}/api/admin/produtos/${id}` : `${API_BASE_URL}/api/admin/produtos`;

    const data = {
        nome_produto: document.getElementById('nome_produto').value,
        url_imagem: document.getElementById('url_imagem').value || null,
        tipo_produto: document.getElementById('tipo_produto').value,
        marca: document.getElementById('marca').value || null,
        preco: parseFloat(document.getElementById('preco').value),
        preco_promocional: document.getElementById('preco_promocional').value ? parseFloat(document.getElementById('preco_promocional').value) : null,
        quantidade_estoque: parseInt(document.getElementById('quantidade_estoque').value),
        estoque_minimo: parseInt(document.getElementById('estoque_minimo').value) || 2,
        status_produto: document.getElementById('status_produto').value,
        descricao: document.getElementById('descricao').value || null
    };

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert(id ? "✅ Produto atualizado!" : "🚀 Novo produto no catálogo!");
            productModal.hide();
            loadProducts();
        } else {
            throw new Error("Falha ao salvar.");
        }
    } catch (error) {
        alert("Erro: Verifique a conexão com o banco Neon.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>SALVAR PRODUTO';
    }
}

// --- 3. EXCLUIR PRODUTO (DELETE) ---
window.deleteProduct = async (id) => {
    if (!confirm(`Zapata, deseja remover permanentemente o item #${id}?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/produtos/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            alert("Removido com sucesso!");
            loadProducts();
        } else {
            alert("Este produto não pode ser excluído (possui histórico de vendas).");
        }
    } catch(e) { alert("Erro de rede."); }
};

// --- 4. FUNÇÕES DE APOIO ---

window.prepararEdicao = (id) => {
    const p = listaLocalProdutos.find(item => (item.id_produto || item.id) == id);
    if (!p) return;

    document.getElementById('editProductId').value = p.id_produto || p.id;
    document.getElementById('nome_produto').value = p.nome_produto || '';
    document.getElementById('url_imagem').value = p.url_imagem || '';
    document.getElementById('tipo_produto').value = p.tipo_produto || 'Acessório';
    document.getElementById('marca').value = p.marca || '';
    document.getElementById('preco').value = p.preco || '';
    document.getElementById('preco_promocional').value = p.preco_promocional || '';
    document.getElementById('quantidade_estoque').value = p.quantidade_estoque || 0;
    document.getElementById('estoque_minimo').value = p.estoque_minimo || 2;
    document.getElementById('status_produto').value = p.status_produto || 'Ativo';
    document.getElementById('descricao').value = p.descricao || '';
    
    document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-pencil-square me-2"></i>Editar Produto';
    productModal.show();
};

function filtrarTabela(termo) {
    const filtrados = listaLocalProdutos.filter(p => 
        p.nome_produto.toLowerCase().includes(termo) || 
        p.marca?.toLowerCase().includes(termo) ||
        p.tipo_produto.toLowerCase().includes(termo)
    );
    renderizarTabela(filtrados);
}