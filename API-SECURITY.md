# API e Seguranca - Binhotti Gestao

Este documento acompanha o `SDD.md` e define o primeiro padrao para separar front-end, API e Supabase.

## Objetivo

Mover gradualmente regras sensiveis para uma camada de API segura, mantendo o front apenas com interface e chamadas controladas.

## Variaveis

### Front-end

Podem ser usadas no navegador:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### API/Servidor

Devem ficar apenas na Vercel ou ambiente de servidor:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` nunca deve aparecer em codigo do front, print, commit publico ou arquivo enviado para cliente.

## Rotas Iniciais

### `GET /api/health`

Verifica se a API esta viva e se as variaveis de servidor existem.

Resposta esperada:

```json
{
  "ok": true,
  "app": "binhotti-gestao",
  "layer": "api",
  "supabaseConfigured": true
}
```

### `GET /api/auth/me`

Valida o token do usuario logado no Supabase.

Header:

```http
Authorization: Bearer TOKEN_DO_USUARIO
```

Resposta esperada:

```json
{
  "ok": true,
  "user": {
    "id": "...",
    "email": "...",
    "role": "authenticated",
    "aud": "authenticated"
  }
}
```

## Padrao Para Novas Rotas

Toda rota nova deve:

1. validar metodo HTTP;
2. validar sessao quando necessario;
3. validar payload;
4. checar permissao;
5. executar regra;
6. registrar auditoria se for acao sensivel;
7. retornar erro amigavel.

## Proximas Rotas

Prioridade sugerida:

1. `/api/relatorios/pdf`
2. `/api/relatorios/excel`
3. `/api/fichas`
4. `/api/clientes`
5. `/api/auditoria`

Relatorios devem ser migrados cedo porque sao criticos para a cliente e precisam ficar confiaveis.
