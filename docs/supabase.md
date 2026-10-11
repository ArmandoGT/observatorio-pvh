# Persistência e atualização automática

Fluxo: `API municipal → coletor Node.js → Supabase → JSON → build Next.js → Cloudflare`. O site continua estático, com busca e filtros no navegador. Nenhuma credencial Supabase é necessária para consultar o observatório.

## Banco

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

Os quatro Actions secrets foram cadastrados no repositório. O token Cloudflare `observatorio-pvh GitHub Actions` tem somente Workers Scripts: Edit na conta utilizada, aceita os IPs variáveis dos runners e expira em **09/01/2027** (90 dias). Renove o token e atualize `CLOUDFLARE_API_TOKEN` antes do vencimento para manter as publicações funcionando. A primeira execução do workflow deve confirmar coleta, validação e publicação remotas.

1. Criar `observatorio-pvh` na organização `Santi`, preferencialmente na região São Paulo. Conferir o plano e o custo no painel antes da criação.
2. Aplicar a migração ao projeto novo e verificar as seis tabelas e as duas RPCs.
3. Configurar `SUPABASE_URL` e uma **secret key de servidor** no ambiente da coleta. A chave legada `service_role` também é aceita; chaves públicas são rejeitadas.
4. Executar `npm run sync`, `npm run data:export`, testes, typecheck, build e deploy.

Use `.env.example` como referência. O script não carrega `.env` automaticamente. No Node.js 24, para uso local com `.env.local` ignorado pelo Git:

```sh
node --env-file=.env.local --import tsx scripts/sync.ts
node --env-file=.env.local --import tsx scripts/export-supabase.ts
```

Sem variáveis Supabase, `npm run sync` mantém o modo local. Se qualquer variável Supabase for fornecida, a configuração deve estar completa; falhas do banco interrompem o processo sem fallback silencioso. `SUPABASE_REQUIRED=true` torna o banco obrigatório no workflow.

## GitHub Actions

`.github/workflows/update-data.yml` agenda uma coleta diária às **06:17 em America/Cuiaba e Porto Velho** (10:17 UTC) e também executa após push em `main`. GitHub pode atrasar a execução; o horário não é um SLA. O workflow precisa estar na branch padrão para o agendamento funcionar. Há também execução manual em **Actions → Atualizar dados e publicar observatório → Run workflow**. Se a branch padrão mudar, ajuste o filtro de push.

Cadastre estes **Actions secrets** em `santidev95/observatorio-pvh`:

| Nome | Uso |
| --- | --- |
| `SUPABASE_URL` | URL do projeto novo |
| `SUPABASE_SECRET_KEY` | Credencial de servidor para o coletor |
| `CLOUDFLARE_ACCOUNT_ID` | Conta do Worker `observatorio-pvh` |
| `CLOUDFLARE_API_TOKEN` | Token com Workers Scripts: Edit na conta utilizada |
| `PMPV_API_TOKEN` | Opcional; atualmente a API municipal permite acesso anônimo |

O token GitHub tem somente `contents: read`; nenhum snapshot ou segredo é commitado automaticamente. As credenciais Supabase ficam somente nos passos de coleta/exportação, nunca no build Next.js. As credenciais Cloudflare ficam no deploy. A verificação inicial imprime somente nomes de secrets ausentes.

Execuções são serializadas sem cancelar coletas em andamento. A base é persistida antes da exportação. `partial` pode ser publicado com o aviso previsto na interface; falha da origem, banco, testes ou build impede o deploy e preserva a versão pública anterior. Falha depois da persistência não desfaz a coleta válida: uma nova exportação/build pode publicá-la.

## Publicações fora do workflow

O build lê `data/snapshot.json`; não consulta Supabase sozinho. A atualização diária executa `data:export` antes do build para publicar a revisão persistida.

Se Workers Builds continuar ativo, um push pode publicar o snapshot antigo versionado. Para centralizar produção no workflow, desative os builds automáticos da integração Git na Cloudflare; o Actions passa a cuidar de pushes, execuções diárias e publicações manuais. Alternativamente, configure nessa integração as variáveis Supabase e o build `npm run data:export && npm run build`. A criação do YAML não modifica essas configurações remotas.

Na implantação de 11/10/2026, a opção **Disable builds** foi ativada e salva em **Workers → observatorio-pvh → Settings → Compilações → Produção**, preservando a conexão com o repositório. Para restaurar os builds da Cloudflare, desative essa opção; primeiro ajuste o build para exportar a base persistida, conforme descrito acima.

Um arquivo local não comprova agendamento ativo: é necessário enviá-lo ao GitHub, configurar os secrets e completar uma execução real. Banco e migração também são etapas remotas separadas.

Falhas da origem ficam em `ingestion_runs`. Falhas de rede com Supabase ficam nos logs do GitHub, pois um banco indisponível não pode registrar sua própria falha. Coletar diariamente não garante que a prefeitura publique dados novos diariamente. Novos módulos terão coletores e esquemas próprios; `obras-pvh` isola o estado atual. CGE não foi integrada.

Referências: [RPCs](https://supabase.com/docs/reference/javascript/rpc), [acesso seguro](https://supabase.com/docs/guides/database/secure-data), [workflows agendados](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule).
