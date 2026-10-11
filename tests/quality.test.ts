import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeWork } from "../src/lib/normalize";
test("payment above the work contract is preserved and described without assigning a cause", () => {
  const w = normalizeWork(
    {
      id: 1,
      nome: "FIXTURE DE TESTE",
      valor_contratado: { value: 10 },
      valor_pago: { value: 20 },
    },
    null,
    "2026-10-11T00:00:00Z",
  );
  assert.equal(w.contractedCents, 1000);
  assert.equal(w.paidCents, 2000);
  assert.ok(w.issues.some((s) => s.includes("nenhuma causa é presumida")));
});
