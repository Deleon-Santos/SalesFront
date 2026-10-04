// Camada responsável exclusivamente pela comunicação com a API de vendas.
// Não colocamos regras de interface neste arquivo.

const CONFIGURACAO = {
    // Altere somente se o Django estiver em outro endereço/porta.
    baseUrl: "http://127.0.0.1:8000/api",
};

let accessToken = sessionStorage.getItem("access_token");

export function definirToken(token) {
    accessToken = token;
    if (token) {
        sessionStorage.setItem("access_token", token);
    } else {
        sessionStorage.removeItem("access_token");
    }
}

export function possuiToken() {
    return Boolean(accessToken);
}

async function requisicao(caminho, opcoes = {}) {
    const cabecalhos = new Headers(opcoes.headers || {});

    cabecalhos.set("Accept", "application/json");

    if (opcoes.body && !(opcoes.body instanceof FormData)) {
        cabecalhos.set("Content-Type", "application/json");
    }

    if (accessToken) {
        cabecalhos.set("Authorization", `Bearer ${accessToken}`);
    }

    const resposta = await fetch(`${CONFIGURACAO.baseUrl}${caminho}`, {
        ...opcoes,
        headers: cabecalhos,
    });

    // JWT expirado: limpa a sessão e obriga novo login.
    if (resposta.status === 401) {
        definirToken(null);
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    if (!resposta.ok) {
        let detalhe = `Erro HTTP ${resposta.status}.`;

        try {
            const dados = await resposta.json();
            detalhe = dados.detail || detalhe;
        } catch {
            // Algumas respostas de erro podem não possuir JSON.
        }

        throw new Error(detalhe);
    }

    if (resposta.status === 204) {
        return null;
    }

    return resposta.json();
}

export async function autenticar(usuario, senha) {
    const resposta = await fetch(`${CONFIGURACAO.baseUrl}/auth/token/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            username: usuario,
            password: senha,
        }),
    });

    if (!resposta.ok) {
        throw new Error("Usuário ou senha inválidos.");
    }

    const dados = await resposta.json();
    definirToken(dados.access);

    return dados;
}

// POST /api/vendas/
export function criarVenda() {
    return requisicao("/vendas/", {
        method: "POST",
        body: JSON.stringify({}),
    });
}

// GET /api/vendas/{id}/
export function buscarVenda(id) {
    return requisicao(`/vendas/${id}/`);
}

// POST /api/itens-venda/
export function adicionarItem(vendaId, produtoId, quantidade) {
    const corpo = {
        venda: vendaId,
        produto: produtoId,
        quantidade,
    };
    const corpoJson = JSON.stringify(corpo);

    console.log("JSON enviado para adicionar produto:", corpoJson);

    return requisicao("/itens-venda/", {
        method: "POST",
        body: corpoJson,
        
    });
    
}

// DELETE /api/itens-venda/{id}/
export function removerItem(itemId) {
    return requisicao(`/itens-venda/${itemId}/`, {
        method: "DELETE",
    });
}

// POST /api/vendas/{id}/finalizar/
export function finalizarVenda(vendaId, formaPagamento) {
    return requisicao(`/vendas/${vendaId}/finalizar/`, {
        method: "POST",
        body: JSON.stringify({
            forma_pagamento: formaPagamento,
        }),
    });
}

// POST /api/vendas/{id}/cancelar/
export function cancelarVenda(vendaId) {
    return requisicao(`/vendas/${vendaId}/cancelar/`, {
        method: "POST",
        body: JSON.stringify({}),
    });
}

// DELETE /api/vendas/{id}/
export function excluirVenda(vendaId) {
    return requisicao(`/vendas/${vendaId}/`, {
        method: "DELETE",
    });
}
