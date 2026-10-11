import { readFile, writeFile } from "node:fs/promises";
const snapshot = JSON.parse(await readFile("data/snapshot.json", "utf8"));
const work = snapshot.works.find((w) => w.sourceId === 47);
const cases = [
  { url: "https://api.portovelho.ro.gov.br/api/v1/obras/30", method: "GET" },
  {
    url: "https://api.portovelho.ro.gov.br/api/v1/obras?por-pagina=1&page=2",
    method: "GET",
  },
  ...work.documents.slice(0, 1).map((d) => ({ url: d.url, method: "HEAD" })),
  ...work.documents
    .filter((d) => d.kind === "contrato")
    .slice(0, 1)
    .map((d) => ({ url: d.url, method: "HEAD" })),
];
const results = [];
for (const c of cases) {
  try {
    const r = await fetch(c.url, {
      method: c.method,
      headers: { Accept: c.method === "GET" ? "application/json" : "*/*" },
      signal: AbortSignal.timeout(15000),
    });
    let detail = {};
    if (c.method === "GET" && r.ok) {
      const data = await r.json();
      detail = {
        id: data.data?.id,
        total: data.meta?.total,
        page: data.meta?.current_page,
        returned: Array.isArray(data.data) ? data.data.length : 1,
      };
    }
    results.push({
      ...c,
      status: r.status,
      contentType: r.headers.get("content-type"),
      contentLength: r.headers.get("content-length"),
      ...detail,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    results.push({
      ...c,
      error: error.message,
      checkedAt: new Date().toISOString(),
    });
  }
}
await writeFile(
  "evidence/endpoint-verification.json",
  JSON.stringify(results, null, 2) + "\n",
);
console.log(JSON.stringify(results, null, 2));
