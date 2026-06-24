# Binhotti Gestão

Sistema de gestão da Binhotti Terraplenagem.

## Situação Atual

- **Produção atual:** o HTML legado ainda é a versão usada pela cliente.
- **Nova versão:** a pasta `app/` contém a migração React/Vite, preparada para teste paralelo.
- **Regra de segurança:** não substituir o app HTML em produção até a versão React ser testada online em ambiente separado.

## Estrutura

- `app/`: aplicação React principal.
- `legacy/index.html`: cópia sanitizada do HTML antigo para referência técnica.
- `supabase-*.sql`: scripts auxiliares usados na preparação do banco e políticas.
- `MIGRATION.md`: histórico e direção da migração.
- `DEPLOY-PARALELO.md`: como subir/testar a versão React sem derrubar o HTML em uso.

- `SDD.md`: arquitetura, seguranca e plano de evolucao front/API/Supabase.
- `PLANO-EXECUCAO.md`: fases praticas, criterios de pronto e checklist antes de subir/liberar.
- `API-SECURITY.md`: padrao das rotas API e variaveis seguras de servidor.

## Rodar Localmente

```powershell
cd app
npm install
copy .env.example .env
npm run dev
```

No arquivo `app/.env`, preencher:

```env
VITE_SUPABASE_URL=cole_a_url_do_supabase_aqui
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
- O Git pode receber a versão React agora, mas o domínio da cliente deve continuar apontando para o HTML até aprovação final.
