import {
    autenticar,
    possuiToken,
    definirToken,
    criarVenda,
    buscarVenda,
    adicionarItem,
    removerItem,
    finalizarVenda,
    cancelarVenda,
    excluirVenda,
} from "./api.js";

// Estado da aplicação. O frontend mantém somente o estado necessário
// para a operação atual; a API é a fonte oficial dos dados da venda.
const estado = {
    venda: null,
    operador: null,
};

const elementos = {
    painelLogin: document.querySelector("#painel-login"),
    painelPdv: document.querySelector("#painel-pdv"),
    formularioLogin: document.querySelector("#form-login"),
    usuario: document.querySelector("#usuario"),
    senha: document.querySelector("#senha"),
    mensagemLogin: document.querySelector("#mensagem-login"),
    nomeOperador: document.querySelector("#nome-operador"),
    btnSair: document.querySelector("#btn-sair"),
    codigoProduto: document.querySelector("#codigo-produto"),
    quantidadeProduto: document.querySelector("#quantidade-produto"),
    quantidadeItem: document.querySelector("#quantidade-item"),
    btnAdicionar: document.querySelector("#btn-adicionar"),
    listaProdutos: document.querySelector("#lista-produtos"),
    quantidadeItens: document.querySelector("#quantidade-itens"),
    totalVenda: document.querySelector("#total-venda"),
    precoUnitario: document.querySelector("#preco-unitario"),
    numeroVenda: document.querySelector("#numero-venda"),
    dataHora: document.querySelector("#data-hora"),
    btnFinalizar: document.querySelector("#btn-finalizar"),
    btnCancelar: document.querySelector("#btn-cancelar"),
    btnNovaVenda: document.querySelector("#btn-nova-venda"),
    mensagemPdv: document.querySelector("#mensagem-pdv"),
    modalPagamento: document.querySelector("#modal-pagamento"),
    formularioPagamento: document.querySelector("#form-pagamento"),
    notificacao: document.querySelector("#notificacao"),
};

// Formata valores monetários de acordo com o padrão brasileiro.
function formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(Number(valor || 0));
}

function mostrarMensagem(elemento, mensagem, tipo = "erro") {
    elemento.textContent = mensagem;
    elemento.className = `mensagem ${tipo}`;
    elemento.hidden = false;
}

function esconderMensagem(elemento) {
    elemento.hidden = true;
}

function notificar(mensagem, tipo = "sucesso") {
    elementos.notificacao.textContent = mensagem;
    elementos.notificacao.dataset.tipo = tipo;
    elementos.notificacao.classList.add("visivel");

    window.setTimeout(() => {
        elementos.notificacao.classList.remove("visivel");
    }, 2800);
}

function atualizarRelogio() {
    elementos.dataHora.textContent = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
    }).format(new Date());
}

function habilitarOperacao(habilitado) {
    elementos.codigoProduto.disabled = !habilitado;
    elementos.quantidadeProduto.disabled = !habilitado;
    elementos.quantidadeItem.disabled = !habilitado;
    elementos.btnAdicionar.disabled = !habilitado;
    elementos.btnCancelar.disabled = !habilitado;
    elementos.btnFinalizar.disabled = !habilitado;
}

function mostrarLogin() {
    elementos.painelLogin.hidden = false;
    elementos.painelPdv.hidden = true;
    elementos.nomeOperador.textContent = "Não autenticado";
    habilitarOperacao(false);
    elementos.usuario.focus();
}

function mostrarPdv() {
    elementos.painelLogin.hidden = true;
    elementos.painelPdv.hidden = false;
    elementos.nomeOperador.textContent = estado.operador?.username || "Operador";
}

