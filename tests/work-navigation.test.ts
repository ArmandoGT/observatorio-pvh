import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultFilters, readFilters } from "../src/lib/work-filters";
import {
  readWorkPage,
  worksReturnUrl,
  worksUrl,
} from "../src/lib/work-navigation";
import { groupWorkDocuments, workTitle } from "../src/lib/work-presentation";

test("return destination preserves combined filters, special characters and pagination", () => {
  const filters = {
    ...defaultFilters,
    q: "São João & drenagem",
    status: "Em Andamento",
    org: "SEMOB",
    sort: "value",
  };
  const url = worksUrl(filters, 3);
  const returnQuery = new URLSearchParams({ from: url }).toString();
  assert.equal(worksReturnUrl(returnQuery), url);
  assert.deepEqual(readFilters(url.split("?")[1]), filters);
  assert.equal(readWorkPage(url.split("?")[1]), 3);
  assert.equal(worksReturnUrl(""), "/obras/");
});

test("return link rejects destinations outside the works catalog", () => {
  for (const from of [
    "https://example.com/obras/",
    "//example.com/obras/",
    "javascript:alert(1)",
    "/contratos/",
    "/obras/pvh-48/",
    "/obras/#hash",
  ]) {
    assert.equal(
      worksReturnUrl(new URLSearchParams({ from }).toString()),
      "/obras/",
    );
  }
});

test("invalid page values never become a negative or nonfinite slice", () => {
  for (const page of ["0", "-1", "1.5", "Infinity", "NaN", "9007199254740992"])
    assert.equal(readWorkPage("page=" + page), 1);
  assert.equal(readWorkPage("?page=2"), 2);
  assert.equal(worksUrl(defaultFilters), "/obras/");
});

test("presentation removes administrative prefixes without altering the official object", () => {
  const official =
    "CONTRATAÇÃO DE EMPRESA ESPECIALIZADA EM OBRAS E SERVIÇOS DE PAVIMENTAÇÃO DE RUAS DO DISTRITO DE VISTA ALEGRE DO ABUNÃ";
  assert.equal(
    workTitle(official),
    "Pavimentação de ruas do distrito de vista alegre do abunã",
  );
  assert.equal(
    workTitle("INFRAESTRUTURA ELÉTRICA DA ETE"),
    "Infraestrutura elétrica da ETE",
  );
  assert.equal(
    workTitle("Construção de praça pública - bairro Flamboyant"),
    "Construção de praça pública - bairro Flamboyant",
  );
  assert.match(official, /^CONTRATAÇÃO/);
});

test("document grouping keeps every original URL and duplicate title with its own origin", () => {
  const documents = [
    {
      title: "CONTRATO",
      url: "https://example.com/obra.pdf",
      kind: "obra" as const,
    },
    {
      title: "CONTRATO",
      url: "https://example.com/contrato.pdf",
      kind: "contrato" as const,
    },
    {
      title: "1º TERMO ADITIVO",
      url: "https://example.com/aditivo.pdf",
      kind: "contrato" as const,
    },
    {
      title: "1ª MEDIÇÃO",
      url: "https://example.com/medicao.pdf",
      kind: "medicao" as const,
    },
    {
      title: "PORTARIA FISCAL",
      url: "https://example.com/portaria.pdf",
      kind: "obra" as const,
    },
  ];
  const groups = groupWorkDocuments(documents);
  assert.deepEqual(
    groups.map((group) => group.title),
    ["Contrato e contratação", "Aditivos", "Medições", "Outros documentos"],
  );
  assert.deepEqual(
    groups
      .flatMap((group) => group.documents)
      .map((document) => document.url)
      .sort(),
    documents.map((document) => document.url).sort(),
  );
  assert.equal(groups[0].documents.length, 2);
  assert.equal(documents.length, 5);
});
