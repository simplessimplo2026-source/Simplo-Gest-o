# Binhotti Gestão

Sistema de gestão da Binhotti Terraplenagem migrado para React/Vite.

## Estrutura

- `app/`: aplicação React principal.
- `legacy/index.html`: HTML antigo preservado apenas como referência, com chave anon sanitizada.
- `supabase-*.sql`: scripts auxiliares usados na preparação do banco e políticas.
- `MIGRATION.md`: histórico e direção da migração.

## Rodar Localmente

```powershell
cd app
npm install
copy .env.example .env
npm run dev
```

No arquivo `app/.env`, preencher:

```env
VITE_SUPABASE_URL=https://sxvjocfxsasxfobyvqqr.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
```

## Build

```powershell
cd app
npm run build
```

## Funcionalidades Migradas

- Login Supabase com sessão e refresh.
- Dashboard com cards e visão operacional.
- Ficha diária com serviços, clientes, operador, máquina e troca temporária de equipamento.
- Cadastros de clientes, equipamentos, funcionários, materiais, barreiros e orçamentos.
- Central de relatórios com filtros por período, cliente, máquina e busca.
- Relatórios em PDF com logo Binhotti.
- Exportação Excel real `.xlsx` com logo Binhotti embutida.
- Relatório de horas dos funcionários.
- Confirmações e avisos no padrão visual do app.

## Observações

- `app/.env`, `node_modules`, `dist`, logs e arquivos temporários ficam fora do Git.
- O app depende das políticas RLS e colunas já aplicadas no Supabase.