function renderizarVenda() {
    const venda = estado.venda;

    if (!venda) {
        elementos.numeroVenda.textContent = "Nenhuma venda";
        elementos.totalVenda.textContent = formatarMoeda(0);
        elementos.precoUnitario.textContent = formatarMoeda(0);
        elementos.quantidadeItens.textContent = "0 itens";
        elementos.listaProdutos.innerHTML = `
            <tr class="vazio">
                <td colspan="5">Nenhum item adicionado</td>
            </tr>
        `;
        habilitarOperacao(false);
        return;
    }
    const numeroVendaFormatado = String(venda.id).padStart(4, "0");

    // Atualizando o texto no DOM
    document.getElementById("numero-venda").textContent =
        `Cupom ${numeroVendaFormatado}`;
    elementos.totalVenda.textContent = formatarMoeda(venda.total);

    const itens = venda.itens || [];
    const quantidadeTotal = itens.reduce(
        (total, item) => total + Number(item.quantidade),
        0,
    );

    elementos.quantidadeItens.textContent = `${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`;

    if (!itens.length) {
        elementos.listaProdutos.innerHTML = `
            <tr class="vazio">
                <td colspan="4">Nenhum item adicionado</td>
            </tr>
        `;
    } else {
        elementos.listaProdutos.innerHTML = itens
            .map(
                (item) => `
            <tr>
                <td>
                    <small>${item.id}</small>
                    <small>${item.outro_campo ?? "-"}</smail>
                </td>
                <td>
                    <small>${escaparHtml(item.nome_produto)}</small>
                    <small>${item.produto}</small>
                </td>
                <td>
                    <small>${formatarMoeda(item.preco_unitario)}</small>
                    <small>x${item.quantidade}</small>
                </td>
                <td>
                    <small>${formatarMoeda(item.subtotal)}</small>
                    <small>${"-"}</small>
                </td>
                <td>
                    <button
                        class="botao-remover"
                        type="button"
                        data-item-id="${item.id}"
                        title="Remover item"
                    >×</button>
                </td>
            </tr>
        `,
            )
            .join("");
    }

    const vendaAberta = venda.situacao === "ABERTA";
    habilitarOperacao(vendaAberta);
}

// Escapa texto recebido da API antes de inserir no HTML.
function escaparHtml(valor) {
    const mapa = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };

    return String(valor ?? "").replace(
        /[&<>"']/g,
        (caractere) => mapa[caractere],
    );
}

async function atualizarVenda() {
    if (!estado.venda) {
        renderizarVenda();
        return;
    }

    estado.venda = await buscarVenda(estado.venda.id);
    console.log("Venda completa:", estado.venda);
    renderizarVenda();
}

async function iniciarNovaVenda() {
    try {
        esconderMensagem(elementos.mensagemPdv);
        estado.venda = await criarVenda();
        elementos.quantidadeProduto.value = "";
        elementos.precoUnitario.textContent = formatarMoeda(0);
        renderizarVenda();

        elementos.codigoProduto.focus();
        notificar(`Venda ${estado.venda.id} iniciada.`);
    } catch (erro) {
        mostrarMensagem(elementos.mensagemPdv, erro.message);
    }
}

async function adicionarProdutoNaVenda() {
    if (!estado.venda) {
        notificar("Inicie uma nova venda primeiro.", "erro");
        return;
    }

    const produtoId = Number(elementos.codigoProduto.value);
    const quantidade = Number(elementos.quantidadeItem.value);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
        mostrarMensagem(elementos.mensagemPdv, "Informe um ID de produto válido.");
        elementos.codigoProduto.focus();
        return;
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        mostrarMensagem(elementos.mensagemPdv, "Informe uma quantidade válida.");
        elementos.quantidadeItem.focus();
        return;
    }

    try {
        esconderMensagem(elementos.mensagemPdv);

        const respostaItem = await adicionarItem(
            estado.venda.id,
            produtoId,
            quantidade,
        );
        console.log("Resposta da inclusão do produto:", respostaItem);

        await atualizarVenda();

        const itens = estado.venda.itens || [];
        const ultimoItem = itens[itens.length - 1];
        if (ultimoItem) {
            elementos.quantidadeProduto.value = ultimoItem.nome_produto || "";
            elementos.precoUnitario.textContent = formatarMoeda(
                ultimoItem.preco_unitario,
            );
        }

        elementos.codigoProduto.value = "";
        elementos.quantidadeItem.value = "1";
        elementos.codigoProduto.focus();

        notificar("Produto adicionado à venda.");
    } catch (erro) {
        mostrarMensagem(elementos.mensagemPdv, erro.message);
    }
}

async function removerProduto(itemId) {
    try {
        await removerItem(itemId);
        await atualizarVenda();
        notificar("Item removido.");
    } catch (erro) {
        mostrarMensagem(elementos.mensagemPdv, erro.message);
    }
}

function abrirPagamento() {
    if (!estado.venda || !estado.venda.itens?.length) {
        notificar("Adicione pelo menos um item antes de finalizar.", "erro");
        return;
    }

    elementos.formularioPagamento.reset();
    elementos.modalPagamento.showModal();
}

