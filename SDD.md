# SDD 2.0 - Binhotti Gestao

Software Design Document para guiar a evolucao do sistema Binhotti para uma arquitetura profissional enterprise com type safety, seguranca avancada e infraestrutura de producao.

## 1. Objetivo

Criar uma base profissional, segura e escalavel para o sistema de gestao da Binhotti Terraplenagem, preservando o fluxo operacional que a cliente ja usa e evoluindo para:

- **Front-end profissional**: TypeScript + Next.js 15 + shadcn/ui + TailwindCSS
- **Back-end type-safe**: Next.js API + tRPC + Zod + Server Actions
- **Estado global robusto**: Zustand + TanStack Query (cache + sincronizacao)
- **Seguranca enterprise**: RLS avancado + auditoria completa + rate limiting
- **Infraestrutura producao**: CI/CD + testes + monitoramento + error tracking
- **Relatorios confiaveis**: Geracao server-side + modelos salvos + exportacao profissional

## 2. Contexto Atual

O sistema ja possui uma base em React/Vite dentro de `app/`, com telas migradas do HTML legado:

- login;
- dashboard;
- ficha diaria;
- clientes;
- equipamentos;
- funcionarios;
- materiais;
- barreiros;
- orcamentos;
- central de relatorios;
- relatorio de horas;
- PDF e Excel.

**Limitacoes atuais:**
- Front React/Vite sem TypeScript (erros em runtime)
- CSS puro (difícil manutenção e inconsistência visual)
- Front conecta direto ao Supabase (regras críticas no navegador)
- Sem estado global (dados duplicados entre componentes)
- Sem cache/sincronização (performance subótima)
- Sem CI/CD (deploy manual)
- Sem testes (qualidade não garantida)
- Sem monitoramento (bugs invisíveis em produção)

**Objetivo da migracao:** Evoluir para arquitetura enterprise com type safety, seguranca avancada e infraestrutura de producao.

## 3. Principios De Produto

1. **Preservar o fluxo da cliente**
   Nada que a Sabrina ja usa deve ser removido sem validacao.

2. **Relatorios precisam ser perfeitos**
   PDF e Excel sao parte central do valor do sistema.

3. **Type safety end-to-end**
   TypeScript em todo o stack para eliminar erros de tipo em producao.

4. **Back-end decide regras**
   Permissoes, validacoes, auditoria, calculos importantes e relatorios.

5. **Supabase protege dados**
   Autenticacao, RLS avancado, storage, logs e backups.

6. **Evolucao gradual**
   Migracao por fases sem quebrar o app atual.

## 4. Arquitetura Alvo

```text
┌─────────────────────────────────────────────────────────┐
│                    FRONT-END                            │
│  Next.js 15 + TypeScript + shadcn/ui + TailwindCSS      │
│  + Zustand + TanStack Query + React Hook Form + Zod      │
└────────────────────┬────────────────────────────────────┘
                     │ tRPC (type-safe)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    BACK-END                             │
│  Next.js API Routes + Server Actions + Edge Functions   │
│  + Zod validation + tRPC router                         │
└────────────────────┬────────────────────────────────────┘
                     │ Supabase Client (service role)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                              │
│  Postgres + RLS avançado + Auth + Storage + Triggers     │
│  + Auditoria + Backups + Realtime                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    INFRAESTRUTURA                         │
│  Vercel (Front + API) + GitHub Actions (CI/CD)           │
│  + Sentry (Error tracking) + Upstash (Rate limiting)    │
└─────────────────────────────────────────────────────────┘
```

## 5. Responsabilidades Por Camada

### 5.1 Front-End (Next.js 15 + TypeScript)

Responsavel por:

- Telas e componentes (shadcn/ui + TailwindCSS)
- Experiencia visual profissional e consistente
- Formularios (React Hook Form + Zod)
- Filtros e buscas
- Preview de relatorios
- Validacoes basicas de UX
- Chamadas tRPC type-safe
- Exibicao de erros amigaveis
- Estado local (useState/useReducer)

