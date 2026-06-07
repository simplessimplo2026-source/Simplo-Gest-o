# Auditoria rapida de seguranca - Binhotti Gestao

Data: 2026-06-02

## Resumo

O app esta funcional, mas ainda esta em modo de risco para uso real porque o `index.html` publicado acessa o Supabase diretamente pelo navegador com a chave anonima.

Isso nao e errado por si so: a chave anonima do Supabase pode ficar publica. O problema e que, sem autenticacao e politicas RLS restritivas, qualquer pessoa com acesso ao site ou ao codigo pode ler, criar, editar e excluir dados.

## Riscos principais

### P0 - Banco exposto para escrita pelo navegador

O front usa:

- `SB_URL`
- `SB_KEY`
- `fetch` direto para `/rest/v1/...`
- metodos `POST`, `PATCH` e `DELETE`

Se as politicas RLS estiverem abertas para `anon`, qualquer visitante consegue manipular dados.

Correcao recomendada:

1. Ativar Supabase Auth.
2. Criar tela de login no app.
3. Bloquear `anon` nas tabelas.
4. Liberar CRUD apenas para usuarios autenticados.
5. Futuramente separar perfis: admin, operador, leitura.

### P0 - App sem login

Hoje qualquer pessoa que abrir a URL entra no painel.

Correcao recomendada:

- Login com email/senha via Supabase Auth.
- Botao sair.
- Carregar dados apenas depois de sessao valida.

### P1 - Risco de XSS por `innerHTML`

O app monta varias telas com `innerHTML` usando dados vindos do banco.

Se alguem cadastrar um cliente/material com HTML malicioso, isso pode executar no navegador de outro usuario.

Correcao recomendada:

- Criar funcao `esc()` global para escapar texto.
- Usar `esc()` em todos os campos exibidos com `innerHTML`.
- Para formularios, preferir `textContent` quando possivel.

### P1 - Exclusao direta

O app usa `DELETE` real em algumas entidades.

Correcao recomendada:

- Trocar exclusao definitiva por `status = inativo` ou `deleted_at`.
- Permitir exclusao definitiva apenas para admin.

### P2 - Sem auditoria

Nao ha registro de quem criou/editou/excluiu.

Correcao recomendada:

- Adicionar colunas `created_by`, `updated_by`, `deleted_by`.
- Usar `auth.uid()` no Supabase.

### P3 - Favicon 404

Console mostra erro de `favicon.ico`.

Nao e risco de seguranca, so acabamento.

## Caminho recomendado

### Fase 1 - Travar acesso

- Criar login.
- Ativar RLS.
- Bloquear anon.
- Liberar acesso para `authenticated`.

### Fase 2 - Sanitizar exibicao

- Escapar textos vindos do banco.
- Revisar telas principais: Dashboard, Fichas, Clientes, Equipamentos, Funcionarios, Materiais, Barreiros, Orcamentos e Relatorios.

### Fase 3 - Roles e auditoria

- Criar tabela `profiles`.
- Definir `admin`, `operador`, `leitura`.
- Adicionar logs de alteracoes.

