# PostgreSQL na VPS

Preparacao do banco informado pelo mantenedor, em `93.127.211.223:32770`.
A porta usa o protocolo PostgreSQL, nao HTTP. O codigo foi preparado para a VPS,
mas a troca do site publicado depende de deploy. Consulte [a operacao atual](../../docs/postgres.md).

## Ativar TLS no Docker Manager

Edite o compose do **projeto existente** na Hostinger usando
`compose.tls.yaml`. Preserve o nome do projeto, o servico `postgresql`,
o volume `postgres_data` e as variaveis existentes. Antes de recriar o
container, confira o volume real montado e tenha um backup independente.
Nao crie outro projeto, nao remova volumes e nao execute `down -v`.

O servico auxiliar `postgres_tls` cria uma CA privada e um certificado com
SAN para o IP informado, em um volume separado. Ele termina com codigo zero;
isso e esperado. O banco so inicia quando essa preparacao termina com sucesso.
Os certificados existentes nao sao substituidos nas proximas execucoes.

O compose fixa a porta atual `32770:5432`, habilita TLS e rejeita qualquer
conexao TCP sem TLS. Autenticacao por socket local tambem exige senha SCRAM.
As senhas ficam nas variaveis do Docker Manager, nao neste repositorio.
Modificar `POSTGRES_PASSWORD` no painel **nao altera a senha de um usuario
ja existente**; a rotacao precisa ser feita no PostgreSQL, por exemplo com
`\password`, usando uma conexao segura.

Nos logs de `postgres_tls`, o bloco `BEGIN CERTIFICATE` e a **CA publica**.
Ele pode ser fornecido para configurar a confianca dos clientes. Nunca
compartilhe `ca.key`, `server.key`, senhas ou tokens. O cliente deve verificar
a cadeia e o IP do certificado, sem desabilitar `rejectUnauthorized`.

O certificado do servidor vence em 365 dias. Programe sua renovacao e guarde
um backup protegido da CA; o auxiliar nao renova certificados automaticamente.
O compose recusa certificado expirado. Nao apague o volume TLS para renovar,
pois isso muda a CA e invalida a confianca dos clientes.

## Verificar sem enviar senha

Da raiz do repositorio, antes da migracao:

```sh
node scripts/check-postgres-tls.mjs 93.127.211.223 32770
```

Esse comando envia somente o pedido SSL do protocolo PostgreSQL. Uma resposta
positiva confirma suporte a TLS, mas nao autentica o servidor, testa a senha
ou comprova a migracao. Para verificar tambem a identidade, informe um arquivo
com a CA publica como terceiro argumento:

```sh
node scripts/check-postgres-tls.mjs 93.127.211.223 32770 artifacts/postgres-ca.crt
```

## Operacao apos a preparacao

- Restringir a porta no firewall ou usar Tunnel/VPC; TLS nao substitui controle
  de rede. Com Docker, confira as regras efetivas de publicacao da porta.
- O Hyperdrive usa `verify-full`, CA customizada e usuario somente leitura.
  Sua configuracao pode ser diferente se futuramente houver Tunnel/VPC.
- Leitores e coletores foram adaptados para PostgreSQL; sync continua manual.
- Por decisao do mantenedor, a base foi iniciada com os snapshots locais,
  **sem copiar historico do Supabase**. As proximas coletas registram novas versoes.
- Os usuarios de leitura, ingestao e administracao sao separados, com RLS.
- Validar downloads e navegacao antes do deploy autorizado. Supabase foi preservado.

Referencias: [TLS no PostgreSQL 17](https://www.postgresql.org/docs/17/ssl-tcp.html),
[autenticacao por TLS](https://www.postgresql.org/docs/17/auth-pg-hba-conf.html),
[CA customizada no Hyperdrive](https://developers.cloudflare.com/hyperdrive/configuration/tls-ssl-certificates-for-hyperdrive/).
