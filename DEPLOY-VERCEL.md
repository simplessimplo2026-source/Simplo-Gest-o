# Deploy no Vercel - Binhotti Gestao

Este guia publica a versao React/Vite da pasta `app/` no Vercel, mantendo o GitHub como fonte do codigo e o Supabase como banco/autenticacao.

## 1. Estrutura Esperada

No GitHub precisam existir:

- `app/package.json`
- `app/package-lock.json`
- `app/index.html`
- `app/src/`
- `app/api/`
- `app/vercel.json`

Nao subir:

- `app/node_modules/`
- `app/dist/`
- `app/.env`
- logs
- arquivos temporarios

## 2. Criar Projeto no Vercel

1. Entrar no Vercel.
2. Clicar em `Add New...` > `Project`.
3. Importar o repositorio do GitHub.
4. Em `Root Directory`, escolher:

```txt
app
```

5. Conferir as configuracoes:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

## 3. Variaveis de Ambiente

Em `Project Settings` > `Environment Variables`, cadastrar:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
VITE_API_BASE_URL=
VITE_USE_API=false
```

Para rotas server-side/API, cadastrar tambem:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

Importante:

- `SUPABASE_SERVICE_ROLE_KEY` fica somente no Vercel.
- Nunca colocar service role em arquivo do GitHub.
- `VITE_SUPABASE_ANON_KEY` pode ir como variavel publica do front, pois e a chave anon.

## 4. Dominio Proprio

No Vercel:

1. Abrir o projeto.
2. Ir em `Settings` > `Domains`.
3. Adicionar:

```txt
binhotti.simploapp.com.br
```

4. Seguir o DNS que o Vercel mostrar na tela.

Como e subdominio, normalmente sera um registro `CNAME` apontando para o destino indicado pelo Vercel.

Se o dominio ainda estiver apontando para GitHub Pages, trocar o DNS somente depois que o preview do Vercel estiver aprovado.

## 5. Ordem Segura de Publicacao

1. Subir codigo no GitHub.
2. Importar no Vercel.
3. Configurar variaveis.
4. Fazer deploy.
5. Testar a URL temporaria do Vercel.
6. Testar login, dashboard, ficha diaria e relatorios.
7. So depois apontar `binhotti.simploapp.com.br` para o Vercel.

## 6. Checklist Depois do Deploy

- Login Supabase funciona.
- Dashboard carrega dados reais.
- Ficha diaria abre, salva e edita.
- Maquina e placa aparecem corretamente.
- Central de relatorios carrega.
- PDF abre com layout correto.
- Excel baixa e abre sem alerta de arquivo corrompido.
- Console do navegador sem erro vermelho relevante.