**Nao deve conter:**

- Chave service role
- Regras sensiveis de negocio
- Decisao real de permissao
- Logica critica de negocio
- Acesso direto ao Supabase (via tRPC apenas)
- Processamento pesado (PDF/Excel no servidor)

### 5.2 Back-End (Next.js API + tRPC + Zod)

Responsavel por:

- Validar sessao do usuario (Supabase Auth)
- Checar perfil e permissao (RLS + custom roles)
- Validar dados de entrada (Zod schemas)
- Aplicar regras de negocio
- Gerar PDF/Excel no servidor (Edge Functions)
- Registrar auditoria (triggers Supabase)
- Proteger operacoes sensiveis
- Conversar com Supabase via service role
- Rate limiting (Upstash Redis)

**Rotas tRPC previstas:**

```typescript
auth.me
fichas.list
fichas.create
fichas.update
fichas.delete
clientes.list
clientes.create
clientes.update
clientes.delete
equipamentos.list
equipamentos.create
equipamentos.update
equipamentos.delete
funcionarios.list
funcionarios.create
funcionarios.update
funcionarios.delete
materiais.list
materiais.create
materiais.update
materiais.delete
barreiros.list
barreiros.create
barreiros.update
barreiros.delete
orcamentos.list
orcamentos.create
orcamentos.update
orcamentos.delete
relatorios.pdf
relatorios.excel
relatorios.custom
auditoria.list
```

### 5.3 Supabase

Responsavel por:

- Autenticacao (Auth)
- Banco Postgres (Data)
- RLS avancado (Security)
- Storage (Files)
- Triggers (Auditoria)
- Backups (Recovery)
- Realtime (Sync)
- Edge Functions (Serverless)

**Regras:**

- Todas as tabelas devem ter RLS ativo
- Chave anon apenas no front via tRPC
- Service role somente no back-end
- Exclusoes devem ser soft delete + audit trail
- Triggers para auditoria automatica
- Policies granulares por perfil/usuario

## 6. Perfis E Permissoes

Perfis iniciais sugeridos:

| Perfil | Pode fazer |
| --- | --- |
| Admin | Tudo, incluindo usuarios, permissoes e exclusoes |
| Operacao | Criar/editar fichas, clientes, materiais e barreiros |
| Financeiro | Ver relatorios, valores, pagamentos e exportacoes |
| Leitura | Apenas consultar dados e relatorios |

Permissoes sensiveis:

- excluir ficha;
- editar ficha fechada;
- exportar relatorio financeiro;
- alterar funcionario;
- alterar equipamento;
- alterar permissao de usuario;
- ver dados financeiros.

## 7. Dados Principais

Entidades centrais:

- usuarios/perfis;
- clientes;
- equipamentos;
- funcionarios;
- materiais;
- barreiros;
- orcamentos;
- fichas;
- ficha_servicos;
- relatorios/modelos;
- auditoria.

Relacionamentos importantes:

- ficha tem funcionario/operador;
- ficha pode ter maquina original ou maquina alterada pontualmente;
- ficha tem varios servicos;
- servico tem cliente, obra, pedido/nota, tipo e unidades;
- material pode aceitar multiplas unidades;
- relatorio cruza fichas, servicos, cliente, obra, maquina, material e periodo.

## 8. Relatorios

Relatorios sao prioridade alta.

Tipos principais:

- por cliente/obra;
- por maquina;
- por material;
- por barreiro/origem;
- por pedido/contrato;
- por horas de funcionario;
- modelo editavel/personalizado.

Requisitos:

- sempre exibir Binhotti no cabecalho;
- PDF limpo, profissional e imprimivel;
- Excel real `.xlsx`, sem alerta de arquivo corrompido;
- Cliente e Obra no cabecalho quando fizer sentido;
- ordenar por data;
- separar quantidades por unidade;
- permitir modelos salvos;
- permitir escolha de colunas;
- preview antes de gerar;
- futuramente gerar no back-end.

## 9. Seguranca

Medidas obrigatorias:

