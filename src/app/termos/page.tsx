import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { observatory } from "@/lib/observatory";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Finalidade do Observatório de Porto Velho, uso dos dados públicos, limitações das informações e pedidos de correção.",
};

const sections = [
  { id: "finalidade", title: "Finalidade e independência" },
  { id: "fontes", title: "Fontes e reutilização dos dados" },
  { id: "limites", title: "Atualização e limites das informações" },
  { id: "uso", title: "Uso responsável" },
  { id: "dados-pessoais", title: "Dados pessoais e links externos" },
  { id: "correcoes", title: "Correções e atualizações destes termos" },
];

export default function TermsPage() {
  return (
    <main id="conteudo" className="container page-main method-page terms-page">
      <header className="method-heading">
        <h1 className="page-title">
          Termos <em>de uso</em>
        </h1>
        <p className="page-intro">
          Como utilizar as informações do observatório, conferir suas fontes e
          compreender os limites dos dados publicados.
        </p>
        <div className="method-meta">
          <span>
            <FileText size={15} aria-hidden="true" />
            Versão 1.0
          </span>
          <span>
            Atualizados em{" "}
            <time dateTime="2026-10-11">11 de outubro de 2026</time>
          </span>
        </div>
      </header>

      <nav className="terms-index" aria-label="Nesta página">
        <span className="eyebrow">NESTA PÁGINA</span>
        <ol>
          {sections.map(({ id, title }) => (
            <li key={id}>
              <a href={`#${id}`}>{title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <article
        className="terms-content"
        aria-label="Termos de uso do observatório"
      >
        <section id="finalidade" aria-labelledby="finalidade-heading">
          <h2 id="finalidade-heading">1. Finalidade e independência</h2>
          <p>
            O {observatory.name} é uma iniciativa cívica independente que
            organiza informações públicas para facilitar o acompanhamento da
            cidade. A consulta é gratuita e não exige cadastro.
          </p>
          <p>
            O projeto não representa a Prefeitura de Porto Velho ou qualquer
            outro órgão público. As páginas têm finalidade informativa e não
            substituem documentos oficiais, certidões, auditorias ou respostas
            dos órgãos responsáveis.
          </p>
        </section>

        <section id="fontes" aria-labelledby="fontes-heading">
          <h2 id="fontes-heading">2. Fontes e reutilização dos dados</h2>
          <p>
            As informações do módulo de obras são compiladas da API municipal,
            com referências ao Portal da Transparência e aos documentos
            publicados pelas fontes. A origem e as datas de consulta acompanham
            os registros. Consulte{" "}
            <Link href="/metodologia/">Fontes e método</Link>.
          </p>
          <p>
            As{" "}
            <a href="https://api.portovelho.ro.gov.br/docs/api">
              regras da API municipal
            </a>{" "}
            permitem acesso público e uso dos dados, respeitadas as limitações
            legais. Estes termos não atribuem uma nova licença a documentos ou
            conteúdos de terceiros. Ao reutilizar informações, confira as
            condições da fonte e preserve o contexto, a origem e a data da
            coleta.
          </p>
          <p>
            Para citar uma consulta, recomendamos indicar o Observatório de
            Porto Velho, o endereço da página, a fonte oficial e a data de
            acesso. A base compilada também está disponível para{" "}
            <a href="/dados/obras.json" download>
              download em JSON
            </a>
            .
          </p>
          <p>
            A imagem da bandeira de Porto Velho utilizada no cabeçalho e no
            ícone do site é de Franklinbaldo, disponível no{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Bandeira_de_Porto_Velho.svg">
              Wikimedia Commons
            </a>{" "}
            sob a licença{" "}
            <a href="https://creativecommons.org/licenses/by/2.5/">
              Creative Commons Atribuição 2.5
            </a>
            . A versão em PNG foi adaptada por recorte para destacar as caixas
            d’água sobre o fundo amarelo.
          </p>
        </section>

        <section id="limites" aria-labelledby="limites-heading">
          <h2 id="limites-heading">3. Atualização e limites das informações</h2>
          <p>
            A coleta é acionada manualmente quando necessário e depende da
            disponibilidade das fontes e da conclusão das verificações. A data
            de coleta não significa que a prefeitura atualizou todos os
            registros naquela data. Se a coleta falhar, a última base válida é
            preservada.
          </p>
          <p>
            A base pode conter campos ausentes, informações antigas e
            divergências entre registros. Não garantimos cobertura de todas as
            obras municipais. Valores contratados, pagamentos e percentuais
            informados têm significados diferentes e devem ser interpretados
            conforme a metodologia.
          </p>
          <p>
            Avisos de qualidade indicam limites dos dados. Eles não constituem
            conclusão sobre irregularidade, responsabilidade individual ou
            execução física de uma obra. Confira o registro e os documentos
            oficiais antes de tomar decisões ou divulgar conclusões.
          </p>
        </section>

        <section id="uso" aria-labelledby="uso-heading">
          <h2 id="uso-heading">4. Uso responsável</h2>
          <p>
            Você pode consultar, comparar e reutilizar as informações dentro das
            condições aplicáveis às fontes. Ao compartilhar análises, diferencie
            os dados publicados das suas interpretações e mantenha visíveis os
            recortes e as limitações relevantes.
          </p>
          <p>
            Não apresente o observatório como órgão oficial ou use sua
            identidade para sugerir um endosso inexistente. Evite acessos
            automatizados que comprometam a disponibilidade do serviço; para
            análises em lote, prefira o arquivo de dados disponível para
            download.
          </p>
        </section>

        <section id="dados-pessoais" aria-labelledby="dados-pessoais-heading">
          <h2 id="dados-pessoais-heading">
            5. Dados pessoais e links externos
          </h2>
          <p>
            A publicidade de um registro não afasta os cuidados com dados
            pessoais. Sua reutilização deve respeitar a finalidade, os direitos
            dos titulares e a legislação aplicável, incluindo a{" "}
            <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm">
              Lei Geral de Proteção de Dados Pessoais
            </a>
            .
          </p>
          <p>
            Links para documentos e outros serviços levam a sites de terceiros,
            sujeitos às próprias condições de uso e privacidade. O observatório
            não controla o conteúdo, a disponibilidade ou as alterações desses
            sites.
          </p>
        </section>

        <section id="correcoes" aria-labelledby="correcoes-heading">
          <h2 id="correcoes-heading">
            6. Correções e atualizações destes termos
          </h2>
          <p>
            Para comunicar erro de apresentação, vínculo incorreto ou uma
            questão sobre dados pessoais,{" "}
            <a href="https://github.com/santidev95/observatorio-pvh/issues">
              abra um pedido no repositório do projeto
            </a>
            . Informe a página, o identificador do registro e a fonte que
            permite conferir o problema. Não publique documentos pessoais ou
            informações sensíveis nesse canal público.
          </p>
          <p>
            Erros no dado original também devem ser encaminhados ao órgão
            publicador pelos canais oficiais. O observatório pode corrigir sua
            apresentação e seus processos de compilação, mas não altera o
            registro mantido pela prefeitura.
          </p>
          <p>
            Estes termos podem ser atualizados conforme o projeto evoluir. A
            versão e a data da revisão ficam indicadas no início desta página.
          </p>
        </section>
      </article>
    </main>
  );
}
