export const STORAGE_KEY = "lapave.v1";

// Stub temporário mantido para compatibilidade — removido em refactor futuro
export const moduleLabels = {};

export const seedData = {
  solicitantes: [
    {
      id: "sol-huv",
      nome: "HUV — Hospital Universitário Veterinário",
      crmv: "",
      telefone: "(98) 3245-0000",
      email: "huv@uema.br",
      endereco: "Campus Paulo VI, São Luís — MA",
      especies: "Cães, gatos, equinos, silvestres",
    },
  ],
  tutores: [
    {
      id: "tut-joao",
      nome: "João Silva",
      cpf: "123.456.789-10",
      telefone: "(98) 98765-4321",
      email: "joao@email.com",
      cidade: "São Luís",
      endereco: "Renascença, São Luís — MA",
    },
    {
      id: "tut-maria",
      nome: "Maria Costa",
      cpf: "234.567.890-11",
      telefone: "(98) 99876-5432",
      email: "maria@email.com",
      cidade: "São Luís",
      endereco: "Cohama, São Luís — MA",
    },
  ],
  pacientes: [
    {
      id: "pac-thor",
      nome: "Thor",
      especie: "Canino",
      raca: "Golden Retriever",
      idade: "4 anos",
      sexo: "Macho",
      pelagem: "Dourada",
      peso: "28 kg",
      tutorId: "tut-joao",
    },
    {
      id: "pac-luna",
      nome: "Luna",
      especie: "Felino",
      raca: "Siamês",
      idade: "2 anos",
      sexo: "Fêmea",
      pelagem: "Seal point",
      peso: "4 kg",
      tutorId: "tut-maria",
    },
  ],
  amostras: [
    {
      id: "amo-001",
      protocolo: "LAPAVE-20260428-001",
      rc: "RC-0001/2026",
      pacienteId: "pac-thor",
      solicitanteId: "sol-huv",
      tipoExame: "citologico",
      material: "Punção aspirativa por agulha fina em nódulo subcutâneo",
      tecnicaColeta: "PAAF",
      coloracao: "PANÓTIPO RÁPIDO",
      responsavelColeta: "Prof. Fábio",
      historico: "Nódulo subcutâneo em região lateral direita, evolução de 3 meses.",
      condicao: "adequada",
      prioridade: "normal",
      status: "laudo_liberado",
      dataColeta: "2026-04-14",
      dataRecebimento: "2026-04-14",
      dataEntrada: "2026-04-14",
      dataResultado: "2026-04-16",
      dataEntregue: "",
      observacoes: "",
      caracteristicasLesao: ["NÓDULO"],
      localizacaoLesao: [],
      neoplasia: { consistencia: "FIRME", massaUlcerada: false, tumorAderido: "PELE", movel: true, secrecao: false, coloracao: "", linfonodos: false, quaisLinfonodos: "" },
      terapiaRecente: "",
      enfermidadesIntercorrentes: "",
      suspeitaClinica: "Lipoma vs mastocitoma",
      animalCastrado: false,
      intencaoCastracao: "",
    },
    {
      id: "amo-002",
      protocolo: "LAPAVE-20260428-002",
      rc: "RC-0002/2026",
      pacienteId: "pac-luna",
      solicitanteId: "sol-huv",
      tipoExame: "citologico",
      material: "Punção aspirativa de lesão cutânea em região dorsal",
      tecnicaColeta: "PAAF",
      coloracao: "GIEMSA",
      responsavelColeta: "Carol",
      historico: "",
      condicao: "adequada",
      prioridade: "alta",
      status: "em_analise",
      dataColeta: "2026-04-28",
      dataRecebimento: "2026-04-28",
      dataEntrada: "2026-04-28",
      dataResultado: "",
      dataEntregue: "",
      observacoes: "Lesão ulcerada, bordas irregulares.",
      caracteristicasLesao: ["ÚLCERA", "NÓDULO"],
      localizacaoLesao: [],
      neoplasia: {},
      terapiaRecente: "",
      enfermidadesIntercorrentes: "",
      suspeitaClinica: "",
      animalCastrado: true,
      intencaoCastracao: "",
    },
  ],
  laudos: [
    {
      id: "lau-001",
      amostraId: "amo-001",
      materialEnviado: "Punção aspirativa por agulha fina em nódulo subcutâneo lateral direito. Esfregaços corados pelo método Panótico Rápido.",
      macro: "Material representativo, boa celularidade.",
      micro: "População celular composta predominantemente por adipócitos maduros, sem atipia significativa.",
      diagnostico: "Lipoma — neoplasia mesenquimal benigna.",
      comentarios: "Prognóstico favorável. Exérese cirúrgica eletiva.",
      responsavel: "Prof. Fábio",
      liberadoPor: "usr-fabio",
      liberadoEm: "2026-04-16",
    },
  ],
  financeiro: [],
  estoque: [
    {
      id: "est-formalina",
      nome: "Formalina 10%",
      categoria: "Fixador",
      quantidade: 23,
      qtdMinima: 30,
      qtdMaxima: 120,
      validade: "2026-11-20",
      restrito: true,
    },
    {
      id: "est-panotipo",
      nome: "Panótico Rápido",
      categoria: "Corante",
      quantidade: 8,
      qtdMinima: 10,
      qtdMaxima: 50,
      validade: "2027-02-10",
      restrito: false,
    },
    {
      id: "est-giemsa",
      nome: "Giemsa",
      categoria: "Corante",
      quantidade: 15,
      qtdMinima: 10,
      qtdMaxima: 50,
      validade: "2027-05-20",
      restrito: false,
    },
    {
      id: "est-luvas",
      nome: "Luvas nitrílicas M",
      categoria: "EPI",
      quantidade: 8,
      qtdMinima: 20,
      qtdMaxima: 100,
      validade: "",
      restrito: false,
    },
  ],
  usuarios: [
    {
      id: "usr-fabio",
      nome: "Prof. Fábio",
      email: "fabio@uema.br",
      perfil: "professor",
      status: "ativo",
    },
    {
      id: "usr-carol",
      nome: "Carol",
      email: "carol@uema.br",
      perfil: "coordenador",
      status: "ativo",
    },
    {
      id: "usr-aluno1",
      nome: "Aluno 1",
      email: "aluno1@uema.br",
      perfil: "aluno",
      status: "ativo",
    },
    {
      id: "usr-aluno2",
      nome: "Aluno 2",
      email: "aluno2@uema.br",
      perfil: "aluno",
      status: "ativo",
    },
  ],
  auditoria: [
    {
      id: "aud-001",
      acao: "Laudo liberado: RC-0001/2026",
      entidade: "Laudos",
      ator: "Prof. Fábio",
      registradoEm: "2026-04-16T14:00:00.000Z",
    },
  ],
};