- RLS em todas as tabelas;
- API validando usuario e perfil;
- service role nunca no front;
- variaveis de ambiente na Vercel;
- logs de auditoria;
- validacao de payloads;
- protecao contra exclusao acidental;
- backups do Supabase;
- revisao de policies antes de liberar cliente.

Eventos para auditar:

- login;
- criacao/edicao/exclusao de ficha;
- criacao/edicao/exclusao de cliente;
- alteracao de equipamento;
- alteracao de funcionario;
- exportacao de PDF/Excel;
- alteracao de permissoes.

## 10. Deploy

Fluxo recomendado:

```text
Codex/Windsurf
  |
  v
GitHub
  |
  v
Vercel
  |
  v
Supabase
```

Regras:

- GitHub e a fonte da verdade;
- Vercel faz deploy do front e API;
- Supabase guarda dados;
- `.env` nunca sobe para Git;
- usar variaveis de ambiente na Vercel;
- testar em preview antes de producao.

## 11. Ferramentas

### Codex

Usar para:

- arquitetura;
- refatoracao grande;
- seguranca;
- migracao front/back;
- testes;
- documentacao;
- analise de impacto.

### Windsurf

Usar para:

- abrir o projeto;
- navegar arquivos;
- ajustes pequenos;
- entender codigo;
- edicoes rapidas;
- apoio visual no dia a dia.

### GitHub

Usar como fonte oficial do codigo.

### Vercel

Usar para deploy do front e API serverless.

### Supabase

Usar para banco, auth, RLS e storage.

## 12. Plano De Migracao - SDD 2.0

### Fase 0 - Ponte Segura No App Atual

**Objetivo:** preparar o React/Vite atual para migrar sem quebrar o uso da cliente.

- manter o app atual funcionando enquanto a arquitetura enterprise nasce em paralelo;
- centralizar tipos de dominio para clientes, fichas, servicos, equipamentos e relatorios;
- preparar cliente de API no front para substituir chamadas diretas ao Supabase por etapas;
- manter variaveis sensiveis apenas no servidor/Vercel;
- validar toda mudanca com `npm run build` e `npm run qa`;
- nao remover fluxo existente da Sabrina sem teste real.

**Entregaveis:**
- app atual compilando;
- QA smoke passando;
- tipos base criados;
- API bridge pronta para novas rotas;
- visual Binhotti preservado.

### Fase 1 - Fundamentos TypeScript + UI (Semanas 1-2)

**Objetivo:** Base type-safe + UI profissional

- Migrar para TypeScript (config tsconfig.json + tipagem básica)
- Implementar shadcn/ui + TailwindCSS
- Configurar Zustand (estado global)
- Configurar TanStack Query (cache + sincronização)
- Migrar componentes principais para TypeScript
- Atualizar SDD com nova arquitetura

**Entregáveis:**
- TypeScript configurado e funcionando
- UI consistente com shadcn/ui
- Estado global funcionando
- Cache de dados otimizado

### Fase 2 - Arquitetura Full-Stack (Semanas 3-4)

**Objetivo:** Next.js + tRPC type-safe

- Migrar de Vite para Next.js 15 (App Router)
- Implementar tRPC (type-safe API)
- Configurar Zod (validação de schemas)
- Criar estrutura de rotas tRPC
- Migrar chamadas Supabase para tRPC
- Implementar Server Actions para mutações

**Entregáveis:**
- Next.js 15 funcionando
- tRPC configurado e type-safe
- Rotas API migradas
- Validação Zod implementada

### Fase 3 - Segurança Avançada (Semanas 5-6)

**Objetivo:** RLS avançado + auditoria + rate limiting

- Implementar RLS avançado no Supabase (policies granulares)
- Criar sistema de auditoria (triggers)
- Configurar rate limiting (Upstash Redis)
- Implementar soft delete em todas as tabelas
- Configurar CSRF protection
- Adicionar sanitização de inputs

**Entregáveis:**
- RLS avançado implementado
- Auditoria automática funcionando
- Rate limiting ativo
- Soft delete implementado

