# Arquitetura do MVP

```mermaid
flowchart LR
  A[API municipal: obras] --> B[Coleta paginada e validação]
  C[API: contratos por ID] --> B
  B --> D[Normalização: centavos, datas, nulls e fontes]
  D --> E[Merge por ID e SHA-256]
  E --> P[Supabase: estado e histórico]
  P --> F[Exportação JSON local]
  E -->|modo local sem banco| F
  F --> G[Next.js: geração estática]
  G --> H[Site público]
  F --> I[Download JSON]
```

## Decisões

**Portal com módulos.** A identidade e os módulos disponíveis estão em `src/lib/observatory.ts`. A navegação usa esse registro e a página inicial apresenta o Observatório de Porto Velho. A consulta e os indicadores de Obras na home ficam em `src/features/obras/Overview.tsx`. Obras continua como único módulo ativo; novos temas terão esquemas, fontes e rotas próprios. Consulte [o recorte do observatório](observatorio.md).

**Next.js App Router com exportação estática.** A home, a listagem, as fichas e a metodologia são geradas em build. A busca, os filtros, a ordenação e a paginação funcionam no navegador sobre a base normalizada. Não há API de escrita exposta, login ou credenciais no cliente. O site continua servindo quando a origem municipal falha.

**Persistência Supabase e exportação em arquivos.** O PostgreSQL guarda o estado entre execuções de CI, o histórico de alterações e as tentativas de coleta. `data/snapshot.json` continua sendo o contrato entre ingestão e interface; `data/contracts.json` materializa o cache dos contratos vinculados. Respostas completas são preservadas no banco e em `data/raw/` local por hash, excluídas da publicação; o snapshot só publica os campos necessários. Sem configuração Supabase, o coletor mantém o modo local.

**Atualização incremental do domínio.** A entrada é uma varredura completa; o merge compara hashes normalizados. IDs novos são incluídos, alterações mudam `lastChangedAt`, repetições conservam esse timestamp e ausentes são mantidos com `inLatestSnapshot=false`. A data de coleta muda independentemente da data de atualização municipal. Não há garantia de detecção de mudanças entre coletas.

**Separação obra–contrato.** `contrato.id` é a única chave de associação. `valor_contratado` e `data_contrato` da ficha não substituem `valor` e `data_assinatura` do contrato. A interface mostra os campos com seus respectivos significados e avisa sobre divergências.

## Proteções e recuperação

- Lock de escrita impede duas coletas simultâneas.
- Timeout de 15 segundos, três tentativas limitadas e pausas curtas para falhas transitórias; sem agressividade ou coleta de toda a API de despesas.
- Envelope, total, IDs, paginação e origem de links são validados. Contagem incompleta, base inesperadamente vazia após uma base existente ou dados estruturalmente inválidos preservam a base anterior.
- Snapshot é escrito em arquivo temporário e substituído por rename. O download é materializado a partir do mesmo objeto, e um teste confirma igualdade.
- Links só podem usar HTTP/HTTPS de domínios municipais; a publicação usa HTTPS. HTML de observações é convertido em texto e renderizado pelo React.
- Falha de contrato preserva cache e marca coleta parcial. Falha da lista registra `syncStatus=error` e conserva a última coleta válida. Um novo build é necessário para exibir mudanças do estado de coleta em produção.

O par snapshot/download é atualizado sequencialmente, não com uma transação distribuída. Execute coleta e build de forma serial; uma publicação que detecte diferença deve falhar na etapa de teste. O armazenamento local é adequado a um único escritor. Interrupção externa pode deixar o lock, cuja remoção requer verificar o processo.

## PostgreSQL no Supabase

O schema privado `observatory` reúne `module_state`, `sources`, `ingestion_runs`, `works`, `work_versions` e `contracts`. Valores usam `bigint` em centavos; respostas brutas e versões usam JSONB. A identidade da obra combina módulo e ID oficial, e a escrita transacional com revisão impede sobrescritas por uma execução antiga. Todas as tabelas têm RLS e acesso restrito ao coletor.

A persistência Supabase está implementada como opção do coletor, usando transações, versões e um schema privado. O site permanece estático; o modo local continua disponível sem credenciais. Consulte [a implantação e operação](supabase.md). A aplicação da migração e a ativação do workflow remoto precisam ser verificadas separadamente.

## Publicação e operação

Uma execução de sincronização altera o snapshot local e, quando configurado, persiste primeiro no Supabase. `data:export` materializa a base persistida e `next build` gera `out/`, incluindo o download. O workflow diário serializa `sync → data:export → test → typecheck → build → deploy`; falhas impedem substituir a versão pública válida. O agendamento só fica ativo após o arquivo chegar ao GitHub e os secrets serem configurados.