export function createInitialData() {
  return JSON.parse(JSON.stringify(seedData));
}

export function normalizeDataset(input = {}) {
  const base = createInitialData();
  const src = input && typeof input === "object" ? input : {};

  return {
    solicitantes: normalizeCollection(src.solicitantes, base.solicitantes, normalizeSolicitante),
    tutores: normalizeCollection(src.tutores, base.tutores, normalizeTutor),
    pacientes: normalizeCollection(src.pacientes, base.pacientes, normalizePaciente),
    amostras: normalizeCollection(src.amostras, base.amostras, normalizeAmostra),
    laudos: normalizeCollection(src.laudos, base.laudos, normalizeLaudo),
    financeiro: normalizeCollection(src.financeiro, base.financeiro, normalizeFinanceiro),
    estoque: normalizeCollection(src.estoque, base.estoque, normalizeEstoque),
    usuarios: normalizeCollection(src.usuarios, base.usuarios, normalizeUsuario),
    auditoria: normalizeCollection(src.auditoria, base.auditoria, normalizeAuditoria),
  };
}

function normalizeCollection(value, fallback, mapper) {
  return (Array.isArray(value) ? value : fallback)
    .filter((r) => r && typeof r === "object")
    .map(mapper)
    .filter((r) => r && r.id);
}

function normalizeSolicitante(r) {
  return {
    id: r.id, nome: r.nome || "", crmv: r.crmv || "", telefone: r.telefone || "",
    email: r.email || "", endereco: r.endereco || "", especies: r.especies || "",
    criadoEm: r.criadoEm, atualizadoEm: r.atualizadoEm,
  };
}

function normalizeTutor(r) {
  return {
    id: r.id, nome: r.nome || "", cpf: r.cpf || "", telefone: r.telefone || "",
    email: r.email || "", cidade: r.cidade || "", endereco: r.endereco || "",
    criadoEm: r.criadoEm, atualizadoEm: r.atualizadoEm,
  };
}

function normalizePaciente(r) {
  return {
    id: r.id, nome: r.nome || "", especie: r.especie || "", raca: r.raca || "",
    idade: r.idade || "", sexo: r.sexo || "", pelagem: r.pelagem || "",
    peso: r.peso || "", tutorId: r.tutorId || null,
    criadoEm: r.criadoEm, atualizadoEm: r.atualizadoEm,
  };
}

