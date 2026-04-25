export const STORAGE_KEY = "lapmol.v1";

// Stub temporário mantido para compatibilidade com App.jsx antigo — removido na Task 5
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
    {
      id: "sol-rafael",
      nome: "Dr. Rafael Nunes",
      crmv: "CRMV-MA 2290",
      telefone: "(98) 99111-1003",
      email: "rafael@uema.br",
      endereco: "Hospital Veterinário Universitário",
      especies: "Cães, gatos e equinos",
    },
    {
      id: "sol-clinica-norte",
      nome: "Clínica VetNorte",
      crmv: "",
      telefone: "(98) 98800-1234",
      email: "contato@vetnorte.com.br",
      endereco: "Av. dos Holandeses, São Luís — MA",
      especies: "Cães e gatos",
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
    {
      id: "tut-pedro",
      nome: "Pedro Santos",
      cpf: "345.678.901-22",
      telefone: "(98) 98821-3344",
      email: "pedro@email.com",
      cidade: "Paço do Lumiar",
      endereco: "Maiobão, Paço do Lumiar — MA",
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
      tutorId: "tut-maria",
    },
    {
      id: "pac-rex",
      nome: "Rex",
      especie: "Canino",
      raca: "Pastor Alemão",
      idade: "6 anos",
      sexo: "Macho",
      pelagem: "Preta e castanha",
      tutorId: "tut-pedro",
    },
  ],
  amostras: [
    {
      id: "amo-001",
      protocolo: "LAPMOL-20260414-001",
      pacienteId: "pac-thor",
      solicitanteId: "sol-huv",
      tipoExame: "PCR",
      material: "Swab nasal",
      condicao: "adequada",
      prioridade: "normal",
      status: "laudo_liberado",
      dataColeta: "2026-04-14",
      dataRecebimento: "2026-04-14",
      observacoes: "",
    },
    {
      id: "amo-002",
      protocolo: "LAPMOL-20260415-002",
      pacienteId: "pac-luna",
      solicitanteId: "sol-rafael",
      tipoExame: "Histopatológico",
      material: "Fragmento de pele em formalina 10%",
      condicao: "adequada",
      prioridade: "alta",
      status: "em_analise",
      dataColeta: "2026-04-15",
      dataRecebimento: "2026-04-15",
      observacoes: "Fragmento irregular medindo 1,2 x 0,8 cm.",
    },
    {
      id: "amo-003",
      protocolo: "LAPMOL-20260415-003",
      pacienteId: "pac-rex",
      solicitanteId: "sol-clinica-norte",
      tipoExame: "Citológico",
      material: "Punção aspirativa de linfonodo",
      condicao: "adequada",
      prioridade: "urgente",
      status: "recebida",
      dataColeta: "2026-04-15",
      dataRecebimento: "2026-04-15",
      observacoes: "Coletar até o fim do turno.",
    },
  ],
  laudos: [
    {
      id: "lau-001",
      amostraId: "amo-001",
      macro: "Amostra identificada, swab nasal em condição adequada.",
      micro: "PCR positivo para Leishmania sp.",
      diagnostico: "Leishmaniose visceral confirmada por PCR.",
      comentarios: "Iniciar protocolo terapêutico conforme orientação do clínico.",
      responsavel: "Prof. Dr. Ewaldo Santana",
      liberadoPor: "usr-ewaldo",
      liberadoEm: "2026-04-14",
    },
  ],
  financeiro: [
    {
      id: "fin-001",
      amostraId: "amo-001",
      precoCentavos: 22000,
      formaPagamento: "Pix",
      statusPagamento: "pago",
      convenio: "",
    },
    {
      id: "fin-002",
      amostraId: "amo-002",
      precoCentavos: 14000,
      formaPagamento: "A faturar",
      statusPagamento: "aberto",
      convenio: "Projeto escola",
    },
  ],
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
      id: "est-reagente-pcr",
      nome: "Master Mix PCR",
      categoria: "Reagente",
      quantidade: 12,
      qtdMinima: 20,
      qtdMaxima: 80,
      validade: "2026-09-05",
      restrito: false,
    },
    {
      id: "est-tubos-edta",
      nome: "Tubo EDTA 4mL",
      categoria: "Coleta",
      quantidade: 145,
      qtdMinima: 50,
      qtdMaxima: 200,
      validade: "2027-03-15",
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
      id: "usr-ewaldo",
      nome: "Prof. Dr. Ewaldo Santana",
      email: "ewaldo.santana@uema.br",
      perfil: "professor",
      status: "ativo",
    },
    {
      id: "usr-fernanda",
      nome: "Fernanda Lima",
      email: "fernanda@uema.br",
      perfil: "coordenador",
      status: "ativo",
    },
    {
      id: "usr-julia",
      nome: "Julia Carvalho",
      email: "julia@uema.br",
      perfil: "aluno",
      status: "ativo",
    },
  ],
  auditoria: [
    {
      id: "aud-001",
      acao: "Laudo liberado: LAPMOL-20260414-001",
      entidade: "Laudos",
      ator: "Prof. Dr. Ewaldo Santana",
      registradoEm: "2026-04-14T14:00:00.000Z",
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
    id: r.id,
    nome: r.nome || "",
    crmv: r.crmv || "",
    telefone: r.telefone || "",
    email: r.email || "",
    endereco: r.endereco || "",
    especies: r.especies || "",
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

function normalizeTutor(r) {
  return {
    id: r.id,
    nome: r.nome || "",
    cpf: r.cpf || "",
    telefone: r.telefone || "",
    email: r.email || "",
    cidade: r.cidade || "",
    endereco: r.endereco || "",
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

function normalizePaciente(r) {
  return {
    id: r.id,
    nome: r.nome || "",
    especie: r.especie || "",
    raca: r.raca || "",
    idade: r.idade || "",
    sexo: r.sexo || "",
    pelagem: r.pelagem || "",
    tutorId: r.tutorId || "",
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

function normalizeAmostra(r) {
  return {
    id: r.id,
    protocolo: r.protocolo || "",
    pacienteId: r.pacienteId || "",
    solicitanteId: r.solicitanteId || "",
    tipoExame: r.tipoExame || "",
    material: r.material || "",
    condicao: r.condicao || "adequada",
    prioridade: r.prioridade || "normal",
    status: r.status || "recebida",
    dataColeta: r.dataColeta || "",
    dataRecebimento: r.dataRecebimento || "",
    observacoes: r.observacoes || "",
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

function normalizeLaudo(r) {
  return {
    id: r.id,
    amostraId: r.amostraId || "",
    macro: r.macro || "",
    micro: r.micro || "",
    diagnostico: r.diagnostico || "",
    comentarios: r.comentarios || "",
    responsavel: r.responsavel || "",
    liberadoPor: r.liberadoPor || "",
    liberadoEm: r.liberadoEm || "",
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

function normalizeFinanceiro(r) {
  return {
    id: r.id,
    amostraId: r.amostraId || "",
    precoCentavos: r.precoCentavos ?? null,
    formaPagamento: r.formaPagamento || "",
    statusPagamento: r.statusPagamento || "aberto",
    convenio: r.convenio || "",
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

function normalizeEstoque(r) {
  return {
    id: r.id,
    nome: r.nome || "",
    categoria: r.categoria || "",
    quantidade: Number(r.quantidade || 0),
    qtdMinima: Number(r.qtdMinima || 0),
    qtdMaxima: Number(r.qtdMaxima || 0),
    validade: r.validade || "",
    restrito: Boolean(r.restrito),
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

function normalizeUsuario(r) {
  return {
    id: r.id,
    nome: r.nome || "",
    email: r.email || "",
    perfil: r.perfil || "aluno",
    status: r.status || "ativo",
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

function normalizeAuditoria(r) {
  return {
    id: r.id,
    acao: r.acao || "",
    entidade: r.entidade || "",
    ator: r.ator || "",
    registradoEm: r.registradoEm || new Date().toISOString(),
  };
}

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
};
