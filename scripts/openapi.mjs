import { readFile, writeFile } from "node:fs/promises";
const html = await readFile(
  new URL("../evidence/api-docs.html", import.meta.url),
  "utf8",
);
const line = html
  .split("\n")
  .find((l) => l.includes("docs.apiDescriptionDocument ="));
const spec = JSON.parse(
  line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/;$/, ""),
);
await writeFile(
  new URL("../evidence/openapi.json", import.meta.url),
  JSON.stringify(spec, null, 2),
);
console.log(
  JSON.stringify({
    servers: spec.servers,
    security: spec.security,
    securitySchemes: spec.components.securitySchemes,
    paths: Object.keys(spec.paths),
  }),
);
for (const [path, item] of Object.entries(spec.paths).filter(([p]) =>
  /obra|contrat/i.test(p),
))
  console.log(JSON.stringify({ path, get: item.get }, null, 2));
