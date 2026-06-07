# Migração Binhotti Gestão

Este workspace contém a migração do `index.html` legado para uma base React/Vite mais organizada e pronta para manutenção.

## Direção Escolhida

A regra principal foi preservar a lógica que a cliente já precisava, mas separar tudo por domínio:

- `app/src/config/navigation.jsx`: menu, grupos e nomes das telas.
- `app/src/lib/supabase.js`: autenticação, sessão, carregamento e CRUD Supabase.
- `app/src/lib/reports.js`: datas, horas, cálculo de jornada e vínculo de máquinas.
- `app/src/lib/xlsx.js`: geração de Excel `.xlsx` real com logo.
- `app/src/lib/printHtml.js`: impressão de relatórios em PDF.
- `app/src/features/*`: telas por área do sistema.
- `legacy/index.html`: referência temporária do app antigo, sem chave anon real.

## Já Migrado

1. Layout geral, sidebar e identidade visual Binhotti/Simplo.
2. Login Supabase.
3. Dashboard.
4. Ficha diária, serviços e troca temporária de máquina do operador.
5. Cadastros principais.
6. Central de relatórios.
7. Relatório de horas dos funcionários.
8. PDF e Excel com marca Binhotti.
9. Alertas, confirmações e estados de carregamento mais profissionais.

## Próximas Melhorias

- Teste real completo com a cliente em produção.
- Refinar visual final da ficha diária.
- Evoluir automação de relatórios para consultas mais livres.
- Revisar permissões por perfil quando a operação crescer.

## Regra Principal

Não remover campos ou regras que já existem sem validar com a cliente. Melhorias visuais e automações devem manter o fluxo operacional que já foi aprovado.
