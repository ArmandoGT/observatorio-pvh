# Esquema normalizado v1

A definição executável está em `src/lib/schema.ts`, validada com Zod. Todos os valores monetários usam centavos inteiros. `null` indica ausência, invalidade ou significado não disponível; nunca é convertido automaticamente em zero.

## Snapshot

| Campo           | Tipo                         | Semântica                                         |
| --------------- | ---------------------------- | ------------------------------------------------- |
| `schemaVersion` | `1`                          | Versão do contrato local                          |
| `generatedAt`   | ISO timestamp / null         | Última coleta válida da lista completa            |
| `lastAttemptAt` | ISO timestamp / null         | Última tentativa, mesmo se falhou                 |
| `syncStatus`    | never / ok / partial / error | Estado da coleta e dos contratos                  |
| `syncError`     | string / null                | Motivo resumido, sem credenciais                  |
| `sourceTotal`   | integer / null               | Total informado pela API validado contra contagem |
| `works`         | Work[]                       | Registros atuais e históricos preservados         |
| `sources`       | Source[]                     | Disponibilidade e condições de cada origem        |
| `changeSummary` | objeto                       | Contagens added / updated / unchanged / notSeen   |

## Work

| Campo                                                    | Origem / significado                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `id`, `sourceId`                                         | `pvh-{id}` e inteiro municipal; não é ID do fornecedor                                 |
| `title`, `status`, `category`                            | `nome`, `situacao`, `tipo`                                                             |
| `organization`, `organizationName`                       | Sigla e nome de `contratante` no contrato vinculado                                    |
| `neighborhood`                                           | null nesta origem; não inferido por regex ou geocodificação                            |
| `locations`                                              | Textos de `localizacoes[].nome`                                                        |
| `contractedCents`, `paidCents`, `toMeasureCents`         | Valores da ficha da obra, em centavos / null                                           |
| `reportedExecutionPercent`                               | `porcentagem_executado`, decimal entre 0 e 100 / null; definição física não confirmada |
| `contractNumber`, `contractId`                           | Relação explícita publicada pela API                                                   |
| `contractDateFromWork`                                   | `data_contrato` na ficha da obra, sem reinterpretar seu significado                    |
| `contractSignedAt`, `contractStartsAt`, `contractEndsAt` | Assinatura e vigências do contrato vinculado                                           |
| `contractValueCents`                                     | Valor da ficha do contrato; separado do valor da obra                                  |
| `startedAt`, `agreementEndsAt`                           | `data_inicio` e `data_vigencia_convenio` da obra                                       |
| `executionRaw`                                           | Campo `execucao` em texto; não tratado como conclusão prevista                         |
| `agreement`, `procurement`, `process`                    | Convênio, modelo de contratação e processo                                             |
| `supplier`, `supplierDocument`                           | Nome e documento publicados; sem contatos pessoais                                     |
| `observation`                                            | Observação oficial convertida de HTML para texto                                       |
| `measurements`                                           | Nome, valor em centavos e data de pagamento de cada medição publicada                  |
| `documents`                                              | Título, URL municipal e tipo obra / contrato / medicao; sem corpo dos PDFs             |
| `sourceUrl`, `contractSourceUrl`                         | URLs de proveniência, sem parâmetros de autenticação                                   |
| `sourceUpdatedAt`, `contractUpdatedAt`                   | Atualizações municipais da obra e do contrato, separadas                               |
| `collectedAt`                                            | Coleta local do registro na varredura completa                                         |
| `firstSeenAt`                                            | Primeira coleta local; não é data de criação da obra                                   |
| `lastChangedAt`                                          | Última mudança normalizada observada; não é evento oficial                             |
| `contentHash`                                            | SHA-256 de conteúdo normalizado, sem timestamps de coleta                              |
| `issues`                                                 | Limitações/divergências, sem classificação de irregularidade                           |
| `inLatestSnapshot`                                       | Presença na última varredura completa; false retém ficha histórica                     |

## Source

`id`, `title`, `url`, `status` (`available`, `unavailable`, `partial`), `httpStatus`, `checkedAt`, `note`, `termsUrl`, `updateFrequency`. O estado é evidência de uma requisição, não monitoramento contínuo. Frequência permanece texto de indisponibilidade quando a origem não a especifica.

## Regras de normalização

- Aceita dinheiro como `{value: number}`, decimal em string ou formato brasileiro; rejeita negativos, formatos inesperados e números fora do inteiro seguro. Zero monetário é válido.
- Aceita ISO calendário e `dd/mm/yyyy`, rejeitando datas impossíveis. Datas futuras continuam visíveis com observação.
- Percentual vazio, nulo, inválido ou fora de 0–100 fica ausente e é sinalizado; não é derivado do valor pago.
- Hash ordena chaves de objetos, mantendo a ordem das listas. Mudança de ordem das listas pode aparecer como mudança de conteúdo.
- Não usa os grandes IDs de fornecedores como números de associação, evitando perda de precisão.
- Somente registros da última consulta completa entram nos totais; cobertura dos valores conhecidos acompanha cada soma.
