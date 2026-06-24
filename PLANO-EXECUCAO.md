# Plano de Execucao - Binhotti Gestao

Este documento transforma o SDD 2.0 em uma ordem pratica de trabalho. Ele deve ser usado por Codex, Windsurf e por qualquer pessoa que mexer no app, para evitar mudancas soltas, regressao visual e quebra do fluxo da Sabrina.

## Regras Fixas

- O app atual nao pode quebrar a rotina da cliente.
- Relatorios sao prioridade maxima: PDF, Excel, filtros, modelos e dados precisam bater.
- Toda entrega tecnica precisa passar por `npm run build` e `npm run qa`.
- Toda entrega visual precisa ser conferida no navegador antes de subir.
- Mudanca de banco precisa ter SQL separado, nome claro e registro neste plano ou no SDD.
- `.env`, chaves privadas e service role nunca sobem para o Git.
- Regra sensivel deve ir para back-end/API, nao ficar presa no front.
- Nao misturar migracao estrutural com muitas features novas na mesma entrega.

## Fase 0 - Estabilizacao do App Atual

**Objetivo:** deixar o React/Vite atual confiavel enquanto a arquitetura nova nasce por partes.

**Escopo:**

- manter login, dashboard, ficha diaria, cadastros e relatorios funcionando;
- corrigir bugs de vinculo entre funcionario, equipamento, placa e ficha;
- manter sincronizacao dos dados apos criar/editar cadastros;
- preservar a identidade Binhotti;
- finalizar a ponte inicial para API segura.

**Criterios de pronto:**

- `npm run build` passa;
- `npm run qa` passa;
- ficha diaria cria, edita, salva e lista com maquina correta;
- cliente criado dentro da ficha aparece sem precisar sair da tela;
- PDF e Excel principais abrem sem alerta de arquivo corrompido;
- nenhum dado de teste indevido aparece como informacao oficial.

**Status:** em andamento.

## Fase 1 - Padrao Visual e Usabilidade

**Objetivo:** aplicar o designer system sem perder o jeito Binhotti.

**Escopo:**

- padronizar cards, modais, tabelas, botoes, selects e inputs;
- reduzir sensacao de "app dentro de app" na ficha diaria;
- melhorar estados de carregamento para evitar piscadas;
- manter contraste claro, sem textos escuros em fundos escuros;
- criar componentes reutilizaveis antes de repetir layout.

**Criterios de pronto:**

- telas principais seguem o mesmo espacamento, raio, sombra e hierarquia;
- ficha diaria fica profissional sem remover nenhum campo necessario;
- dashboard mostra indicadores objetivos e graficos uteis;
- relatorios usam o mesmo acabamento visual do app;
- visual confere em desktop e telas menores.

## Fase 2 - Relatorios Profissionais

**Objetivo:** transformar relatorios na ferramenta mais forte do sistema.

**Escopo:**

- builder de relatorio editavel com modelos prontos;
- selecao interativa de campos por botoes;
- ordem das colunas controlada pelo usuario;
- preview fiel ao PDF/Excel;
- modelos como "por obra", "operacional completo", "materiais e origem" e "maquinas e operadores";
- cliente e obra no cabecalho quando o filtro permitir;
- ordenacao por data no app, PDF e Excel;
- logo Binhotti consistente em todos os formatos.

**Criterios de pronto:**

- modelo por obra fica parecido com o padrao enviado pela cliente;
- PDF e Excel mostram os mesmos dados e na mesma ordem;
- campos vazios desnecessarios nao aparecem;
- unidade aparece legivel, por exemplo "Hora" em vez de "h";
- exportacao abre corretamente no Excel da cliente;
- relatorio consegue ser usado sem explicacao tecnica.

## Fase 3 - Seguranca e API

**Objetivo:** tirar regras sensiveis do front e preparar deploy profissional.

**Escopo:**

- usar API server-side para leituras e gravacoes principais;
- validar dados com schemas antes de gravar;
- manter service role somente no servidor;
- revisar RLS;
- criar logs de auditoria para operacoes importantes;
- tratar erros com mensagens claras para o usuario.

**Criterios de pronto:**

- front usa somente chave publica anon quando precisar;
- endpoints server-side protegem regras de negocio;
- usuario nao autenticado nao acessa dados;
- erros de Supabase nao vazam detalhes tecnicos;
- GitHub/Vercel usam variaveis corretas e seguras.

## Fase 4 - Migracao Estrutural

**Objetivo:** sair do Vite atual para uma base full-stack profissional sem paralisar o uso.

**Escopo:**

- migrar gradualmente para Next.js, TypeScript, Tailwind/shadcn e tRPC conforme o SDD;
- manter app atual funcionando em paralelo enquanto a nova base amadurece;
- reaproveitar regras, componentes e testes ja validados;
- criar rotas e modulos por dominio: ficha, clientes, equipamentos, relatorios, horas e materiais.

**Criterios de pronto:**

- nova base roda localmente e em preview;
- os fluxos principais existem na nova arquitetura;
- o app antigo continua disponivel como fallback ate aprovacao;
- deploy em Vercel fica documentado.

## Fase 5 - Automacoes e Inteligencia

**Objetivo:** tornar o app mais inteligente depois que a base estiver firme.

**Escopo:**

- importacao de orcamentos por arquivo;
- assistente para montar relatorios;
- alertas de cadastro incompleto, equipamento sem operador e ficha inconsistente;
- analises por obra, material, funcionario, maquina e contrato.

**Criterios de pronto:**

- automacao nunca grava dado sem revisao quando houver incerteza;
- importacao tem preview antes de salvar;
- relatorios explicam a origem dos numeros;
- IA ajuda, mas nao substitui validacao do usuario.

## Sprint Atual

1. [Concluido] Validar build e QA depois das ultimas mudancas visuais.
2. [Em andamento] Fechar o padrao visual do designer de relatorios.
3. [Pendente] Revisar fluxo de ficha diaria com foco em maquina, placa e troca pontual.
4. [Pendente] Melhorar cadastros de materiais e unidades sem poluir relatorios.
5. [Pendente] Separar o que ainda e front direto do Supabase e o que ja pode ir para API.

## Checklist Antes de Subir Para o Git

- `app/` atualizado.
- `.env` fora do upload.
- `node_modules`, `dist` e logs fora do upload.
- SQL novo separado e com nome claro.
- `README.md`, `SDD.md` e este plano atualizados quando houver mudanca estrutural.
- Build e QA executados no ultimo pacote de alteracoes.
- Teste visual rapido feito no navegador.

## Checklist Antes de Liberar Para Cliente

- Login funcionando.
- Dashboard carregando dados reais.
- Ficha diaria: criar, editar, salvar, excluir e gerar PDF.
- Clientes: criar com CPF/CNPJ e razao social repetida quando CNPJ for diferente.
- Equipamentos: editar operador e placa, depois validar reflexo na ficha.
- Funcionarios: vinculo com equipamento correto.
- Materiais: unidades configuradas e refletidas na ficha.
- Relatorios: filtrar, alterar campos, ordenar, gerar PDF e Excel.
- Horas: conferir totais por funcionario e periodo.
- Sem erros vermelhos relevantes no console.
