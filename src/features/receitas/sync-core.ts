export const revenueApi = "https://api.portovelho.ro.gov.br/api/v1";
export function revenuePageUrl(
  path: "/receitas" | "/receitas/previstas",
  year: number,
  next?: string,
) {
  const url = new URL(next ?? `${revenueApi}${path}`);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.hostname !== "api.portovelho.ro.gov.br" ||
    url.pathname !== `/api/v1${path}` ||
    url.port ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error("Paginação de receitas fora da origem permitida.");
  const page = url.searchParams.get("page") ?? "1";
  if (!/^[1-9]\d*$/.test(page)) throw new Error("Página de receitas inválida.");
  url.protocol = "https:";
  url.search = "";
  url.searchParams.set("portal_id", "12535");
  url.searchParams.set("ano", String(year));
  url.searchParams.set("por-pagina", "1000");
  url.searchParams.set("page", page);
  return url.href;
}
