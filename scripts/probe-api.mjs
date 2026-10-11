import { readFile, writeFile } from "node:fs/promises";
const spec = JSON.parse(
  await readFile(new URL("../evidence/openapi.json", import.meta.url), "utf8"),
);
for (const name of ["ObraResource", "ContratoResource", "DespesaObraResource"])
  console.log(
    JSON.stringify({ name, schema: spec.components.schemas[name] }, null, 2),
  );
const paths = [
  "obras?por-pagina=100",
  "contratos?por-pagina=1",
  "despesas/obras?por-pagina=1",
  "obras/exportar/csv?ano=2026",
];
const results = [];
for (const path of paths) {
  const url = `https://api.portovelho.ro.gov.br/api/v1/${path}`;
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const body = await r.text();
    const id = path.split("?")[0].replaceAll("/", "-");
    await writeFile(
      new URL(`../evidence/api-${id}.json`, import.meta.url),
      body,
    );
    results.push({
      url,
      status: r.status,
      contentType: r.headers.get("content-type"),
      bytes: Buffer.byteLength(body),
      sample: body.slice(0, 150),
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    results.push({
      url,
      error: e.message,
      checkedAt: new Date().toISOString(),
    });
  }
}
await writeFile(
  new URL("../evidence/api-probe.json", import.meta.url),
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
