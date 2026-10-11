# Investigação das fontes públicas

Verificação em **11 de outubro de 2026**, com requisições HTTP diretas e consulta às páginas oficiais. `evidence/probe.json` e `evidence/api-probe.json` registram URLs, horários, status e tipos de conteúdo. A OpenAPI embutida na documentação está preservada em `evidence/openapi.json`.

## Catálogo de dados abertos

URL: https://dados.portovelho.ro.gov.br/

Retornou **HTTP 502** na consulta direta, assim como `/robots.txt`; o navegador de pesquisa também encontrou indisponibilidade. Não foi possível validar datasets, formatos, campos, licença específica, política de atualização ou completude desse catálogo. Nenhum endpoint CKAN ou dataset foi presumido.

O site mantém uma ficha de fonte indisponível. A existência de dados na API municipal não comprova disponibilidade do catálogo.

## Documentação da API

URL: https://api.portovelho.ro.gov.br/docs/api

HTTP 200, documentação OpenAPI **3.1.0**, serviço **PMPV-API 1.0.0**, base declarada `https://api.portovelho.ro.gov.br/api/v1`.

As regras da página declaram acesso universal e uso livre para finalidades diversas, respeitadas limitações legais e regulamentação; atribuem aos órgãos publicadores a responsabilidade pela autenticidade, qualidade e atualidade até o acesso do usuário. Não encontramos identificador de licença padronizada, SLA, cota de requisições ou calendário de atualização. `robots.txt` da API e da transparência retornaram `User-agent: *` com `Disallow:` vazio; isso é instrução de rastreamento, não licença jurídica adicional.

A OpenAPI declara autenticação bearer global, **mas as requisições dos endpoints abaixo responderam anonimamente**. O MVP usa acesso anônimo por padrão e não contorna controle de acesso. Caso isso mude, a coleta registra falha e preserva a última base; um token fornecido pelo operador pode ser usado opcionalmente.

## Endpoints testados

| Endpoint                             | Disponibilidade                                       | Campos / comportamento                                                   | Uso no MVP                                         |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| `GET /obras?por-pagina=100`          | HTTP 200 JSON                                         | `data`, `links`, `meta`; 48 registros em uma página                      | Origem principal                                   |
| `GET /obras/30` e registros da lista | Registro individual documentado e vinculado por `url` | Valores, situação, anexos, medições e contrato explícito                 | Link de proveniência; a lista já inclui campos     |
| `GET /contratos?por-pagina=1`        | HTTP 200 JSON                                         | Número, objeto, órgão, fornecedor, vigências e arquivos                  | Amostra para verificar contrato                    |
| `GET /contratos/{id}`                | 47 IDs explícitos consultados com HTTP 200            | `contratante.sigla/nome`, `data_assinatura`, vigências, valor e arquivos | Enriquecimento de cada obra                        |
| `GET /despesas/obras?por-pagina=1`   | HTTP 200 JSON                                         | Despesa, pagamento, empenho, processo, contrato, unidade gestora         | Amostra investigada; **sem associação automática** |
| `GET /obras/exportar/csv?ano=2026`   | HTTP 200 `text/csv`                                   | Cabeçalhos de obras e campos correspondentes ao exercício                | Exportação oficial validada como alternativa       |

O parâmetro documentado para listar obras é `por-pagina`. Não há filtro de `updated_at` documentado para `/obras`; portanto a leitura é completa e a atualização local é incremental por hash. Os links de paginação vieram em HTTP: são promovidos para HTTPS e validados contra host e caminho permitidos, sem seguir outra origem.

## Campos reais e qualidade

| Grupo         | Campos municipais                                                           | Tratamento                                                                                                           |
| ------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Identidade    | `id`, `nome`, `tipo`, `situacao`                                            | ID municipal preservado; sem fusão por nome                                                                          |
| Financeiro    | `valor_contratado`, `valor_pago`, `valor_a_medir`                           | Resposta real com `{value, formatted, brl, extense}`, apesar de documentação declarar string; convertido em centavos |
| Execução      | `porcentagem_executado`                                                     | String decimal ou `null`; não definido como físico/financeiro                                                        |
| Datas da obra | `data_contrato`, `data_inicio`, `data_vigencia_convenio`, `execucao`        | Datas calendáricas validadas; `execucao` permanece texto de significado não confirmado                               |
| Contrato      | `contrato.id/numero`                                                        | Join exclusivamente por ID explícito; valores e datas das duas fontes separados                                      |
| Localização   | `localizacoes[].nome/trecho`                                                | Texto livre preservado; bairro não inferido                                                                          |
| Documentos    | `anexos[].original_url`, `medicoes[].anexos`, contrato `arquivos[].arquivo` | Links oficiais e nomes, sem download massivo ou validação de conteúdo de todos os PDFs                               |
| Atualização   | `created_at`, `updated_at`                                                  | Atualização da fonte separada da coleta local; `created_at` não usado como início de obra                            |

Na coleta entregue:

- 48 obras, 47 contratos distintos e seis siglas de órgãos. Órgão vem de `contratante` no contrato vinculado.
- 23 obras com situação “Em Andamento”, 18 “Finalizada”, cinco “Rescisão Contratual em andamento” e duas “Termo de Rescisão Contratual”. São rótulos da fonte, sem validação de campo.
- Cinco percentuais ausentes. O portal HTML pode mostrar `0%` onde a API retorna `null`; o MVP mantém a ausência da API.
- Dois registros com `data_contrato` futura em relação à coleta: IDs **46** e **51**. Não reinterpretamos o campo como vigência ou assinatura.
- 16 registros com valor da ficha diferente do valor do contrato vinculado. Aditivos ou outros motivos não são inferidos; consulte os documentos.
- Não há bairro estruturado. A busca consulta os textos de localização e objeto.
- Atualizações da API entre **06/06/2024** e **09/06/2026**. O significado de `updated_at` não garante que todos os pagamentos estejam atualizados até esse momento.
- Há IDs de fornecedores acima do limite inteiro seguro do JavaScript. Não usamos esses IDs para joins; exibimos nome e documento publicados, sem telefones ou e-mails.

## Portal da Transparência

URL: https://transparencia.portovelho.ro.gov.br/obras

HTTP 200, página com campos de contrato, convênio, obra, contratação, contratado, pago, a medir, percentual, processo, datas, situação, tipo e fornecedor. A consulta padrão seleciona **2026** e mostra quatro registros, enquanto a API completa retorna 48. Não tratamos esses totais como uma contradição sem considerar o recorte temporal.

A data global declarada é **23/07/2026 00:00**. Há um aviso sobre demora nas exportações em razão de troca de sistema financeiro e tributário e uma nota atualizada em **01/10/2026** sobre obras paralisadas em um intervalo específico. Essa nota não permite concluir que nenhuma obra está paralisada atualmente. O MVP não a transforma em indicador automático.

O portal usa componentes Livewire e exportação por ações de interface. Não reproduzimos endpoints internos ou requisições de sessão; usamos a API e o CSV públicos documentados.

## Disponibilidade e limites da investigação

Disponibilidade significa resposta observada nesta verificação, não garantia de serviço contínuo. Foram verificados corpo e paginação da lista, todos os contratos vinculados e amostras dos demais endpoints. Os 730 links foram extraídos; não significa que 730 arquivos foram abertos ou validados. Frequência de publicação e completude municipal permanecem não confirmadas.
