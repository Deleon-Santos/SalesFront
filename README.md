# Frontend Sales-PDV — Frente de Caixa

Frontend independente em HTML, CSS e JavaScript puro para operar **somente o fluxo de vendas** da API Django.

## Escopo

Este frontend utiliza:

- `POST /api/auth/token/`
- `POST /api/vendas/`
- `GET /api/vendas/{id}/`
- `POST /api/itens-venda/`
- `DELETE /api/itens-venda/{id}/`
- `POST /api/vendas/{id}/finalizar/`
- `POST /api/vendas/{id}/cancelar/`
- `DELETE /api/vendas/{id}/`

Não utiliza o CRUD de produtos, usuários ou relatórios.

## Atenção sobre o produto

A API atual de `ItemVenda` recebe:

```json
{
    "venda": 1,
    "produto": 10,
    "quantidade": 2
}
```

Ela não possui, no fluxo de vendas atual, uma rota para buscar produto por código de barras.

Por isso o campo da tela está identificado como **Código / ID do produto** e usa o `id` do produto.

Para um PDV real com leitor de código de barras, o backend deve futuramente disponibilizar uma operação específica, por exemplo:

`GET /api/vendas/produtos/buscar/?codigo_barras=...`

Essa extensão não foi criada neste frontend porque o requisito é manter a interface conectada somente ao módulo de vendas.

## Como executar

1. Inicie o Django:

```bash
python manage.py runserver
```

2. Abra `index.html` por um servidor local. Evite `file://`, pois módulos ES podem ser bloqueados pelo navegador.

Uma opção:

```bash
python -m http.server 5500
```

Depois abra:

`http://127.0.0.1:5500/`

3. Se o Django estiver em outro endereço, altere:

`js/api.js`

```javascript
const CONFIGURACAO = {
    baseUrl: "http://127.0.0.1:8000/api",
};
```

## CORS

Como o frontend roda em uma origem diferente do Django, o backend precisa permitir a origem do frontend.

Em desenvolvimento, configure o CORS do Django de acordo com a origem utilizada. Não use `CORS_ALLOW_ALL_ORIGINS = True` em produção sem uma justificativa de segurança.

## Fluxo

```text
Login JWT
   ↓
Criar venda
   ↓
Adicionar item
   ↓
Consultar venda atualizada
   ↓
Finalizar + forma de pagamento
```

A aplicação usa `sessionStorage` para o access token, reduzindo sua persistência em relação ao `localStorage`.

Para produção, HTTPS é obrigatório e a estratégia de armazenamento de tokens deve ser revisada de acordo com a arquitetura de autenticação adotada.
