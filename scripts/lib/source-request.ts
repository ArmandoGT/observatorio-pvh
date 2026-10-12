const maxAttempts = 4;
const maxRetryWaitMs = 5 * 60 * 1000;
const municipalIntervalMs = 1500;

export function retryAfterMs(value: string | null, now: number): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const ms = Number(trimmed) * 1000;
    return Number.isFinite(ms) ? ms : null;
  }
  if (/^[+-]?\d/.test(trimmed)) return null;
  const date = Date.parse(trimmed);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

interface RequestOptions {
  fetch?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  warn?: (message: string) => void;
}

export function createSourceRequester(options: RequestOptions = {}) {
  const request = options.fetch ?? globalThis.fetch;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const warn = options.warn ?? console.warn;
  let nextMunicipalRequestAt = 0;

  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    const municipal = new URL(url).hostname === "api.portovelho.ro.gov.br";
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (municipal) {
        const start = Math.max(now(), nextMunicipalRequestAt);
        nextMunicipalRequestAt = start + municipalIntervalMs;
        const wait = start - now();
        if (wait > 0) await sleep(wait);
      }
      let response: Response;
      try {
        response = await request(url, {
          ...init,
          signal: init.signal ?? AbortSignal.timeout(15000),
        });
      } catch (error) {
        if (attempt === maxAttempts - 1 || init.signal?.aborted) throw error;
        const delay = 1000 * 2 ** attempt;
        warn(
          `[coleta] Falha de rede; nova tentativa ${attempt + 2}/${maxAttempts} em ${delay / 1000}s.`,
        );
        await sleep(delay);
        continue;
      }
      if (
        ![429, 502, 503, 504].includes(response.status) ||
        attempt === maxAttempts - 1
      )
        return response;

      const delay =
        retryAfterMs(response.headers.get("retry-after"), now()) ??
        (response.status === 429 ? 60000 : 1000) * 2 ** attempt;
      await response.body?.cancel();
      if (delay > maxRetryWaitMs)
        throw new Error(
          `API solicitou espera superior a 5 minutos (HTTP ${response.status}); coleta interrompida para respeitar Retry-After.`,
        );
      warn(
        `[coleta] HTTP ${response.status}; nova tentativa ${attempt + 2}/${maxAttempts} em ${delay / 1000}s.`,
      );
      await sleep(delay);
    }
    throw new Error("Tentativas de coleta esgotadas.");
  };
}
