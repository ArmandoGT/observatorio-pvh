# Publicacao na Cloudflare

O Observatorio executa Next.js no Worker `observatorio-pvh`, usando OpenNext.
Paginas de dados e downloads consultam Supabase durante a requisicao. O dominio
continua sendo `pvh.dadosabertos.org`. A publicacao nao usa mais `out/`.

## Build e publicacao

```sh
npm ci
npm test
npm run typecheck
npm run build:cloudflare
npm run deploy:check
npm run deploy
```

`build:cloudflare` executa `next build` e empacota `.open-next/worker.js` e
`.open-next/assets`. `deploy:check` valida o pacote sem publicar. `deploy`
publica o pacote ja construido e preserva variaveis configuradas no painel.
Execute `build:cloudflare` antes de `deploy` depois de alterar o codigo.

O pacote OpenNext 1.20.10 precisa incluir `preview-props.json` para Next.js
16.4. O patch em `patches/` acrescenta esse manifesto ao glob do adaptador e
e aplicado automaticamente por `postinstall`, inclusive em `npm ci`.
O build interrompe se o patch nao puder ser aplicado. Remova o patch quando
uma versao oficial incorporar [a correcao upstream](https://github.com/opennextjs/opennextjs-cloudflare/pull/1356),
apos validar o runtime novamente.

`wrangler.jsonc` declara `nodejs_compat`, assets e o binding de referencia ao
proprio Worker. As rotas e seus status HTTP sao tratados pelo servidor Next.js.
Nao existe lista de IDs gerada no build: novos registros e registros historicos
podem ser consultados diretamente pelas URLs de detalhe.

## Credenciais do servidor

Configure `SUPABASE_URL` e `SUPABASE_SECRET_KEY` como secrets do Worker. A chave
de servidor nunca deve ter prefixo `NEXT_PUBLIC_`. O schema privado, RLS e as
RPCs restritas a `service_role` permanecem protegidos. O site so chama a RPC de
leitura e nao publica uma API de gravacao.

No GitHub Actions, os secrets existentes sao enviados ao Worker pelo passo
`wrangler secret bulk`, sem arquivo versionado nem valores nos logs. O build
nao recebe credenciais Supabase. A alteracao local do workflow nao configura
o Worker existente ate que uma publicacao seja executada.

## Atualizacao e desenvolvimento

O workflow coleta os tres modulos diariamente as 06:17 de Porto Velho. A
execucao agendada atualiza o banco e valida o resultado sem reconstruir ou
publicar o site. Push em `main` e execucao manual tambem constroem e publicam
o codigo. A integracao Workers Builds deve continuar desativada para evitar
publicacoes concorrentes.

Para Node.js, use `.env.local` com as variaveis de `.env.example` e execute
`npm run dev` ou `npm run build` seguido de `npm start`.
Para conferir o runtime Workers, execute `npm run build:cloudflare` seguido de
`npm run preview`; Wrangler carrega explicitamente `.env.local` como
variaveis locais do Worker. Esse arquivo permanece fora do Git.

Falha da prefeitura preserva o ultimo estado valido no banco e seu aviso de
coleta. Falha de acesso ao Supabase mostra o estado de erro da pagina; downloads
retornam 503. Nao ha fallback silencioso para arquivos antigos.

Referencias: [OpenNext](https://opennext.js.org/cloudflare/get-started),
[variaveis de ambiente](https://opennext.js.org/cloudflare/howtos/env-vars).
