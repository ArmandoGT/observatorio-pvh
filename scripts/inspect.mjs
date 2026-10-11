import { readFile } from "node:fs/promises";
for (const file of process.argv.slice(2)) {
  const html = await readFile(file, "utf8");
  console.log(file);
  for (const line of html
    .split("\n")
    .filter((l) =>
      /swagger|openapi|spec-url|export|datatable|data-ajax|url:|fetch|exercicio|<script|api\//i.test(
        l,
      ),
    )
    .slice(0, 55))
    console.log(line.slice(0, 1600));
}
