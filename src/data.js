export const STORAGE_KEY = "lapave.v2";

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
  tutores: [],
  pacientes: [],
  amostras: [],
  laudos: [],
  financeiro: [],
  estoque: [],
  usuarios: [
    {
      id: "usr-fabio",
      nome: "Prof. Fábio",
      email: "fabio@uema.br",
      perfil: "professor",
      status: "ativo",
      senha: "69ab16b2d94a16f0050d45a51568e2984e7ac2b9b614521cc899e33dd3d80593",
    },
    {
      id: "usr-carol",
      nome: "Carol",
      email: "carol@uema.br",
      perfil: "coordenador",
      status: "ativo",
      senha: "69ab16b2d94a16f0050d45a51568e2984e7ac2b9b614521cc899e33dd3d80593",
    },
    {
      id: "usr-aluno1",
      nome: "Aluno 1",
      email: "aluno1@uema.br",
      perfil: "aluno",
      status: "ativo",
      senha: "782a83c07325585f9363c56a97e04996d0fedf43cd1f30f0de1ee578c2ad90f5",
    },
    {
      id: "usr-aluno2",
      nome: "Aluno 2",
      email: "aluno2@uema.br",
      perfil: "aluno",
      status: "ativo",
      senha: "782a83c07325585f9363c56a97e04996d0fedf43cd1f30f0de1ee578c2ad90f5",
    },
  ],
  auditoria: [],
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
    senha: r.senha || "",
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
