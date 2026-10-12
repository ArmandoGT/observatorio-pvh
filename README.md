# Observatório de Porto Velho

O módulo **Contratos municipais** está implementado no código em `/contratos/`,
com catálogo, fichas estáticas, documentos e vínculos por ID com as obras.
Consulte [escopo, coleta e validação de contratos](docs/contratos.md).

MVP cívico independente para consultar obras municipais, contratos associados e documentos oficiais. Next.js 16.4.0, React 19.3.0 e TypeScript. Interface baseada no Figma: tema escuro `#131313`, superfÃ­cies `#201F1F`, amarelo-ouro `#F2C230` e fonte Geist. Consulte [a aplicaÃ§Ã£o do design](docs/design-figma.md).

Obras é o primeiro módulo disponível. A identidade do portal e a navegação são comuns; novos temas podem ser acrescentados com suas próprias fontes e rotas. Consulte [o recorte e a expansão do observatório](docs/observatorio.md). Site público: [pvh.dadosabertos.org](https://pvh.dadosabertos.org/).

## Executar

Requer Node.js 22 ou superior e npm. Não requer banco de dados, conta municipal ou token para a coleta atualmente validada.

```sh
npm ci
npm run dev
```

Abra o endereço local mostrado no terminal. A base oficial coletada está incluída no projeto, portanto o site inicia mesmo sem acesso à internet.

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serve a exportação estática em `http://127.0.0.1:3000`. É um servidor de prévia local, não um servidor de produção. A hospedagem de produção deve servir `out/`, respeitando diretórios com `index.html` e `404.html`.

## Atualizar dados

O coletor persiste no Supabase, guardando o histórico e exportando a mesma base JSON para o site. O workflow `.github/workflows/update-data.yml` coleta e publica diariamente às 06:17 de Porto Velho, após pushes em `main` e por execução manual. Projeto, migração e secrets estão configurados: consulte [persistência e operação com Supabase](docs/supabase.md).

```sh
npm run sync
npm run sync:contracts
npm run build
```

O comando percorre toda a paginação de `/api/v1/obras`, valida o total retornado, consulta os contratos pelo ID explícito e gera `data/snapshot.json` e `public/dados/obras.json`. Novos dados chegam à hospedagem estática após reconstrução e publicação pelo workflow. A coleta diária depende da disponibilidade das fontes e não representa atualização em tempo real.

O armazenamento é incremental por ID e hash de conteúdo: primeira coleta, última alteração e registros ausentes são preservados. A leitura da API continua sendo uma varredura completa porque `/obras` não documenta filtro por atualização. Não se presume suporte a ETag, webhook ou cursor temporal.

Falha da API principal, envelope inválido, paginação incompleta ou IDs duplicados impedem substituir a base válida. Falha em um contrato usa o cache anterior quando disponível, marca o registro e a coleta como parciais. Ausência da API de dados abertos não impede a coleta pela API municipal.

`PMPV_API_TOKEN` é opcional, apenas se o acesso municipal mudar futuramente. Não foi necessário na validação. Não coloque tokens em arquivos publicados. Um lock em `data/sync.lock` impede execuções simultâneas. Se o processo for interrompido externamente, remova o lock somente após confirmar que não há sincronização em execução.

## O que foi validado em 11/10/2026

- API municipal: acesso anônimo HTTP 200 para obras, contratos vinculados e uma amostra de despesas com obras; CSV de obras de 2026 respondeu HTTP 200.
- 48 obras e 47 contratos distintos coletados; 730 links oficiais de documentos na base normalizada. Links repetidos são deduplicados dentro de cada obra.
- Portal da Transparência: HTTP 200, consulta padrão com quatro obras no exercício de 2026; data global declarada `23/07/2026`, distinta das atualizações por registro.
- Catálogo `dados.portovelho.ro.gov.br`: HTTP 502. Seus datasets, licença e periodicidade não puderam ser confirmados.
- Cinco obras sem percentual na API; duas datas de contrato na ficha da obra posteriores à data de coleta; 16 divergências entre valor da ficha da obra e valor do contrato vinculado. Os valores não são corrigidos por inferência.
- Atualizações dos registros da API entre 06/06/2024 e 09/06/2026. Não há SLA ou frequência oficial confirmada.

Esses números descrevem esta coleta e podem mudar. Consulte o arquivo de fontes e a base para a evidência e a data exata. Nenhuma obra fictícia foi incluída no site; fixtures sintéticas ficam apenas nos testes.

## Funcionalidades

- Visão geral com cobertura das somas, sem tratar a base como orçamento atual ou censo municipal completo.
- Busca por objeto, localização, contrato, processo e fornecedor; filtros por situação e órgão, ordenação e paginação.
- URLs preservam busca e filtros. Bairro permanece indisponível porque a fonte não oferece campo padronizado.
- 48 fichas estáticas com valores, contratos, vigências, medições, anexos, proveniência e limites de qualidade.
- Página de fontes e método, download JSON, estado sem resultados, estado sem base, falha de coleta e 404.
- HTML semântico, labels, foco visível, link para pular ao conteúdo, resultados anunciados e respeito à preferência por movimento reduzido.

## Estrutura

```text
src/app/               páginas e apresentação
src/components/        navegação, consulta e situação
src/lib/schema.ts      contrato validado em Zod
src/lib/normalize.ts   formatos municipais → modelo local
src/lib/sync-core.ts   merge, retenção histórica e paginação
src/lib/data.ts        snapshot consumido no build
scripts/sync.ts        ingestão e auditoria das fontes
scripts/probe*.mjs     reprodução da investigação pública
data/snapshot.json     base normalizada e estado de coleta
data/contracts.json    cache dos contratos vinculados
data/raw/              respostas locais por hash (não publicadas)
public/dados/          download da mesma base usada no site
evidence/              relatórios HTTP e OpenAPI extraída
docs/                  fontes, arquitetura, esquema e validação
tests/                 testes dos contratos e comportamentos críticos
out/                   exportação gerada (não versionada)
```

## Método

**Contratado**, **pago** e **executado** não são intercambiáveis. O percentual municipal é apresentado como indicador informado pela fonte, sem afirmar que mede progresso físico. Não dividimos pago por contratado para inventar execução física. Campos ausentes permanecem `null`; zero publicado continua zero. Datas divergentes, valores de contratos diferentes e dados antigos são sinalizados, sem alegação automática de irregularidade.

Ver [fontes](docs/fontes.md), [arquitetura](docs/arquitetura.md), [esquema](docs/esquema.md) e [validação](docs/validacao.md).

## Próximos passos

1. Confirmar com o órgão publicador o significado de `porcentagem_executado`, `data_contrato`, `execucao` e `valor_a_medir`, além da periodicidade de publicação.
2. Revalidar o catálogo quando retornar; identificar datasets e licença específica, sem substituir silenciosamente a origem.
3. Acompanhar as execuções diárias no GitHub Actions e renovar o token Cloudflare antes de 09/01/2027.
4. Expandir a persistência PostgreSQL para novos módulos conforme suas fontes forem validadas. O domínio já usa IDs de origem, centavos e timestamps separados.
5. Associar despesas apenas quando houver relação documental inequívoca. Não adicionar mapa ou denúncias neste corte.

## Hospedagem

Para publicar como aplicação no Cloudflare Workers, o projeto inclui `wrangler.jsonc` apontando para `out/` e Wrangler como ferramenta de desenvolvimento. Use build `npm run build` e deploy `npm run deploy`. Consulte [a configuração e o diagnóstico de deploy na Cloudflare](docs/cloudflare.md).

O projeto gera uma exportação estática Next.js compatível com qualquer hospedagem estática. `.openai/hosting.json` identifica o Site do Work e declara `out/`. Não há dependência do serviço Sites para executar, coletar dados ou construir o projeto localmente.

O código pode ser adaptado para execução com servidor Next.js retirando `output: 'export'`. A persistência PostgreSQL está disponível no coletor; o site público continua estático e não oferece uma API de escrita.
