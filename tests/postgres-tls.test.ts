import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

const { checkPostgresTls } = await import(
  new URL("../scripts/check-postgres-tls.mjs", import.meta.url).href
);

async function probeWithResponse(response: string | null) {
  let received: Buffer | undefined;
  const server = net.createServer((socket) => {
    socket.once("data", (data) => {
      received = data;
      if (response === null) socket.end();
      else socket.end(response);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as net.AddressInfo;
  try {
    return {
      result: await checkPostgresTls("127.0.0.1", address.port),
      received,
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("probe TLS envia apenas SSLRequest, sem credenciais", async () => {
  const { result, received } = await probeWithResponse("N");
  assert.deepEqual(result, { tlsSupported: false, identityVerified: false });
  assert.equal(received?.length, 8);
  assert.equal(received?.readInt32BE(0), 8);
  assert.equal(received?.readInt32BE(4), 80877103);
});

test("suporte a TLS sem CA nao e apresentado como identidade verificada", async () => {
  const { result } = await probeWithResponse("S");
  assert.deepEqual(result, { tlsSupported: true, identityVerified: false });
});

test("resposta inesperada ou conexao encerrada nao confirma TLS", async () => {
  await assert.rejects(probeWithResponse("HTTP"), /invalida/);
  await assert.rejects(probeWithResponse(null), /encerrada/);
});
