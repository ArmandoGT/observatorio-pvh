# Publicação na Cloudflare

O Observatório usa `output: "export"` no Next.js. `npm run build` gera HTML, JavaScript, CSS e dados em `out/`. Essa versão pode ser publicada como arquivos estáticos de um Worker, sem adaptador OpenNext ou servidor Next.js.

## Workers com integração Git

Inclua `wrangler.jsonc`, `package.json` e `package-lock.json` no repositório conectado à Cloudflare. Em **Settings > Build**, configure:

| Campo | Valor |
| --- | --- |
| Diretório raiz | Raiz deste projeto |
| Comando de build | `npm run build` |
| Comando de deploy | `npm run deploy` |

O comando existente `npx wrangler deploy` também funciona, pois utiliza o Wrangler instalado pelo lockfile. O nome configurado é `observatorio-pvh`, correspondente ao Worker do log de 11/10/2026. Caso o Worker tenha outro nome, ajuste `name` em `wrangler.jsonc`.

O Wrangler está fixado como dependência de desenvolvimento. A instalação do build deve incluir as dependências de desenvolvimento. `out/` é gerado pelo build e permanece fora do Git.

`assets.directory` aponta para `out/`; `html_handling` preserva as barras finais usadas pelo Next.js; `not_found_handling` serve `404.html` com status 404 para páginas ausentes. Não há ponto de entrada `main`, pois esta publicação contém apenas arquivos estáticos.

## Validar localmente

```sh
npm ci
npm run build
npm run deploy:check
```

O último comando valida a configuração sem publicar. Para publicar manualmente, com autenticação Cloudflare já configurada, execute `npm run deploy`.

## Falha de detecção automática

No log de 11/10/2026, o build Next.js terminou com sucesso, mas `npx wrangler deploy` não encontrou configuração. A detecção automática tentou converter o projeto para OpenNext, apontou para `.next` e falhou procurando `.next/standalone/.next/server/pages-manifest.json`.

O projeto gera `out/`, não um servidor standalone. A configuração explícita de arquivos estáticos evita essa migração automática. Preserve `output: "export"` e o comando `build: next build`; o fluxo atual não usa `opennextjs-cloudflare build` ou `opennextjs-cloudflare deploy`.

## Alternativa: Pages

No Cloudflare Pages, use build `npm run build` e diretório de saída `out`. Pages não precisa de comando `wrangler deploy` para publicação pela integração Git.

## Domínio e atualização dos dados

Após o primeiro deploy, `pvh.dadosabertos.org` pode ser associado como domínio personalizado do Worker. Este arquivo não configura DNS ou domínio remotamente.

Os dados continuam sendo coletados por `npm run sync`. Atualizações exigem um novo build e deploy; a configuração de hospedagem não cria agendamento de coleta.

Referências: [arquivos estáticos e 404 em Workers](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/), [Next.js estático no Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).