function normalizeAmostra(r) {
  return {
    id: r.id,
    protocolo: r.protocolo || "",
    rc: r.rc || "",
    pacienteId: r.pacienteId || null,
    solicitanteId: r.solicitanteId || null,
    tipoExame: r.tipoExame || "citologico",
    material: r.material || "",
    tecnicaColeta: r.tecnicaColeta || "",
    coloracao: r.coloracao || "",
    responsavelColeta: r.responsavelColeta || "",
    historico: r.historico || "",
    condicao: r.condicao || "adequada",
    prioridade: r.prioridade || "normal",
    status: r.status || "recebida",
    dataColeta: r.dataColeta || "",
    dataRecebimento: r.dataRecebimento || "",
    dataEntrada: r.dataEntrada || "",
    dataResultado: r.dataResultado || "",
    dataEntregue: r.dataEntregue || "",
    observacoes: r.observacoes || "",
    caracteristicasLesao: Array.isArray(r.caracteristicasLesao) ? r.caracteristicasLesao : [],
    localizacaoLesao: Array.isArray(r.localizacaoLesao) ? r.localizacaoLesao : [],
    neoplasia: (r.neoplasia && typeof r.neoplasia === "object") ? r.neoplasia : {},
    terapiaRecente: r.terapiaRecente || "",
    enfermidadesIntercorrentes: r.enfermidadesIntercorrentes || "",
    suspeitaClinica: r.suspeitaClinica || "",
    animalCastrado: Boolean(r.animalCastrado),
    intencaoCastracao: r.intencaoCastracao || "",
    criadoEm: r.criadoEm, atualizadoEm: r.atualizadoEm,
  };
}

function normalizeLaudo(r) {
  return {
    id: r.id, amostraId: r.amostraId || "",
    materialEnviado: r.materialEnviado || "",
    macro: r.macro || "", micro: r.micro || "",
    diagnostico: r.diagnostico || "", comentarios: r.comentarios || "",
    responsavel: r.responsavel || "", liberadoPor: r.liberadoPor || "",
    liberadoEm: r.liberadoEm || "",
    criadoEm: r.criadoEm, atualizadoEm: r.atualizadoEm,
  };
}

function normalizeFinanceiro(r) {
  return {
    id: r.id, amostraId: r.amostraId || "",
    precoCentavos: r.precoCentavos ?? null, formaPagamento: r.formaPagamento || "",
    statusPagamento: r.statusPagamento || "aberto", convenio: r.convenio || "",
    criadoEm: r.criadoEm, atualizadoEm: r.atualizadoEm,
  };
}

function normalizeEstoque(r) {
  return {
    id: r.id, nome: r.nome || "", categoria: r.categoria || "",
    quantidade: Number(r.quantidade || 0), qtdMinima: Number(r.qtdMinima || 0),
    qtdMaxima: Number(r.qtdMaxima || 0), validade: r.validade || "",
    restrito: Boolean(r.restrito),
    criadoEm: r.criadoEm, atualizadoEm: r.atualizadoEm,
  };
}

function normalizeUsuario(r) {
  return {
    id: r.id, nome: r.nome || "", email: r.email || "",
    perfil: r.perfil || "aluno", status: r.status || "ativo",
    criadoEm: r.criadoEm, atualizadoEm: r.atualizadoEm,
  };
}

function normalizeAuditoria(r) {
  return {
    id: r.id, acao: r.acao || "", entidade: r.entidade || "",
    ator: r.ator || "", registradoEm: r.registradoEm || new Date().toISOString(),
  };
}

export const TIPOS_EXAME = [
  { value: "citologico", label: "Citológico / Patológico" },
  { value: "histopatologico", label: "Histopatológico" },
  { value: "necropsia", label: "Necrópsia" },
];

export const TECNICAS_COLETA = ["IMPRINT", "PAAF", "CAAF", "SWAB", "BIÓPSIA PUNCIONAL", "NECROPSIA"];

export const COLORACOES = ["PANÓTIPO RÁPIDO", "GIEMSA", "AZUL DE TOLUIDINA", "GRAM"];

export const CARACTERISTICAS_LESAO = [
  "MÁCULA", "PÚSTULA", "ERITEMA", "PÁPULA", "VESÍCULA", "PRURIDO",
  "PLACA", "ABSCESSO", "ALOPECIA", "NÓDULO", "CISTO", "BOLHA",
  "ÚLCERA", "DESPIGMENTAÇÃO", "OUTRO",
];

export const statusLabels = {
  recebida: "Recebida",
  em_analise: "Em análise",
  laudo_redigido: "Laudo redigido",
  laudo_liberado: "Laudo liberado",
  entregue: "Entregue",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
  adequada: "Adequada",
  hemolisada: "Hemolisada",
  insuficiente: "Insuficiente",
  aberto: "Aberto",
  pago: "Pago",
  parcial: "Parcial",
  ativo: "Ativo",
  inativo: "Inativo",
  professor: "Professor",
  coordenador: "Coordenador",
  aluno: "Aluno",
  citologico: "Citológico",
  histopatologico: "Histopatológico",
  necropsia: "Necrópsia",
};
