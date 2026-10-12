# Receitas e orçamento

O módulo `/receitas/` apresenta a previsão anual de receitas e os documentos registrados na API municipal, com filtros por exercício, unidade gestora, categoria, tipo, conta/fonte de recurso e mês. A página inicial, o menu e os indicadores incluem o novo módulo.

## Recorte e fontes

O recorte inicial é **2025 e 2026**, no portal **12535 — Prefeitura Municipal de Porto Velho** e suas unidades gestoras. IPAM e Câmara não são somados a esse recorte. A coleta usa o ano corrente no fuso de Porto Velho e o anterior; registros antigos permanecem no histórico quando saem do recorte ativo.

- Documentos: `https://api.portovelho.ro.gov.br/api/v1/receitas?portal_id=12535&ano=2026&por-pagina=1000`.
- Previsões: `https://api.portovelho.ro.gov.br/api/v1/receitas/previstas?portal_id=12535&ano=2026&por-pagina=1000`.
- Conferência independente: `https://api.portovelho.ro.gov.br/api/v1/receitas/total-por-ano?portal_id=12535&ano=2026`.
- [Portal de receitas](https://transparencia.portovelho.ro.gov.br/receitas).
- Documentos de [LOA](https://transparencia.portovelho.ro.gov.br/arquivos?pasta=173), [LDO](https://transparencia.portovelho.ro.gov.br/arquivos?pasta=171) e [PPA](https://transparencia.portovelho.ro.gov.br/arquivos?pasta=168).

As pastas de planejamento são links para a documentação oficial. Não extraímos delas valores de despesas nem presumimos que a previsão da API seja o orçamento consolidado da LOA.

## Método e limites

- A API aceita 1.000 registros por página. Seus links omitem os filtros: a coleta restaura portal, exercício e tamanho em cada página, valida a sequência e o total, rejeita ciclos e origens externas.
- Cada documento de receita precisa de ID único, exercício, portal e unidade corretos. Mês e data precisam ser coerentes quando a data é informada.
- Os resumos são agrupados por exercício, unidade, código da conta, código da fonte de recurso e tipo. Guardam o número de documentos e os valores de cada mês. Não incluem nomes de contribuintes, CPF, endereços ou contatos.
- `receita_sigla=O` é orçamentária, `EX` é extraorçamentária; demais tipos ficam separados como não informados. O total orçamentário é o padrão da interface.
- Anulações e demais valores negativos são preservados com seu sinal. Não transformamos valores negativos em positivos nem aplicamos outro sinal pelo nome do documento.
- A previsão anual vem **somente de `/receitas/previstas`**. Não somamos `valor_orcamento` dos documentos de arrecadação, porque esse valor se repete.
- A API publica previsões com ID zero e várias linhas na mesma chave contábil, inclusive linhas zero. Agregamos todas as linhas publicadas e mostramos sua contagem. IDs positivos duplicados na mesma chave são rejeitados; ID zero não é usado como identidade.
- Campos ausentes ou inválidos permanecem indisponíveis. Meses sem documento não viram zero. Somas com valores ausentes indicam cobertura parcial e não geram percentual.
- A previsão permanece anual ao selecionar um mês. O percentual compara o valor registrado no período à previsão anual do mesmo recorte, sem chamar isso de execução de despesas. Percentuais superiores a 100% são preservados.
- A data do último documento indica a cobertura observada; não garante que todos os registros até esse dia estejam completos. Data de coleta e data dos documentos aparecem separadamente.

## Coleta, persistência e publicação

```sh
npm run sync:revenues
```

Sem configuração Supabase, o comando valida as duas fontes e escreve `data/revenues-snapshot.json` e `public/dados/receitas.json`. Ambos contêm os mesmos resumos normalizados. A coleta usa a política compartilhada de intervalos, timeout e HTTP 429 descrita em [contratos](contratos.md#persistência-e-atualização).

Com as credenciais de manutenção, o módulo privado `receitas-pvh` persiste em `observatory.revenue_entries` e `revenue_versions`, usando `module_state`, `ingestion_runs` e `sources` já existentes. A RPC de escrita usa transação, lock por módulo, revisão esperada e ID de execução idempotente. RLS e permissões impedem leitura/escrita por `anon` e `authenticated`; o site continua estático e sem chave Supabase no navegador.

Versões são criadas somente quando o conteúdo contábil ou a presença no recorte muda. A tentativa guarda metadados e hash; não duplica todos os resumos a cada execução. Falha parcial preserva valores, cobertura e data da última coleta completa. Coleta incompleta, total variável e fonte inesperadamente vazia impedem substituir a base.

A migração e a base inicial foram aplicadas ao projeto `observatorio-pvh`; a consulta remota confirmou 2.402 resumos, estado `ok` e RPC indisponível para `anon`. O advisor apresentou somente o aviso informativo [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), intencional neste schema privado sem acesso público.

O workflow executa `obras → contratos → receitas → exportação → testes → build → publicação`. `data:export` exige estado válido dos três módulos. A rotina diária com receitas só passa a rodar após estas alterações chegarem ao GitHub; este trabalho não publica o site automaticamente.

## Validação em 12/10/2026

| Exercício | Documentos | Linhas de previsão | Último documento |
| --------- | ---------: | -----------------: | ---------------- |
| 2025      |     68.779 |                388 | 31/12/2025       |
| 2026      |     41.718 |                430 | 14/08/2026       |

Os 110.497 documentos e 818 linhas de previsão geraram 2.402 resumos contábeis. Os totais de documentos, incluindo tipos extraorçamentários, conferiram em centavos com o endpoint oficial de totais dos dois exercícios. Evidência: [revenues-validation.json](../evidence/revenues-validation.json). Esse total de conferência não substitui o indicador orçamentário da interface.

Testes cobrem sinais monetários, previsão sem multiplicação, tipos separados, cobertura parcial, filtros, paginação, persistência, idempotência, histórico, concorrência, permissões e preservação da base em falhas. A coleta real de 2026 está defasada em relação à data de consulta; isso fica explícito na interface.

A suíte passou com 50 testes; o ajuste final de configuração foi validado novamente nos oito testes de receitas. Typecheck, build de 2.904 páginas e simulação de publicação na Cloudflare passaram. O pacote contém 14.592 arquivos reais; o download de receitas tem aproximadamente 3,9 MB. A prévia foi conferida em computador, tablet e celular, incluindo filtros, URL, meses sem registros e estado sem resultados. Essas verificações locais não confirmam publicação nem execução remota do workflow.
