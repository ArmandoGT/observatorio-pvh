# Como contribuir

O Observatório de Porto Velho é uma iniciativa cívica e independente. Você pode contribuir com melhorias na interface, acessibilidade, documentação, testes, coleta e interpretação dos dados oficiais.

Repositório: [santidev95/observatorio-pvh](https://github.com/santidev95/observatorio-pvh).

## Reportar um problema ou sugerir uma melhoria

Abra uma [issue](https://github.com/santidev95/observatorio-pvh/issues) e descreva:

- A página ou funcionalidade envolvida.
- O que aconteceu e o resultado esperado; inclua os passos para reproduzir um problema.
- Capturas de tela, navegador e dispositivo, quando ajudarem.
- Para questões de dados, o ID do registro, o link da fonte oficial e a data da consulta.

Não publique senhas, tokens, chaves de acesso ou dados pessoais desnecessários em issues, capturas de tela ou arquivos.

## Preparar o ambiente

Você precisa de Node.js 22 ou superior e npm. Faça um fork do repositório no GitHub e clone sua cópia, substituindo `SEU_USUARIO` abaixo:

```sh
git clone https://github.com/SEU_USUARIO/observatorio-pvh.git
cd observatorio-pvh
git switch -c minha-contribuicao
npm ci
npm run dev
```

Abra o endereço informado no terminal. As bases coletadas já estão versionadas: para trabalhar na interface, documentação ou testes, não é necessário configurar Supabase nem executar uma nova coleta.

## Onde encontrar o código

| Caminho                   | Conteúdo                                         |
| ------------------------- | ------------------------------------------------ |
| `src/app/`                | Páginas, rotas e estilos globais                 |
| `src/components/`         | Componentes compartilhados, cabeçalho e rodapé   |
| `src/features/`           | Funcionalidades dos módulos de obras e contratos |
| `src/lib/`                | Leitura, validação e normalização dos dados      |
| `scripts/`                | Coleta, exportação e prévia local                |
| `tests/`                  | Testes de dados e comportamentos críticos        |
| `docs/`                   | Fontes, decisões, arquitetura e operação         |
| `data/` e `public/dados/` | Bases utilizadas pelo site e seus downloads      |

Antes de alterar a coleta ou o significado de um campo, consulte [fontes e limites](docs/fontes.md), [esquema](docs/esquema.md) e [contratos municipais](docs/contratos.md). Para mudanças na persistência, consulte [operação com Supabase](docs/supabase.md).

## Cuidados com os dados

- Preserve a origem, as datas e as limitações de cada informação.
- Campos ausentes devem continuar ausentes: `null` não significa zero.
- Valores contratados, pagos e executados têm significados distintos. Não estime execução física dividindo valores financeiros.
- Relacione obras e contratos somente quando houver vínculo documental explícito; nomes semelhantes ou CNPJ compartilhado não comprovam um vínculo.
- Divergências da fonte devem ser explicadas, sem correções por suposição ou alegações automáticas de irregularidade.
- Não edite os snapshots manualmente para corrigir a fonte. Ajustes de transformação devem ser feitos no código, com evidência e testes quando aplicáveis.
- Use dados sintéticos apenas nos testes. A apresentação pública deve permanecer informativa, neutra e sem propaganda eleitoral.

As rotinas de sincronização podem alterar as bases locais e, quando há credenciais configuradas, persistir dados no Supabase. Execute-as somente quando a contribuição exigir validar a coleta e usando um ambiente de desenvolvimento adequado. Não utilize credenciais de produção para contribuir e não versione arquivos `.env.local`.

## Validar a mudança

Para alterações de código, execute:

```sh
npm run typecheck
npm test
npm run build
```

Para visualizar a exportação estática após o build:

```sh
npm start
```

A prévia estará em `http://127.0.0.1:3000`. Em mudanças visuais, confira telas de computador e celular, navegação por teclado e legibilidade. Em mudanças no tratamento de dados, inclua testes para os casos afetados, especialmente campos ausentes e falhas de coleta.

Para alterações apenas na documentação, revise os links, os comandos e a clareza do texto. Mantenha a formatação dos arquivos existentes e evite reformatações sem relação com a contribuição.

## Enviar um pull request

Envie sua branch para o seu fork e abra um pull request para o repositório original. Mantenha cada contribuição focada em um problema ou melhoria.

Na descrição, inclua:

- O problema e o comportamento resultante da mudança.
- A issue relacionada, se houver.
- As verificações executadas e qualquer limitação conhecida.
- Capturas de tela para alterações visuais.
- Fontes oficiais e critérios utilizados para mudanças nos dados.

A publicação do site e a atualização da base de produção são realizadas pelo fluxo de manutenção do projeto; não é necessário publicar uma versão para enviar uma contribuição.
