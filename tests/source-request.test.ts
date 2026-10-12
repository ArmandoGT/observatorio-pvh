import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSourceRequester,
  retryAfterMs,
} from "../scripts/lib/source-request";

const url =
  "https://api.portovelho.ro.gov.br/api/v1/contratos?modelo=Contratos";
const initialTime = Date.parse("2026-10-11T12:00:00Z");

function harness(replies: Array<Response | Error>) {
  let time = initialTime;
  const starts: number[] = [];
  const waits: number[] = [];
  const signals: Array<AbortSignal | null | undefined> = [];
  const request = createSourceRequester({
    now: () => time,
    sleep: async (ms) => {
      waits.push(ms);
      time += ms;
    },
    warn: () => {},
    fetch: async (_input, init) => {
      starts.push(time);
      signals.push(init?.signal);
      const reply = replies.shift();
      assert.ok(reply, "Não deveria fazer uma chamada extra.");
      if (reply instanceof Error) throw reply;
      return reply;
    },
  });
  return { request, starts, waits, signals };
}

test("coleta: respeita Retry-After em segundos antes de repetir a mesma página", async () => {
  const h = harness([
    new Response(null, { status: 429, headers: { "Retry-After": "61" } }),
    Response.json({ data: [{ id: 1 }] }),
  ]);
  assert.deepEqual(await (await h.request(url)).json(), { data: [{ id: 1 }] });
  assert.deepEqual(h.waits, [61000]);
  assert.equal(h.starts[1] - h.starts[0], 61000);
});

test("coleta: respeita Retry-After como data HTTP e espaça páginas mesmo sem erro", async () => {
  const h = harness([
    new Response(null, {
      status: 429,
      headers: { "Retry-After": "Sun, 11 Oct 2026 12:01:30 GMT" },
    }),
    Response.json({ page: 1 }),
    Response.json({ page: 2 }),
  ]);
  await h.request(url);
  await h.request(url + "&page=2");
  assert.deepEqual(h.waits, [90000, 1500]);
});

test("coleta: limite persistente tem esperas crescentes e termina após quatro tentativas", async () => {
  const h = harness(
    Array.from({ length: 4 }, () => new Response(null, { status: 429 })),
  );
  const response = await h.request(url);
  assert.equal(response.status, 429);
  assert.equal(h.starts.length, 4);
  assert.deepEqual(h.waits, [60000, 120000, 240000]);
});

test("coleta: não antecipa uma espera maior que o orçamento e não repete erros permanentes", async () => {
  const h = harness([
    new Response(null, { status: 429, headers: { "Retry-After": "3600" } }),
  ]);
  await assert.rejects(h.request(url), /superior a 5 minutos/);
  assert.equal(h.starts.length, 1);
  assert.deepEqual(h.waits, []);
  const invalid = harness([new Response(null, { status: 401 })]);
  assert.equal((await invalid.request(url)).status, 401);
  assert.equal(invalid.starts.length, 1);
});

test("coleta: falha de rede renova o timeout e falha temporária pode recuperar", async () => {
  const h = harness([
    new TypeError("fetch failed"),
    new Response(null, { status: 503, headers: { "Retry-After": "2" } }),
    Response.json({ ok: true }),
  ]);
  assert.equal((await h.request(url)).status, 200);
  assert.equal(h.starts.length, 3);
  assert.notEqual(h.signals[0], h.signals[1]);
  assert.notEqual(h.signals[1], h.signals[2]);
  assert.ok(h.starts.every((time, i) => !i || time - h.starts[i - 1] >= 1500));
});

test("coleta: cabeçalho ausente ou inválido usa fallback; data passada não atrasa", () => {
  for (const value of [null, "", "amanhã", "1.5", "-1"])
    assert.equal(retryAfterMs(value, initialTime), null);
  assert.equal(retryAfterMs("0", initialTime), 0);
  assert.equal(retryAfterMs("Sun, 11 Oct 2026 11:59:00 GMT", initialTime), 0);
});
