# Publicacao na Cloudflare

O Observatorio executa Next.js no Worker `observatorio-pvh`, usando OpenNext.
Paginas de dados e downloads consultam PostgreSQL por Hyperdrive durante a requisicao. O dominio
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

O binding `HYPERDRIVE` usa `observatory_reader`, sem permissao de escrita.
Selecione `DATABASE_PROVIDER=postgres` em `vars`. Hyperdrive verifica a CA
privada e a identidade da VPS com `verify-full`; seu cache esta desativado.
O schema privado e RLS permanecem protegidos. Nao publique `DATABASE_URL`
nem credenciais administrativas ou do coletor nos assets ou no cliente.

O deploy requer somente os secrets Cloudflare. A coleta manual usa os Actions
secrets `DATABASE_URL` e `DATABASE_SSL_CA`, com `observatory_ingestor`.
O build nao recebe credenciais do banco. Consulte [a operacao PostgreSQL](postgres.md).
A preparacao do Hyperdrive e do codigo nao altera o Worker ja publicado;
a troca do site depende de deploy autorizado. Supabase permanece intacto para retorno.

## Atualizacao e desenvolvimento

O workflow `deploy.yml` constroi e publica o codigo no push em `main` ou
por acionamento manual, usando os dados ja persistidos. O workflow separado
`sync-data.yml` coleta os tres modulos somente quando acionado em
**Actions > Atualizar base de dados > Run workflow**, sem build ou deploy.
Nao ha coleta agendada. A integracao Workers Builds deve continuar desativada
para evitar publicacoes concorrentes.

Para Node.js, use `.env.local` com as variaveis de `.env.example` e execute
`npm run dev` ou `npm run build` seguido de `npm start`.
Para conferir o runtime Workers, execute `npm run build:cloudflare` seguido de
`npm run preview`; Wrangler carrega explicitamente `.env.local` como
variaveis locais do Worker. Esse arquivo permanece fora do Git.

Falha da prefeitura preserva o ultimo estado valido no banco e seu aviso de
coleta. Falha de acesso ao banco mostra o estado de erro da pagina; downloads
retornam 503. Nao ha fallback silencioso para arquivos antigos.

Referencias: [OpenNext](https://opennext.js.org/cloudflare/get-started),
[variaveis de ambiente](https://opennext.js.org/cloudflare/howtos/env-vars).
