# Persistência e atualização dos dados

> Configuracao legada: o codigo agora suporta PostgreSQL na VPS e o sync manual
> foi adaptado para esse destino. Consulte [a operacao PostgreSQL](postgres.md).
> O Supabase foi mantido intacto; seu historico exclusivo nao foi transferido.
> A troca do site publicado depende de deploy autorizado.

Fluxo: `API municipal → coletor Node.js → Supabase → servidor Next.js no Worker → site`. Páginas e downloads consultam o estado persistido durante cada requisição; busca e filtros continuam no navegador. O servidor exige `SUPABASE_URL` e `SUPABASE_SECRET_KEY`, sem expor credenciais ao visitante. Consulte [a configuração Cloudflare/OpenNext](cloudflare.md).

## Banco

O catálogo municipal de contratos usa o módulo isolado `contratos-pvh`, com
as migrações `20261012022433_municipal_contract_catalog.sql` e
`20261012023345_contract_run_metadata.sql`. Acrescenta `contract_catalog`,
`contract_versions` e a RPC privada `observatory_save_contract_snapshot`.
Consulte [a operação do módulo Contratos](contratos.md).

A migração em `supabase/migrations/20261011184706_observatory_ingestion.sql` cria o schema privado `observatory`:

| Tabela | Conteúdo |
| --- | --- |
| `module_state` | Snapshot atual, cache de contratos e revisão |
| `ingestion_runs` | Cada coleta, resultado, erro, snapshot e resposta bruta das obras |
| `works` | Último registro normalizado, com valores em centavos |
| `work_versions` | Versão a cada alteração ou mudança de presença na origem |
| `contracts` | Cache dos contratos vinculados pelo ID oficial |
| `sources` | Origem, disponibilidade e data de consulta de cada fonte |

As RPCs `observatory_load_state` e `observatory_save_snapshot` são executáveis somente por `service_role`. Todas as tabelas usam RLS, sem acesso de `anon` ou `authenticated`. O schema privado não precisa ser exposto na Data API; as duas RPCs ficam em `public` com acesso restrito.

A gravação é uma transação. Repetir o mesmo `run_id` não duplica a execução. Uma revisão antiga é rejeitada. Obras ausentes na API são mantidas com `inLatestSnapshot=false`; alterações e retornos de conteúdo são versionados. Uma falha da origem registra a tentativa e preserva obras, contratos e a última coleta válida.

Na primeira coleta com Supabase, o snapshot válido incluído no repositório é importado como `seed`. Isso preserva as datas históricas e o cache mesmo se a primeira consulta à prefeitura falhar. Não é possível repetir o seed sobre um módulo existente. O histórico começa na base importada e nas próximas coletas; versões antigas desconhecidas não são reconstruídas.

## Configuração

Em 11/10/2026, o projeto `observatorio-pvh` (`sfdosulgapmxaprtbeve`) foi configurado na organização `Santi`, no plano Free e na região East US (`us-east-1`) escolhida na criação. A migração foi aplicada e a base inicial de 48 obras, 47 contratos, 48 versões e cinco fontes foi importada. URL da API: `https://sfdosulgapmxaprtbeve.supabase.co`. A senha do banco não é usada pelo coletor.

A consulta remota confirmou RLS nas seis tabelas, ausência de acesso de `anon` ao schema e às RPCs, e permissão das RPCs para `service_role`. O advisor registrou apenas o aviso informativo [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy): neste schema privado, a ausência de políticas é intencional para bloquear usuários públicos.

A primeira coleta real pelo cliente Supabase foi concluída com `status=ok` em 11/10/2026, criando a revisão 2: 48 obras e 47 contratos, sem alterações de conteúdo e sem duplicar as versões. A exportação via Data API também foi validada. O catálogo de dados abertos continuou respondendo HTTP 502; obras e contratos vieram da API municipal.

Os quatro Actions secrets foram cadastrados no repositório. O token Cloudflare `observatorio-pvh GitHub Actions` tem somente Workers Scripts: Edit na conta utilizada, aceita os IPs variáveis dos runners e expira em **09/01/2027** (90 dias). Renove o token e atualize `CLOUDFLARE_API_TOKEN` antes do vencimento para manter as publicações funcionando. Coleta e publicação são verificadas em workflows independentes.

