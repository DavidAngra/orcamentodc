// --- Constantes & Cache DOM ---
const STORAGE_KEY = 'rascunho_david_responsivo_v11';

// Declarado aqui para estar disponível antes dos event listeners abaixo
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

const salvarTudoDebounced = debounce(() => salvarTudo(), 1000);

const el = {
    lista:        () => document.getElementById('lista-modelos'),
    cliente:      () => document.getElementById('cliente-nome'),
    dataEmissao:  () => document.getElementById('data-emissao'),
    saveStatus:   () => document.getElementById('save-status'),
    valorTotal:   () => document.getElementById('valor-total'),
    valorEntrada: () => document.getElementById('valor-entrada'),
    valorFalta:   () => document.getElementById('valor-falta'),
    toast:        () => document.getElementById('toast'),
};

// --- Utilitários ---
function fmt(value) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let toastTimer;
function showToast(msg, type = 'success') {
    const toast = el.toast();
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = `toast toast-${type} show`;
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// --- Inicialização ---
window.addEventListener('DOMContentLoaded', () => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
        try {
            const dados = JSON.parse(salvo);
            el.cliente().value      = dados.cliente || '';
            el.dataEmissao().value  = dados.data || new Date().toLocaleDateString('pt-BR');
            if (dados.modelos && dados.modelos.length) {
                dados.modelos.forEach(mod => adicionarNovoModelo(mod));
            } else {
                adicionarNovoModelo();
            }
        } catch {
            el.dataEmissao().value = new Date().toLocaleDateString('pt-BR');
            adicionarNovoModelo();
        }
    } else {
        el.dataEmissao().value = new Date().toLocaleDateString('pt-BR');
        adicionarNovoModelo();
    }

    gerarQRCode();
    atualizarSomaTotal();
    document.body.classList.add('loaded');
});

// --- Event Listeners estáticos ---
document.getElementById('btn-limpar').addEventListener('click', limparRascunho);
document.getElementById('btn-adicionar').addEventListener('click', () => adicionarNovoModelo());
document.getElementById('btn-imprimir').addEventListener('click', () => window.print());
document.getElementById('cliente-nome').addEventListener('input', salvarTudoDebounced);

// --- Event Delegation na lista (elementos dinâmicos) ---
document.getElementById('lista-modelos').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="remover"]');
    if (btn) removerModelo(btn.dataset.id);
});

document.getElementById('lista-modelos').addEventListener('change', e => {
    const t = e.target;
    if (t.type === 'file')                 carregarPreview(t, t.dataset.id);
    if (t.classList.contains('pre-mod'))   { formatarInputPreco(t); atualizarSomaTotal(); }
});

document.getElementById('lista-modelos').addEventListener('input', e => {
    const t = e.target;
    if (t.classList.contains('pre-mod'))   atualizarSomaTotal();
    if (t.classList.contains('nom-mod') ||
        t.classList.contains('des-mod'))   salvarTudoDebounced();
});

document.getElementById('lista-modelos').addEventListener('focusout', e => {
    const t = e.target;
    if (t.classList.contains('pre-mod')) {
        formatarInputPreco(t);
    }
    if (t.classList.contains('nom-mod')) {
        const vazio = t.value.trim() === '';
        t.classList.toggle('input-error', vazio);
    }
});