async function confirmarPagamento(evento) {
    evento.preventDefault();

    const formaPagamento = new FormData(elementos.formularioPagamento).get(
        "forma_pagamento",
    );

    if (!formaPagamento) {
        return;
    }

    try {
        estado.venda = await finalizarVenda(estado.venda.id, formaPagamento);

        elementos.modalPagamento.close();
        renderizarVenda();

        notificar(`Venda #${estado.venda.id} finalizada com sucesso.`);

        // Após a finalização, o caixa fica pronto para uma nova venda.
        window.setTimeout(iniciarNovaVenda, 900);
    } catch (erro) {
        notificar(erro.message, "erro");
    }
}

async function cancelarVendaAtual() {
    if (!estado.venda) {
        return;
    }

    const confirmou = window.confirm(`Cancelar a venda #${estado.venda.id}?`);

    if (!confirmou) {
        return;
    }

    try {
        await cancelarVenda(estado.venda.id);
        estado.venda = null;
        renderizarVenda();
        notificar("Venda cancelada.");
    } catch (erro) {
        mostrarMensagem(elementos.mensagemPdv, erro.message);
    }
}

async function excluirVendaAberta() {
    if (!estado.venda) {
        return;
    }

    const confirmou = window.confirm(
        `Excluir a venda aberta #${estado.venda.id}?`,
    );

    if (!confirmou) {
        return;
    }

    try {
        await excluirVenda(estado.venda.id);
        estado.venda = null;
        renderizarVenda();
        notificar("Venda excluída.");
    } catch (erro) {
        mostrarMensagem(elementos.mensagemPdv, erro.message);
    }
}

async function realizarLogin(evento) {
    evento.preventDefault();

    const usuario = elementos.usuario.value.trim();
    const senha = elementos.senha.value;

    try {
        elementos.mensagemLogin.hidden = true;

        const tokens = await autenticar(usuario, senha);

        // O endpoint JWT não retorna o usuário completo.
        // Guardamos o nome digitado apenas para a identificação visual.
        estado.operador = { username: usuario };
        console.log("Usuário logado:", estado.operador);

        sessionStorage.setItem("usuario_nome", usuario);

        mostrarPdv();
        await iniciarNovaVenda();
    } catch (erro) {
        mostrarMensagem(elementos.mensagemLogin, erro.message);
    }
}

function sair() {
    definirToken(null);
    sessionStorage.removeItem("usuario_nome");
    estado.venda = null;
    estado.operador = null;
    mostrarLogin();
}

elementos.formularioLogin.addEventListener("submit", realizarLogin);

elementos.btnAdicionar.addEventListener("click", adicionarProdutoNaVenda);

elementos.btnFinalizar.addEventListener("click", abrirPagamento);

elementos.formularioPagamento.addEventListener("submit", confirmarPagamento);

elementos.btnCancelar.addEventListener("click", cancelarVendaAtual);

elementos.btnNovaVenda.addEventListener("click", iniciarNovaVenda);

elementos.btnSair.addEventListener("click", sair);

elementos.listaProdutos.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-item-id]");

    if (botao) {
        removerProduto(Number(botao.dataset.itemId));
    }
});

elementos.codigoProduto.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
        evento.preventDefault();
        adicionarProdutoNaVenda();
    }
});

document.addEventListener("keydown", (evento) => {
    if (evento.key === "F2") {
        evento.preventDefault();
        iniciarNovaVenda();
    }

    if (evento.key === "F3") {
        evento.preventDefault();
        elementos.codigoProduto.focus();
    }

    if (evento.key === "F4") {
        evento.preventDefault();
        elementos.quantidadeItem.focus();
        elementos.quantidadeItem.select();
    }

    if (evento.key === "F10") {
        evento.preventDefault();
        abrirPagamento();
    }

    if (evento.key === "Escape" && !elementos.modalPagamento.open) {
        if (estado.venda) {
            cancelarVendaAtual();
        }
    }
});

window.setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// Restaura somente a aparência da sessão.
// O JWT continua sendo a credencial efetiva da API.
if (possuiToken()) {
    estado.operador = {
        username: sessionStorage.getItem("usuario_nome") || "Operador",
    };

    mostrarPdv();
    iniciarNovaVenda();
} else {
    mostrarLogin();
}
