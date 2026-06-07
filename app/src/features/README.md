# Telas do App

Cada pasta em `features/` representa uma área do sistema Binhotti.

## Áreas

- `dashboard`: indicadores, últimas fichas e visão da frota.
- `ficha`: lista, modal de ficha diária, serviços, clientes e máquina usada.
- `clientes`: cadastro de clientes.
- `equipamentos`: cadastro e vínculo de máquinas/operadores.
- `funcionarios`: cadastro de equipe e vínculo por máquina.
- `materiais`: cadastro de materiais.
- `barreiros`: cadastro de origens/barreiros.
- `orcamentos`: cadastro e acompanhamento de orçamentos.
- `relatorios`: central de relatórios por cliente, obra, máquina, material, barreiro e pedido.
- `hours`: relatório de horas dos funcionários.

## Convenções

- Regras compartilhadas ficam em `app/src/lib`.
- Componentes globais ficam em `app/src/components`.
- O visual deve manter o padrão Binhotti: azul institucional, vermelho de ação e fundo claro.
- Não remover campos do legado sem validar com a cliente.