// --- Modelos ---
function adicionarNovoModelo(dadosIniciais = null) {
    const animate = !dadosIniciais;
    const id      = dadosIniciais ? dadosIniciais.id : Date.now();
    const fotoSrc = dadosIniciais?.foto || '';
    const temFoto = fotoSrc.startsWith('data:');

    const article = document.createElement('article');
    article.className = `modelo-item${animate ? ' entering' : ''}`;
    article.id        = `item-${id}`;
    article.setAttribute('aria-label', 'Modelo de serviço');

    article.innerHTML = `
        <button class="btn-remove-circle no-print" data-action="remover" data-id="${id}" aria-label="Remover este modelo">✕</button>
        <div class="foto-col">
            <div class="foto-box" id="preview-${id}">
                <img src="${fotoSrc}" style="${temFoto ? '' : 'display:none'}" alt="Foto do modelo">
                <span class="foto-placeholder" style="${temFoto ? 'display:none' : ''}">FOTO</span>
            </div>
            <label for="file-${id}" class="custom-file-upload no-print">INCLUIR IMAGEM</label>
            <input id="file-${id}" type="file" class="file-input" style="display:none" accept="image/*" data-id="${id}">
        </div>
        <div class="item-content">
            <div class="item-table-header"><span>NOME E DESCRIÇÃO</span><span>PREÇO TOTAL</span></div>
            <div class="item-fields-container">
                <div class="field-row">
                    <label for="nome-${id}" class="sr-only">Nome do modelo</label>
                    <input id="nome-${id}" type="text" placeholder="Referência" class="input-field name-input nom-mod" value="${dadosIniciais?.nome || ''}">
                    <label for="preco-${id}" class="sr-only">Preço do modelo</label>
                    <input id="preco-${id}" type="number" step="0.01" min="0" placeholder="0,00" class="input-field price-input pre-mod" value="${dadosIniciais?.preco || ''}">
                </div>
                <label for="desc-${id}" class="sr-only">Descrição do modelo</label>
                <textarea id="desc-${id}" placeholder="Detalhes técnicos..." class="input-field desc-input des-mod" rows="3">${dadosIniciais?.desc || ''}</textarea>
            </div>
        </div>`;

    el.lista().appendChild(article);

    if (animate) {
        // Força reflow para a transição funcionar
        article.getBoundingClientRect();
        article.classList.remove('entering');
    }
}

function carregarPreview(input, id) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
        const box  = document.getElementById(`preview-${id}`);
        const img  = box.querySelector('img');
        const span = box.querySelector('.foto-placeholder');
        img.src          = e.target.result;
        img.style.display = 'block';
        if (span) span.style.display = 'none';
        salvarTudo();
    };
    reader.readAsDataURL(input.files[0]);
}

function removerModelo(id) {
    if (!confirm('Remover este modelo do orçamento?')) return;
    const item = document.getElementById(`item-${id}`);
    if (!item) return;
    item.classList.add('leaving');
    setTimeout(() => { item.remove(); atualizarSomaTotal(); }, 300);
}

// --- Totais ---
function atualizarSomaTotal() {
    let total = 0;
    document.querySelectorAll('.pre-mod').forEach(input => {
        total += parseFloat(input.value) || 0;
    });

    el.valorTotal().textContent   = fmt(total);
    el.valorEntrada().textContent = fmt(total / 2);
    el.valorFalta().textContent   = fmt(total / 2);

    const numEl = el.valorTotal();
    numEl.classList.remove('pulse');
    requestAnimationFrame(() => numEl.classList.add('pulse'));

    salvarTudoDebounced();
}

// --- Salvar ---
function salvarTudo() {
    const modelos = [];
    document.querySelectorAll('.modelo-item').forEach(item => {
        const img = item.querySelector('.foto-box img');
        modelos.push({
            id:   item.id.split('-')[1],
            nome: item.querySelector('.nom-mod').value,
            preco:item.querySelector('.pre-mod').value,
            desc: item.querySelector('.des-mod').value,
            foto: img ? img.src : '',
        });
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        cliente: el.cliente().value,
        data:    el.dataEmissao().value,
        modelos,
    }));

    el.saveStatus().textContent = 'Salvo em: ' + new Date().toLocaleTimeString();
}

// --- QR Code ---
function gerarQRCode() {
    const container = document.getElementById('qrcode');
    container.innerHTML = '';
    new QRCode(container, { text: 'https://wa.me/5585999171800', width: 60, height: 60 });
}

// --- Limpar ---
function limparRascunho() {
    if (!confirm('Deseja apagar este orçamento por completo?')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}

// --- Formatar preço ---
function formatarInputPreco(input) {
    if (!input.value) return;
    const valor = parseFloat(input.value);
    if (!isNaN(valor) && valor >= 0) {
        input.value = valor.toFixed(2);
    } else {
        input.value = '';
    }
}
