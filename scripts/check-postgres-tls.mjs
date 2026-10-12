import net from "node:net";
import tls from "node:tls";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// SSLRequest nao contem usuario, senha ou nome do banco.
export function checkPostgresTls(host, port, ca) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let secureSocket;
    let settled = false;
    const timer = setTimeout(
      () => finish(new Error("Tempo de conexao esgotado.")),
      8000,
    );
    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      secureSocket?.destroy();
      socket.destroy();
      if (error) reject(error);
      else resolve(result);
    }
    socket.once("error", (error) => finish(error));
    socket.once("connect", () => {
      const request = Buffer.alloc(8);
      request.writeInt32BE(8, 0);
      request.writeInt32BE(80877103, 4);
      socket.write(request);
    });
    socket.once("data", (data) => {
      if (data.length !== 1 || !["S", "N"].includes(data.toString("ascii"))) {
        finish(new Error("Resposta SSL PostgreSQL invalida."));
        return;
      }
      if (data[0] === 78) {
        finish(null, { tlsSupported: false, identityVerified: false });
        return;
      }
      if (!ca) {
        finish(null, { tlsSupported: true, identityVerified: false });
        return;
      }
      secureSocket = tls.connect({
        socket,
        ca,
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
        servername: net.isIP(host) ? undefined : host,
        checkServerIdentity: (_servername, certificate) =>
          tls.checkServerIdentity(host, certificate),
      });
      secureSocket.once("error", (error) => finish(error));
      secureSocket.once("secureConnect", () => {
        const error = tls.checkServerIdentity(
          host,
          secureSocket.getPeerCertificate(),
        );
        if (error) finish(error);
        else finish(null, { tlsSupported: true, identityVerified: true });
      });
    });
    socket.once("close", () => {
      if (!secureSocket && !settled)
        finish(new Error("Conexao encerrada antes da resposta SSL."));
    });
  });
}

async function main() {
  const [host, portText, caFile] = process.argv.slice(2);
  const port = Number(portText);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(
      "Uso: node scripts/check-postgres-tls.mjs HOST PORTA [CA.crt]",
    );
  const ca = caFile ? await readFile(caFile, "utf8") : undefined;
  const result = await checkPostgresTls(host, port, ca);
  console.log(JSON.stringify(result));
  if (!result.tlsSupported) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.code || error.message);
    process.exitCode = 1;
  });
}
