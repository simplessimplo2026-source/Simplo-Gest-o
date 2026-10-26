# Plano de migração do Binhotti Gestão para Cloudflare Pages

## Estado verificado

- O commit `d9c58c13ca223986e9755b7280eb7e1626dc165d` está no `origin/main`; o check do Vercel associado ao commit está como `success`. Isso confirma uma implantação do commit, mas não confirma que ela seja a publicação servida pelo domínio de produção.
- O front atual inclui o cabeçalho `apikey` nas chamadas REST do Supabase em `app/src/lib/supabase.js`. O erro visto no navegador (`No API key found in request`) mostra que a chamada publicada chegou sem esse cabeçalho.
- A resposta `No API key found in request` não representa sessão expirada. O front agora deve mostrar orientação de configuração e não disparar renovação de sessão para esse caso.
- O exemplo de configuração usa `VITE_USE_API=false`. Nesse modo, o front lê e grava diretamente no Supabase. O nome mostrado no app como “Base atual” é consistente com esse modo.
- As rotas `app/api/` seguem o formato do Vercel. Foram preparadas rotas equivalentes em `app/functions/api/` para Cloudflare Pages, com handlers `onRequest`.

## Estratégia recomendada

Fazer primeiro uma implantação de teste em **Cloudflare Pages**, sem alterar Supabase, tabelas, RLS, domínio ou dados. Manter `VITE_USE_API=false` na primeira validação para preservar o fluxo atual. As rotas Cloudflare também estão preparadas, mas só devem ser ativadas após os testes de segurança e integração.

O erro de chave deve ser validado na implantação temporária do Cloudflare antes de trocar o domínio. A migração de hospedagem não substitui a configuração correta das variáveis do build.

## Etapa 1 — Pré-requisitos e segurança

1. Confirmar acesso à conta Cloudflare que administra o DNS de `binhotti.simploapp.com.br`, ou identificar quem pode alterar esse DNS.
2. Confirmar acesso ao repositório GitHub `simplessimplo2026-source/Simplo-Gest-o` e à branch `main`.
3. Não compartilhar chaves em chat, GitHub, arquivos versionados ou variáveis públicas. `VITE_SUPABASE_ANON_KEY` é incluída no front por desenho; a segurança dos dados deve continuar garantida pelas políticas RLS do Supabase. **Nunca** usar `SUPABASE_SERVICE_ROLE_KEY` como variável `VITE_*` ou no front.
4. Não apagar nem alterar a configuração antiga do Vercel ou o DNS durante a preparação.

## Etapa 2 — Criar uma implantação de teste

Criar um projeto Cloudflare Pages conectado ao repositório GitHub e configurar:

| Campo | Valor |
| --- | --- |
| Branch de produção temporária no Pages | `cloudflare-pages-migration` |
| Root directory | `app` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Framework preset | Vite |
| Variáveis de build | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USE_API=false` |

`VITE_API_BASE_URL` pode ficar vazio quando `VITE_USE_API=false`. Configurar as variáveis no ambiente de Production e também no Preview se os previews forem usados para testes. Os valores devem ser copiados diretamente do projeto Supabase correto; não precisam ser enviados ao chat.

O primeiro deploy deve gerar um endereço temporário `pages.dev` do novo projeto. Não associar o domínio da cliente ainda.

A branch `cloudflare-pages-migration` mantém essas alterações fora da `main`; Vercel deve tratá-la como preview, enquanto o Pages publica o teste no seu endereço próprio. Só depois da aprovação as alterações devem ser integradas à branch principal e o domínio movido.

O projeto inclui `app/public/_routes.json` para chamar Pages Functions apenas em `/api/*`; os arquivos estáticos devem continuar sendo entregues como conteúdo estático.

## Etapa 3 — Testes na URL temporária

Executar os testes no preview antes da troca de domínio:

1. Fazer login e sair; recarregar a página e confirmar que a sessão se comporta normalmente.
2. Abrir Dashboard, Ficha Diária e Central de Relatórios; confirmar carregamento de clientes, equipamentos, funcionários, materiais, barreiros, fichas e serviços.
3. No DevTools > Network, verificar uma leitura `/rest/v1/...`: o cabeçalho `apikey` deve estar presente. Conferir apenas a presença do cabeçalho; nunca copiar ou enviar seu valor.
4. Confirmar que não há resposta `No API key found in request` nem sequência de `401` nas consultas. Confirmar também ausência do aviso “Falha ao atualizar”.
5. Fazer um lançamento de teste combinado com a cliente, usando identificação clara de teste, e confirmar que aparece na lista de fichas e no relatório. Evitar editar ou apagar fichas reais durante a validação.
6. Validar filtros e exportação PDF/Excel, além da navegação por URL direta e recarga de páginas internas.
7. Revisar logs do Cloudflare e Supabase no horário do teste, sem compartilhar tokens, cabeçalhos secretos ou conteúdo de fichas.

Se qualquer consulta ainda não enviar `apikey`, parar nessa etapa e corrigir a configuração/build do Pages. Não avançar para DNS.

## Etapa 4 — Decidir sobre as rotas de API

No modo atual (`VITE_USE_API=false`), as rotas `/api/core-data`, `/api/auth/me` e `/api/health` não são necessárias para o carregamento principal do front. As implementações para Pages Functions estão presentes para facilitar a futura ativação e podem ser exercitadas no preview.

Se for necessário ativar `VITE_USE_API=true`, portar as rotas para Pages Functions, por exemplo:

- `app/functions/api/core-data.js`
- `app/functions/api/auth/me.js`
- `app/functions/api/health.js`

As funções Cloudflare recebem a URL e a chave pública via `context.env` e preservam o JWT do usuário nas consultas, para que as políticas RLS do Supabase continuem sendo aplicadas; não usam `service_role`. Quando for testar as funções, cadastrar no runtime do Pages `SUPABASE_URL` e `SUPABASE_ANON_KEY` (a mesma chave pública do projeto). O build do front ainda precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Não ativar `VITE_USE_API=true` antes de validar leitura, escrita, permissões e RLS no preview.

## Etapa 5 — Trocar o domínio, somente após aprovação

1. Confirmar que o preview passou todos os testes e que existe acesso à zona DNS do domínio.
2. Em Cloudflare Pages, associar `binhotti.simploapp.com.br` por **Custom domains** e seguir o método recomendado para a zona. Não basta criar um CNAME arbitrário sem associar o domínio ao projeto Pages.
3. Antes de trocar qualquer registro, registrar os valores DNS atuais para permitir reversão. Alterar somente o registro do subdomínio do app; preservar os demais registros de e-mail e serviços.
4. Aguardar ativação do certificado e testar o domínio final em desktop e celular.
5. Manter o preview `pages.dev` e os dados no Supabase. Não limpar nem migrar dados do banco.

## Critério de conclusão e reversão

A migração só está concluída quando o domínio final abre a nova implantação, login e leitura de dados funcionam, uma ficha de teste é salva e listada, os relatórios abrem/exportam e não há erros de chave/autenticação. Se algum critério falhar, interromper a troca antes do DNS; se já houve troca, restaurar o registro DNS anotado e investigar no preview.

## Referências oficiais

- [Cloudflare Pages: configuração de build](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Pages: Functions e roteamento](https://developers.cloudflare.com/pages/functions/routing/)
- [Cloudflare Pages: configurar domínio personalizado](https://developers.cloudflare.com/pages/configuration/custom-domains/)