1. Criar `observatorio-pvh` na organização `Santi`, preferencialmente na região São Paulo. Conferir o plano e o custo no painel antes da criação.
2. Aplicar a migração ao projeto novo e verificar as seis tabelas e as duas RPCs.
3. Configurar `SUPABASE_URL` e uma **secret key de servidor** no ambiente da coleta. A chave legada `service_role` também é aceita; chaves públicas são rejeitadas.
4. Popular a base inicial quando necessário. Depois, publicar com testes, typecheck, `npm run build:cloudflare` e deploy, usando a base existente. Coleta e exportação local não são etapas da publicação.

Use `.env.example` como referência. O script não carrega `.env` automaticamente. No Node.js 24, para uso local com `.env.local` ignorado pelo Git:

```sh
node --env-file=.env.local --import tsx scripts/sync.ts
node --env-file=.env.local --import tsx scripts/export-supabase.ts
```

Sem variáveis Supabase, `npm run sync` mantém o modo local. Se qualquer variável Supabase for fornecida, a configuração deve estar completa; falhas do banco interrompem o processo sem fallback silencioso. `SUPABASE_REQUIRED=true` torna o banco obrigatório no workflow.

## GitHub Actions

`.github/workflows/deploy.yml` publica o código após push em `main` e permite execução manual em **Actions → Publicar observatório → Run workflow**. O deploy valida o código, constrói OpenNext, configura os secrets do Worker e publica usando a base existente, sem executar sync.

`.github/workflows/sync-data.yml` atualiza a base somente por acionamento em **Actions → Atualizar base de dados → Run workflow**. Valida o código e coleta obras, contratos e receitas para o Supabase, sem construir ou publicar o site. Não há agendamento automático. Os dois workflows só executam na branch padrão; se ela mudar, ajuste também o filtro de push do deploy.

Cadastre estes **Actions secrets** em `santidev95/observatorio-pvh`:

| Nome | Uso |
| --- | --- |
| `SUPABASE_URL` | URL do projeto novo |
| `SUPABASE_SECRET_KEY` | Credencial do coletor e do servidor do site |
| `CLOUDFLARE_ACCOUNT_ID` | Conta do Worker `observatorio-pvh` |
| `CLOUDFLARE_API_TOKEN` | Token com Workers Scripts: Edit na conta utilizada |
| `PMPV_API_TOKEN` | Opcional; atualmente a API municipal permite acesso anônimo |

O token GitHub tem somente `contents: read`; nenhum snapshot ou segredo é commitado automaticamente. As credenciais Supabase ficam nos passos de coleta e configuração dos secrets do Worker, nunca no build Next.js nem no cliente. As credenciais Cloudflare ficam nos passos de configuração e deploy. A verificação inicial imprime somente nomes de secrets ausentes.

Coletas manuais são serializadas sem cancelar execuções em andamento; a publicação usa um grupo de concorrência separado. O site consulta cada estado assim que ele é persistido. Coletas parciais ou falhas da origem preservam a última base válida e seu aviso. Falha de leitura do banco resulta no estado de erro da página, sem arquivos locais. O workflow de coleta valida o código antes de persistir e não faz build/deploy; o workflow de publicação não executa coletores. A persistência é transacional por módulo, sem transação conjunta entre os três módulos.

## Publicações fora do workflow

O build não lê `data/snapshot.json` e não consulta Supabase. Os carregadores consultam `observatory_load_state` no servidor durante a requisição. Novos IDs de obras e contratos podem ser acessados sem nova construção.

Se Workers Builds continuar ativo, um push pode gerar uma publicação concorrente. Centralize a publicação no workflow. Para outra integração, use `npm run build:cloudflare` e `npm run deploy`, com secrets Supabase no runtime do Worker. A criação do YAML não modifica configurações remotas.

Na implantação de 11/10/2026, a opção **Disable builds** foi ativada e salva em **Workers → observatorio-pvh → Settings → Compilações → Produção**, preservando a conexão com o repositório. Para restaurar os builds da Cloudflare, desative essa opção; primeiro ajuste os comandos para OpenNext e configure os secrets do runtime.

Os workflows precisam chegar à branch padrão para seus botões e gatilhos ficarem disponíveis no GitHub. A validação local não comprova execução remota. Banco e migração também são etapas remotas separadas.

Falhas da origem ficam em `ingestion_runs`. Falhas de rede com Supabase ficam nos logs do GitHub, pois um banco indisponível não pode registrar sua própria falha. Acionar a coleta não garante que a prefeitura tenha publicado dados novos. Novos módulos terão coletores e esquemas próprios; `obras-pvh` isola o estado atual. CGE não foi integrada.

Referências: [RPCs](https://supabase.com/docs/reference/javascript/rpc), [acesso seguro](https://supabase.com/docs/guides/database/secure-data), [workflows manuais](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
