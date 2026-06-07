# Deploy Paralelo Binhotti

Este arquivo evita confusão entre a versão HTML em uso e a nova versão React.

## Objetivo

Subir a versão React no Git e testar em paralelo, sem derrubar o app HTML que a cliente usa hoje.

## O Que Fica Em Produção

- O app HTML atual continua sendo usado pela cliente.
- O domínio principal deve continuar apontando para a versão HTML até aprovação final.

## O Que Vai Para Teste

- A pasta `app/` é a nova versão React/Vite.
- Ela pode ser publicada em um ambiente separado, por exemplo um subdomínio de teste ou um deploy preview.
- O arquivo `app/.env` não vai para o Git. No ambiente de teste, configurar:

```env
VITE_SUPABASE_URL=https://sxvjocfxsasxfobyvqqr.supabase.co
VITE_SUPABASE_ANON_KEY=cole_a_chave_anon_aqui
```

## Como Validar Antes De Trocar

1. Fazer login com usuário autorizado.
2. Abrir Dashboard e conferir números.
3. Criar, editar e excluir cliente de teste.
4. Criar, editar e excluir equipamento de teste.
5. Criar, editar e excluir funcionário de teste.
6. Conferir vínculo funcionário/equipamento nos dois lados.
7. Criar ficha diária com cliente já existente.
8. Criar ficha diária cadastrando cliente novo dentro do modal.
9. Trocar máquina do operador em uma ficha.
10. Gerar PDF de fichas.
11. Gerar relatório por cliente/obra.
12. Gerar relatório por máquina.
13. Gerar relatório por material.
14. Gerar relatório por pedido/contrato.
15. Gerar Excel e abrir no computador da cliente.
16. Gerar relatório de horas dos funcionários.

## Critério Para Virar Produção

A versão React só deve substituir o HTML quando:

- todos os fluxos acima estiverem testados no ambiente online;
- PDF e Excel abrirem sem alerta de arquivo corrompido;
- a cliente confirmar que ficha diária e relatórios atendem o uso real;
- não houver erro no console durante os fluxos principais.

## Comandos Locais

```powershell
cd app
npm install
npm run qa
npm run build
npm run preview
```

