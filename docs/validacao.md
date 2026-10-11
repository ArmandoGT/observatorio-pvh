# Validação da entrega

Verificações executadas em 11/10/2026. Testes locais, requisições HTTP e inspeção no navegador têm propósitos diferentes; não comprovam funcionamento futuro da API municipal ou atualização contínua do site.

## Dados e integrações

- Lista real coletada com total validado: 48 obras; 47 contratos associados por ID explícito; todos responderam HTTP 200 na coleta.
- HTTP 200 confirmado no detalhe `/obras/30`, na página 2 com uma obra por página, no CSV de 2026 e em uma amostra de despesas com obras.
- Dois links de PDF, um da obra e um do contrato de ID 3574, responderam HEAD HTTP 200 com `application/pdf`. Não houve download nem auditoria dos 730 documentos.
- API e portal consultados; catálogo retorna HTTP 502. Evidências em `evidence/` e documentação em `docs/fontes.md`.

## Código

- TypeScript em modo estrito.
- Testes de formatos monetários, null versus zero, percentual ausente/inválido, calendário, datas futuras, URLs de documentos, texto HTML, hash estável, merge incremental, retenção histórica, duplicatas e preservação em falha.
- Teste da base publicada: esquema válido, IDs únicos, proveniência e SHA-256. Teste confirma igualdade do snapshot e do JSON para download.
- Construção Next.js com a base real: home, listagem, metodologia, 404 e 48 fichas.
- Construção com base vazia validada por `scripts/verify-empty-build.mjs`. A rota `base-indisponivel` é uma página de estado vazio exigida pelo export estático; não é registro de obra.

O script de base vazia restaura `data/snapshot.json` em `finally`, mas deixa `out/` com o build de teste. Execute o build normal antes de publicar ou usar a prévia real. Não execute esse teste em paralelo com uma coleta.

## Navegador

- Prévia local da exportação estática.
- Home e ficha de obra revisadas em desktop e viewport de **390 × 844**.
- Busca por “alphaville” retornou duas obras; filtro “Finalizada” retornou uma, correspondente à praça do Alphaville.
- Filtro de órgão “SEMUSA” retornou seis obras e persistiu após recarregar a URL.
- Busca sem correspondência exibiu zero resultados e a ação de limpar busca. Paginação avançou para a página 2 de 4.
- Nenhum erro de console observado nessas interações. Nenhum overflow horizontal na home no viewport padrão da prévia.
- Ficha conferida com contrato, valores, medições, documentos e divergência entre valor da obra e valor do contrato.
- Labels dos campos, estado de resultado, navegação e ordem de títulos inspecionados no DOM.

Revisão de acessibilidade é básica; não certifica conformidade WCAG integral. Testes de leitores de tela, contraste de todas as variações e navegadores adicionais são próximos passos de QA.

## Limites operacionais

- Nenhum PostgreSQL, CI remoto ou agendamento de coleta foi configurado.
- A base pública é um snapshot. Falha de coleta só aparece na versão hospedada após reconstrução/publicação.
- Testes unitários simulam falhas e ausências; não foi provocada indisponibilidade do serviço municipal.
- O Site é hospedagem estática. Publicação verificada pelo serviço Sites é distinta da inspeção local no navegador.