### Fase 4 - Infraestrutura Profissional (Semanas 7-8)

**Objetivo:** CI/CD + testes + monitoramento

- Configurar GitHub Actions (CI/CD)
- Implementar Vitest (testes unitários)
- Implementar Playwright (testes E2E)
- Configurar Sentry (error tracking)
- Configurar Vercel Analytics
- Implementar Lighthouse CI

**Entregáveis:**
- CI/CD automatizado
- Testes automatizados
- Monitoramento 24/7
- Performance tracking

### Fase 5 - Relatórios Server-Side (Semanas 9-10)

**Objetivo:** PDF/Excel no servidor + modelos salvos

- Mover geração PDF/Excel para Edge Functions
- Implementar modelos de relatórios salvos
- Criar endpoint para relatórios customizados
- Otimizar performance de exportação
- Adicionar preview avançado

**Entregáveis:**
- Relatórios gerados no servidor
- Modelos salvos funcionando
- Exportação otimizada

### Fase 6 - Evolução Contínua (Pós-lançamento)

**Objetivo:** Automações + IA + features avançadas

- Importação inteligente de orçamentos
- Relatórios livres por consulta (NLQ)
- Alertas operacionais automáticos
- Análises automáticas de dados
- Integrações externas (WhatsApp, email)

## 13. Criterios De Pronto - SDD 2.0

Para considerar uma etapa pronta:

- **Type safety:** TypeScript sem erros, build passa
- **Testes:** Testes unitários e E2E passando
- **Qualidade:** Lighthouse score > 90 em performance/acessibilidade
- **Segurança:** Sem chaves sensíveis no front, RLS ativo
- **Fluxo:** Funcionalidade principal testada com dados reais
- **Erros:** Tratamento de erros implementado na interface
- **Documentação:** SDD atualizado, código comentado
- **Git:** Alteração subida no GitHub com commit descritivo
- **Deploy:** Preview na Vercel funcionando
- **Cliente:** Cliente consegue testar sem explicação técnica

## 14. Riscos - SDD 2.0

| Risco | Mitigacao |
| --- | --- |
| Quebrar fluxo da cliente | Migrar por fases e testar com dados reais |
| Policies Supabase abertas demais | Revisao RLS antes de producao |
| Relatorio inconsistente | Gerar pelo back-end e validar com exemplos reais |
| Duplicidade de dados | Constraints e validacao server-side |
| Front com regra sensivel | Mover regra para API via tRPC |
| Curva de aprendizado TypeScript | Documentacao + exemplos + migracao gradual |
| Performance TanStack Query | Configuracao correta de cache + stale time |
| Complexidade tRPC | Comecar com rotas simples, evoluir gradualmente |

## 15. Decisoes Atuais - SDD 2.0

- **Front:** Next.js 15 + TypeScript + shadcn/ui + TailwindCSS
- **Back:** Next.js API + tRPC + Zod + Server Actions
- **Estado:** Zustand + TanStack Query
- **Deploy:** Vercel (front + API)
- **Banco:** Supabase (Postgres + Auth + RLS)
- **CI/CD:** GitHub Actions
- **Testes:** Vitest + Playwright
- **Monitoramento:** Sentry + Vercel Analytics
- **Rate Limiting:** Upstash Redis
- **Ferramentas:** Codex (arquitetura) + Windsurf (edicao dia a dia)
- **Prioridade:** Fase 1 (TypeScript + UI) → Fase 2 (Next.js + tRPC) → Fase 3 (Segurança) → Fase 4 (Infra)

## 16. Documentos Relacionados

- `PLANO-EXECUCAO.md`: fases operacionais, criterios de pronto, sprint atual e checklist antes de subir/liberar.
- `API-SECURITY.md`: padrao inicial para API segura, variaveis de ambiente e rotas server-side.
- `MIGRATION.md`: historico da migracao do HTML para React.
- `DEPLOY-PARALELO.md`: estrategia de deploy sem derrubar a versao em uso.
