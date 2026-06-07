# Subir No Git

Use este checklist depois de criar o repositório no GitHub.

## Estado Local Atual

- Branch local: `main`
- Últimos commits:
  - `bdfe0cd Documentar deploy paralelo do React`
  - `4df8a07 Adicionar QA e corrigir fluxos finais`
  - `a86d527 Migrar sistema Binhotti para React`
- O repositório local ainda não tem `remote`.

## Comandos

No terminal, dentro desta pasta:

```powershell
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

Exemplo:

```powershell
git remote add origin https://github.com/usuario/repositorio.git
git push -u origin main
```

## Antes De Fazer Push

Conferir:

```powershell
git status
git remote -v
```

O `git status` deve mostrar a árvore limpa.

## Depois Do Push

No GitHub, conferir se estes arquivos aparecem:

- `README.md`
- `MIGRATION.md`
- `DEPLOY-PARALELO.md`
- `app/package.json`
- `app/src/`

Não devem aparecer:

- `app/.env`
- `app/node_modules/`
- `app/dist/`
- arquivos `*.log`

