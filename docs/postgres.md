# PostgreSQL na VPS

Destino: PostgreSQL 17 em `93.127.211.223:32770`, banco `observatorio_pvh`.
O protocolo e PostgreSQL/TCP, nao HTTP. O container exige TLS e autenticacao
SCRAM; os clientes verificam a CA privada e a identidade do servidor.

## Operacao

O site le `observatory.module_state` no servidor. Na Cloudflare, a conexao usa
Hyperdrive com o usuario `observatory_reader`, TLS `verify-full` e cache de
consultas desativado. Em Next.js local, use `DATABASE_PROVIDER=postgres`,
`DATABASE_URL` e `DATABASE_SSL_CA` do ambiente de leitura.

Os tres coletores usam `observatory_ingestor`, sem superusuario ou BYPASSRLS.
Mantem as RPCs SQL existentes: validacao, transacoes, revisoes, idempotencia e
historico de alteracoes. O site nao tem permissoes de escrita; o coletor nao
tem permissao de DELETE nem acesso ao registro administrativo de migracoes.

O sync permanece **manual**, separado do deploy. Localmente:

```sh
node --env-file=.env.postgres-sync.local --import tsx scripts/sync.ts
node --env-file=.env.postgres-sync.local --import tsx scripts/sync-contracts.ts
node --env-file=.env.postgres-sync.local --import tsx scripts/sync-revenues.ts
```

No Windows do mantenedor, prefixe os comandos com `rtk proxy`.
O workflow `sync-data.yml` requer os Actions secrets `DATABASE_URL` (usuario
de ingestao) e `DATABASE_SSL_CA` (CA publica PEM), alem do token municipal
opcional. Os secrets ficam apenas nos passos de coleta, nunca nos testes.
O deploy exige somente as credenciais Cloudflare e o binding Hyperdrive;
nao recebe a senha do coletor e nao faz sync ou seed.

## Preparacao manual

`ops/postgres/compose.tls.yaml` preserva o volume dos dados e cria os
certificados separadamente. Consulte o [procedimento TLS](../ops/postgres/README.md).

```sh
node --env-file=.env.postgres-admin.local --import tsx scripts/setup-postgres.ts --apply
node --env-file=.env.postgres-sync.local --import tsx scripts/seed-postgres.ts --apply
```

Sem `--apply`, os scripts apenas descrevem a operacao. A preparacao cria roles,
aplica as migracoes existentes e salva hashes em `observatory.schema_migrations`.
Ela recusa schema ou roles preexistentes. O seed e transacional entre os tres
modulos e recusa sobrescrever modulos populados. Nunca execute estes comandos
como parte de deploy ou de uma coleta de rotina.

As credenciais administrativas, de leitura e de ingestao sao separadas em
arquivos `.env.postgres*.local`, ignorados pelo Git. Nunca imprima ou publique
seus conteudos. O administrador e usado somente na preparacao, nao no site.

## Hyperdrive

A CA publica foi cadastrada na conta Cloudflare do projeto com o nome
`observatorio-pvh-postgres-ca` e ID `4c035701-b4dd-40be-ab8e-accd3afa142e`.
Depois de autenticar o Wrangler, a configuracao manual envia a credencial de
leitura diretamente a Cloudflare, sem imprimi-la no console:

```sh
node --env-file=.env.postgres.local --import tsx scripts/configure-hyperdrive.ts --apply --ca-id 4c035701-b4dd-40be-ab8e-accd3afa142e --account-id 1b10f20dae28b4a9e83b8a2a2ab05910
```

Isso cria o recurso e adiciona `HYPERDRIVE` ao `wrangler.jsonc`, sem deploy.
O recurso preparado em 12/10/2026 tem ID `183b9e22d2494a2da8d490cd64698cdd`.
Nao repita uma criacao concluida. Para o Worker, selecione
`DATABASE_PROVIDER=postgres` em `vars`; gere os tipos e valide o pacote antes
de publicar. O segredo de ingestao nunca pertence ao Hyperdrive do site.
`npm run cf:types` regenera os tipos sem carregar secrets do ambiente local.

## Inicio do historico

Por decisao do mantenedor, **nao foi copiado o banco Supabase**. A base inicial
usa os snapshots locais validados, preservando as datas originais de coleta:
48 obras, 2.846 contratos e 2.402 grupos de receitas. Cada modulo inicia na
revisao 1, com uma execucao `seed`. As proximas coletas registram seu historico
normalmente; versoes e tentativas existentes somente no Supabase nao foram
transferidas nem reconstruidas.

O Supabase permanece intacto. O provedor legado continua disponivel apenas
com `DATABASE_PROVIDER=supabase`, usando os secrets antigos. Nunca faca
fallback automatico entre provedores ou para arquivos JSON quando o banco falha.

Mantenha backups fora da VPS, renove o certificado do servidor antes de um ano
e restrinja a porta publicada no firewall. A criacao da base e do Hyperdrive
nao significa que o site publicado ja mudou de provedor: essa troca so ocorre
com o deploy autorizado da configuracao e do codigo.
