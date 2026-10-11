# Design do Figma aplicado

Referência: https://www.figma.com/design/NWLEgOhVoh7p678gZ3b3Ip/Sem-t%C3%ADtulo?node-id=0-1

Implementação em 11/10/2026, obtida pelo MCP do Figma. Frames: visão geral `2:2`, detalhes `2:307`, metodologia `2:583` e exploração `2:856`.

O tema usa fundo `#131313`, superfícies `#201F1F`, títulos `#E5E2E1`, texto secundário `#D1C5AD` e amarelo `#F2C230`. A fonte Geist é carregada pelo Next.js e servida pelo próprio site. Logo e ícones originais foram baixados para `public/figma/`; o código não depende das URLs temporárias do Figma.

## Comportamentos

- Visão geral com busca, sugestões derivadas da base, métricas reais, indicadores expansíveis e tabela de cinco registros recentes.
- Exploração com busca sem distinção de acentos, filtros por situação e órgão, atalhos por situação, ordenação e paginação. A URL conserva os filtros; bairro permanece indisponível quando a fonte não oferece esse campo.
- Ficha com abas de visão geral, histórico e medições, contrato e documentos. As abas aceitam teclado e links diretos por fragmento. Compartilhamento usa o recurso nativo quando disponível, com cópia do link como alternativa.
- Metodologia com fontes, definições e limitações em painéis expansíveis, seção Sobre e download da mesma base JSON.
- Layout responsivo, tabela com rolagem horizontal própria, foco visível e respeito a movimento reduzido.

## Adaptação aos dados disponíveis

Os valores, datas e fornecedores do mockup não substituem os registros oficiais. O percentual continua identificado como execução informada pela fonte, sem alegação de medição física. Não foram atribuídas fotografias ou mapas do exemplo a obras reais: a base não fornece fotos de campo ou coordenadas verificadas. A localização é exibida em texto.

Os links de documentos permanecem os publicados pela fonte. O projeto não passa a declarar integração com TCE-RO, PNCP, Diário Oficial, coleta semanal, licença CC BY, denúncias ou classificação automática de irregularidade, pois esses recursos não existem no MVP atual.

## Validação local

- 20 testes aprovados, incluindo cinco novos casos de busca, combinação de filtros, URLs e ordenação com valores ausentes.
- Checagem TypeScript sem erros.
- Build estático Next.js aprovado: 54 páginas geradas, incluindo as 48 fichas.
- Verificação no navegador em desktop de 1280 px e celular de 390 px: busca, filtros, ordenação, paginação, ausência de resultados, indicadores, abas e painéis de metodologia.
- Logo e ícones visíveis carregados; dimensões dos SVGs preservadas. Tabelas rolam dentro do próprio painel em telas pequenas.

A validação é local; não houve publicação ou alteração dos dados coletados.
