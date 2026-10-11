# Observatório de Porto Velho

## Identidade e endereço

Nome do projeto: **Observatório de Porto Velho**. Identidade curta: **Observatório PVH**.

Endereço recomendado: **pvh.dadosabertos.org**. É curto, identifica a cidade e permite adicionar temas por caminho. `observatorio.pvh.dadosabertos.org` adiciona uma camada sem necessidade para o primeiro lançamento. A recomendação não implica configuração de DNS, certificado ou domínio na hospedagem. Não há URL canônica apontando para o endereço proposto antes de sua ativação.

## Primeiro lançamento

Somente **Obras** é um módulo ativo. A navegação publica apenas rotas implementadas; futuros temas não aparecem como páginas vazias ou links indisponíveis.

| Caminho             | Conteúdo atual                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/`                 | Apresentação do observatório e entrada para Obras, com consulta e indicadores identificados como municipais |
| `/obras/`           | Busca, filtros e listagem de obras                                                                          |
| `/obras/[id]/`      | Ficha da obra, contrato, documentos e contexto da fonte                                                     |
| `/metodologia/`     | Fontes, significado dos indicadores, cobertura e limites                                                    |
| `/dados/obras.json` | Base normalizada do módulo                                                                                  |

Os totais de Obras descrevem a base consultada. Não representam todos os gastos, obras ou investimentos da cidade.

## Como acrescentar módulos

`src/lib/observatory.ts` centraliza a identidade e o registro de módulos disponíveis. A navegação usa esse registro. `src/app/page.tsx` apresenta o observatório; `src/features/obras/Overview.tsx` concentra a consulta e os indicadores de Obras na página inicial. As rotas e o domínio de Obras existentes permanecem específicos desse tema.

Para um próximo módulo:

1. Validar suas fontes, cobertura, licença e identificadores, antes de definir indicadores.
2. Criar esquema, normalização, armazenamento e coleta próprios. Não adaptar o esquema de obras para acomodar registros de natureza diferente.
3. Implementar a funcionalidade em `src/features/<modulo>/` e suas rotas em `src/app/<modulo>/`.
4. Acrescentar o módulo ao registro somente quando suas rotas e dados estiverem disponíveis. Incluir sua entrada na página inicial quando necessário.
5. Publicar a metodologia e o download específicos, com datas de coleta e de atualização separadas.

Despesas, contratos ou convênios poderão ser módulos próprios posteriormente. Sua implementação não faz parte deste lançamento; um contrato vinculado a uma obra continua dentro da ficha de Obras.

## Complemento da CGE

A CGE foi mencionada como complemento para informações relacionadas a Porto Velho. A coleta e o esquema atuais do projeto consultam fontes municipais; esta adaptação de identidade não implementa a integração estadual.

Ao implementar esse complemento, preservar fonte, esfera de governo, data de consulta e evidência de vínculo com PVH. Um CNPJ identifica o fornecedor, mas não associa sozinho um pagamento ou convênio a uma obra. Exigir contrato, processo, convênio ou outro identificador documental verificável. Consultas de sanções devem informar órgão e período, sem inferir irregularidade na obra. Totais municipais e estaduais não podem ser somados sem tratar sobreposição e cobertura.

## Operação

A exportação estática, o download JSON e a sincronização manual existentes continuam atendendo ao primeiro módulo. A inclusão de novos temas não exige antecipar banco, autenticação ou serviços adicionais: esses componentes devem ser adotados quando o uso justificar.
