window.onload = () => {
    const salvo = localStorage.getItem('rascunho_david_responsivo_v11');
    if (salvo) {
        const dados = JSON.parse(salvo);
        document.getElementById('cliente-nome').value = dados.cliente || '';
        document.getElementById('data-emissao').value = dados.data || new Date().toLocaleDateString('pt-BR');
        if (dados.modelos) dados.modelos.forEach(mod => adicionarNovoModelo(mod));
        else adicionarNovoModelo();
    } else {
        document.getElementById('data-emissao').value = new Date().toLocaleDateString('pt-BR');
        adicionarNovoModelo();
    }
    gerarQRCode();
    atualizarSomaTotal();
};

function adicionarNovoModelo(dadosIniciais = null) {
    const lista = document.getElementById('lista-modelos');
    const id = dadosIniciais ? dadosIniciais.id : Date.now();
    const template = `
        <div class="modelo-item" id="item-${id}">
            <button class="btn-remove-circle no-print" onclick="removerModelo(${id})">✕</button>
            <div class="foto-col">
                <div class="foto-box" id="preview-${id}">
                    <img src="${dadosIniciais?.foto || ''}" style="${dadosIniciais?.foto ? '' : 'display:none'}">
                    <span style="${dadosIniciais?.foto ? 'display:none' : ''}; font-size:8px; color:#ccc; font-weight:800">FOTO</span>
                </div>
                <label for="file-${id}" class="custom-file-upload no-print">INCLUIR IMAGEM</label>
                <input id="file-${id}" type="file" style="display:none" accept="image/*" onchange="carregarPreview(this, ${id})">
            </div>
            <div class="item-content">
                <div class="item-table-header"><span>NOME E DESCRIÇÃO</span><span>PREÇO TOTAL</span></div>
                <div class="item-fields-container">
                    <div class="field-row">
                        <input type="text" placeholder="Referência" class="input-field name-input nom-mod" value="${dadosIniciais?.nome || ''}" oninput="salvarTudo()">
                        
                        <input type="number" step="0.01" placeholder="0,00" class="input-field price-input pre-mod" value="${dadosIniciais?.preco || ''}" oninput="atualizarSomaTotal()" onblur="formatarInputPreco(this)">
                    </div>
                    <textarea placeholder="Detalhes técnicos..." class="input-field desc-input des-mod" rows="3" oninput="salvarTudo()">${dadosIniciais?.desc || ''}</textarea>
                </div>
            </div>
        </div>`;
    lista.insertAdjacentHTML('beforeend', template);
}

function carregarPreview(input, id) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const box = document.getElementById(`preview-${id}`);
            box.querySelector('img').src = e.target.result;
            box.querySelector('img').style.display = 'block';
            box.querySelector('span').style.display = 'none';
            salvarTudo();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function salvarTudo() {
    const modelos = [];
    document.querySelectorAll('.modelo-item').forEach(item => {
        modelos.push({
            id: item.id.split('-')[1],
            nome: item.querySelector('.nom-mod').value,
            preco: item.querySelector('.pre-mod').value,
            desc: item.querySelector('.des-mod').value,
            foto: item.querySelector('.foto-box img').src
        });
    });
    localStorage.setItem('rascunho_david_responsivo_v11', JSON.stringify({
        cliente: document.getElementById('cliente-nome').value,
        data: document.getElementById('data-emissao').value,
        modelos: modelos
    }));
    document.getElementById('save-status').innerText = "Salvo em: " + new Date().toLocaleTimeString();
}

function atualizarSomaTotal() {
    let total = 0;
    document.querySelectorAll('.pre-mod').forEach(input => total += parseFloat(input.value) || 0);
    
    // Cálculo do total geral
    const totalFormatado = total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('valor-total').innerText = totalFormatado;

    // Cálculo automático das condições de pagamento
    const metade = total / 2;
    const metadeFormatada = metade.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('valor-entrada').innerText = metadeFormatada;
    document.getElementById('valor-falta').innerText = metadeFormatada;
    
    salvarTudo();
}

function removerModelo(id) {
    if(confirm("Remover este modelo do orçamento?")) { document.getElementById(`item-${id}`).remove(); atualizarSomaTotal(); }
}

function gerarQRCode() {
    const container = document.getElementById("qrcode");
    container.innerHTML = "";
    new QRCode(container, { text: "https://wa.me/5585999171800", width: 60, height: 60 });
}

function limparRascunho() {
    if(confirm("Deseja apagar este orçamento por completo?")) { localStorage.removeItem('rascunho_david_responsivo_v11'); location.reload(); }
}

// NOVA FUNÇÃO: Formata o preço com 2 dígitos depois da vírgula ao sair do campo
function formatarInputPreco(inputElement) {
    let valorRaw = inputElement.value;
    if (!valorRaw) {
        return; // Não faz nada se o campo estiver vazio
    }

    // A propriedade input type="number" do navegador gerencia o locale.
    // Usamos parseFloat para ler o número e toFixed(2) para forçar as 2 casas decimais.
    let valor = parseFloat(valorRaw);
    if (!isNaN(valor)) {
        inputElement.value = valor.toFixed(2);
    }
}