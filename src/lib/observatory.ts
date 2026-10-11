export const observatory = {
  name: "Observatório de Porto Velho",
  description:
    "Dados públicos de Porto Velho com fontes, contexto e acesso aberto. Comece pelas obras municipais, seus contratos e documentos oficiais.",
};

// Registre aqui apenas módulos implementados, com dados e rotas disponíveis.
export const observatoryModules = [
  {
    id: "obras",
    title: "Obras públicas",
    navigationLabel: "Obras",
    href: "/obras/",
    description:
      "Consulte obras municipais, contratos, pagamentos informados e documentos oficiais da Prefeitura de Porto Velho.",
    downloadHref: "/dados/obras.json",
  },
] as const;

export const worksModule = observatoryModules[0];
