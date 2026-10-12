import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { snapshotSchema } from "../src/lib/schema";
test("published snapshot validates, uses unique official IDs and includes traceability", async () => {
  const snapshot = snapshotSchema.parse(
    JSON.parse(await readFile("data/snapshot.json", "utf8")),
  );
  const ids = snapshot.works.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const w of snapshot.works) {
    assert.equal(w.id, `pvh-${w.sourceId}`);
    assert.ok(
      w.sourceUrl.startsWith("https://api.portovelho.ro.gov.br/api/v1/obras/"),
    );
    assert.match(w.contentHash, /^[a-f0-9]{64}$/);
    assert.ok(w.collectedAt);
    assert.equal(w.neighborhood, null);
  }
});
test("local export matches the ingestion snapshot", async () => {
  const built = JSON.parse(await readFile("data/snapshot.json", "utf8")),
    download = JSON.parse(await readFile("data/exports/obras.json", "utf8"));
  assert.deepEqual(download, built);
});
