export const observatory = {
  name: "Observatório de Porto Velho",
  description:
    "Dados públicos de Porto Velho com fontes, contexto e acesso aberto. Explore obras municipais, contratos, receitas e documentos oficiais.",
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
  {
    id: "contratos",
    title: "Contratos municipais",
    navigationLabel: "Contratos",
    href: "/contratos/",
    description:
      "Explore empresas contratadas, valores, vigência, aditivos, documentos e obras vinculadas aos contratos municipais.",
    downloadHref: "/dados/contratos.json",
  },
  {
    id: "receitas",
    title: "Receitas e orçamento",
    navigationLabel: "Receitas",
    href: "/receitas/",
    description:
      "Acompanhe a previsão anual, a arrecadação por mês e unidade gestora e os documentos oficiais de planejamento orçamentário.",
    downloadHref: "/dados/receitas.json",
  },
] as const;

export const worksModule = observatoryModules[0];
export const contractsModule = observatoryModules[1];
export const revenueModule = observatoryModules[2];
