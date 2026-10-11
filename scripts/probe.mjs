import { mkdir, writeFile } from "node:fs/promises";
const dir = new URL("../evidence/", import.meta.url);
await mkdir(dir, { recursive: true });
const urls = [
  ["portal", "https://transparencia.portovelho.ro.gov.br/obras"],
  ["api-docs", "https://api.portovelho.ro.gov.br/docs/api"],
  ["dados", "https://dados.portovelho.ro.gov.br/"],
  [
    "robots-transparencia",
    "https://transparencia.portovelho.ro.gov.br/robots.txt",
  ],
  ["robots-api", "https://api.portovelho.ro.gov.br/robots.txt"],
  ["robots-dados", "https://dados.portovelho.ro.gov.br/robots.txt"],
];
const results = await Promise.all(
  urls.map(async ([id, url]) => {
    const started = Date.now();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: {
          "User-Agent": "ObservatorioObrasPVH/0.1 (public civic data research)",
        },
      });
      const body = await response.text();
      await writeFile(new URL(`${id}.html`, dir), body);
      return {
        id,
        url,
        finalUrl: response.url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        bytes: Buffer.byteLength(body),
        durationMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        id,
        url,
        error: error.message,
        checkedAt: new Date().toISOString(),
      };
    }
  }),
);
await writeFile(new URL("probe.json", dir), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
