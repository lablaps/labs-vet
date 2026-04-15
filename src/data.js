export const STORAGE_KEY = "laboratorio-inteligente.v1";

export const seedData = {
  labs: [
    {
      id: "lab-patol",
      name: "Lab. Patologia",
      short: "PATOL",
      coordinator: "Dra. Fernanda Lima",
      local: "Bloco B, Sala 203",
      desc: "Histopatologia, citopatologia e necropsia",
      stock: 87,
      status: "active",
      color: "#285A43",
    },
    {
      id: "lab-aclin",
      name: "Analises Clinicas",
      short: "A.CLIN",
      coordinator: "Dra. Marcia Sousa",
      local: "Bloco B, Sala 108",
      desc: "Hematologia, bioquimica, urinálise e coproparasitologico",
      stock: 54,
      status: "busy",
      color: "#0B7A75",
    },
    {
      id: "lab-micro",
      name: "Microbiologia Molecular",
      short: "MICRO",
      coordinator: "Dr. Rafael Nunes",
      local: "Bloco A, Sala 305",
      desc: "Culturas bacterianas, micologicas e PCR",
      stock: 78,
      status: "active",
      color: "#4E6C8A",
    },
    {
      id: "lab-paras",
      name: "Parasitologia",
      short: "PARAS",
      coordinator: "Dra. Ana Beatriz",
      local: "Bloco A, Sala 210",
      desc: "Endo e ectoparasitas",
      stock: 65,
      status: "idle",
      color: "#8A6418",
    },
  ],
  tutors: [
    {
      id: "tut-joao",
      name: "Joao Silva",
      document: "123.456.789-10",
      phone: "(98) 98765-4321",
      email: "joao@email.com",
      city: "Sao Luis",
      address: "Renascenca, Sao Luis - MA",
    },
    {
      id: "tut-maria",
      name: "Maria Costa",
      document: "234.567.890-11",
      phone: "(98) 99876-5432",
      email: "maria@email.com",
      city: "Sao Luis",
      address: "Cohama, Sao Luis - MA",
    },
    {
      id: "tut-pedro",
      name: "Pedro Santos",
      document: "345.678.901-22",
      phone: "(98) 98821-3344",
      email: "pedro@email.com",
      city: "Paco do Lumiar",
      address: "Maiobao, Paco do Lumiar - MA",
    },
    {
      id: "tut-ana",
      name: "Ana Lima",
      document: "456.789.012-33",
      phone: "(98) 97732-9988",
      email: "ana@email.com",
      city: "Sao Jose de Ribamar",
      address: "Aracagy, Sao Jose de Ribamar - MA",
    },
  ],
  veterinarians: [
    {
      id: "vet-fernanda",
      name: "Dra. Fernanda Lima",
      crmv: "CRMV-MA 1842",
      phone: "(98) 99111-1001",
      email: "fernanda@uema.br",
      address: "Hospital Veterinario Universitario",
      species: "Caes, gatos e silvestres",
    },
    {
      id: "vet-marcia",
      name: "Dra. Marcia Sousa",
      crmv: "CRMV-MA 2107",
      phone: "(98) 99111-1002",
      email: "marcia@uema.br",
      address: "Hospital Veterinario Universitario",
      species: "Caes e gatos",
    },
    {
      id: "vet-rafael",
      name: "Dr. Rafael Nunes",
      crmv: "CRMV-MA 2290",
      phone: "(98) 99111-1003",
      email: "rafael@uema.br",
      address: "Hospital Veterinario Universitario",
      species: "Caes, gatos e equinos",
    },
  ],
  patients: [
    {
      id: "ani-thor",
      name: "Thor",
      species: "Canino",
      breed: "Golden Retriever",
      age: "4 anos",
      sex: "Macho",
      coat: "Dourada",
      weight: "28 kg",
      tutorId: "tut-joao",
      labs: ["lab-patol", "lab-aclin"],
      status: "in_service",
      notes: "Historico de dermatite recorrente.",
      attachments: [
        {
          id: "file-thor-dermato",
          name: "thor-dermatite-inicial.jpg",
          type: "image/jpeg",
          size: 382400,
          uploadedAt: "2026-04-14T10:20:00.000Z",
          dataUrl: "",
        },
      ],
    },
    {
      id: "ani-luna",
      name: "Luna",
      species: "Felino",
      breed: "Siames",
      age: "2 anos",
      sex: "Femea",
      coat: "Seal point",
      weight: "4,2 kg",
      tutorId: "tut-maria",
      labs: ["lab-micro"],
      status: "waiting",
      notes: "Aguardando coleta para cultura.",
      attachments: [],
    },
    {
      id: "ani-rex",
      name: "Rex",
      species: "Canino",
      breed: "Pastor Alemao",
      age: "6 anos",
      sex: "Macho",
      coat: "Preta e castanha",
      weight: "35 kg",
      tutorId: "tut-pedro",
      labs: ["lab-aclin", "lab-patol"],
      status: "done",
      notes: "Retorno em 30 dias.",
      attachments: [],
    },
    {
      id: "ani-mimi",
      name: "Mimi",
      species: "Felino",
      breed: "Persa",
      age: "8 anos",
      sex: "Femea",
      coat: "Branca",
      weight: "3,8 kg",
      tutorId: "tut-ana",
      labs: ["lab-patol"],
      status: "waiting",
      notes: "Paciente sensivel a contencao prolongada.",
      attachments: [
        {
          id: "file-mimi-lesao",
          name: "mimi-lesao-cutanea.png",
          type: "image/png",
          size: 291120,
          uploadedAt: "2026-04-15T12:15:00.000Z",
          dataUrl: "",
        },
      ],
    },
  ],
  exams: [
    {
      id: "exa-hemograma-thor",
      protocol: "OS-20260414-001",
      patientId: "ani-thor",
      veterinarianId: "vet-marcia",
      labId: "lab-aclin",
      type: "Bioquimico",
      requestedBy: "Dra. Marcia Sousa",
      status: "signed",
      priority: "normal",
      collectedAt: "2026-04-14",
      receivedAt: "2026-04-14",
      material: "Sangue total e soro",
      sampleCondition: "adequate",
      macroDescription: "Amostra identificada, volume adequado e sem coagulos.",
      microDescription: "Serie vermelha com anisocitose discreta.",
      diagnosis: "Anemia leve.",
      comments: "Correlacionar com quadro clinico e repetir hemograma em 30 dias.",
      responsibleDoctor: "Dra. Marcia Sousa",
      releasedAt: "2026-04-14",
      price: 85,
      paymentMethod: "Pix",
      paymentStatus: "paid",
      agreement: "",
      result: "Anemia leve, hematocrito em 28%.",
      attachments: [
        {
          id: "file-hemograma-thor",
          name: "hemograma-thor.pdf",
          type: "application/pdf",
          size: 186240,
          uploadedAt: "2026-04-14T14:40:00.000Z",
          dataUrl: "",
        },
      ],
    },
    {
      id: "exa-biopsia-mimi",
      protocol: "OS-20260415-002",
      patientId: "ani-mimi",
      veterinarianId: "vet-fernanda",
      labId: "lab-patol",
      type: "Histopatologico",
      requestedBy: "Dra. Fernanda Lima",
      status: "processing",
      priority: "high",
      collectedAt: "2026-04-15",
      receivedAt: "2026-04-15",
      material: "Fragmento de pele em formalina 10%",
      sampleCondition: "adequate",
      macroDescription: "Fragmento irregular medindo 1,2 x 0,8 cm.",
      microDescription: "Aguardando processamento histologico.",
      diagnosis: "",
      comments: "",
      responsibleDoctor: "Dra. Fernanda Lima",
      releasedAt: "",
      price: 140,
      paymentMethod: "A faturar",
      paymentStatus: "open",
      agreement: "Projeto escola",
      result: "Amostra em processamento.",
      attachments: [],
    },
    {
      id: "exa-pcr-luna",
      protocol: "OS-20260415-003",
      patientId: "ani-luna",
      veterinarianId: "vet-rafael",
      labId: "lab-micro",
      type: "PCR",
      requestedBy: "Dr. Rafael Nunes",
      status: "requested",
      priority: "urgent",
      collectedAt: "2026-04-15",
      receivedAt: "",
      material: "Swab nasal",
      sampleCondition: "pending",
      macroDescription: "",
      microDescription: "",
      diagnosis: "",
      comments: "Coletar ate o fim do turno.",
      responsibleDoctor: "",
      releasedAt: "",
      price: 220,
      paymentMethod: "",
      paymentStatus: "open",
      agreement: "",
      result: "Coleta pendente.",
      attachments: [],
    },
  ],
  appointments: [
    {
      id: "age-thor",
      date: "2026-04-15",
      time: "08:00",
      patientId: "ani-thor",
      labId: "lab-patol",
      type: "Biopsia de rotina",
      vet: "Dra. Fernanda",
      status: "confirmed",
    },
    {
      id: "age-luna",
      date: "2026-04-15",
      time: "09:30",
      patientId: "ani-luna",
      labId: "lab-micro",
      type: "Coleta PCR",
      vet: "Dr. Rafael",
      status: "pending",
    },
  ],
  inventory: [
    {
      id: "inv-formalina",
      name: "Formalina 10%",
      category: "Fixador",
      labId: "lab-patol",
      qty: 23,
      min: 30,
      max: 120,
      expiry: "2026-11-20",
      restricted: true,
    },
    {
      id: "inv-tubos-edta",
      name: "Tubo EDTA 4mL",
      category: "Coleta",
      labId: "lab-aclin",
      qty: 145,
      min: 50,
      max: 200,
      expiry: "2027-03-15",
      restricted: false,
    },
    {
      id: "inv-reagente-pcr",
      name: "Master Mix PCR",
      category: "Reagente",
      labId: "lab-micro",
      qty: 12,
      min: 20,
      max: 80,
      expiry: "2026-09-05",
      restricted: false,
    },
  ],
  users: [
    {
      id: "usr-ewaldo-santana",
      name: "Prof. Dr. Ewaldo Santana",
      email: "ewaldo.santana@uema.br",
      role: "Gestor Hub",
      labId: "",
      veterinarianId: "",
      status: "active",
    },
    {
      id: "usr-fernanda",
      name: "Dra. Fernanda Lima",
      email: "fernanda@uema.br",
      role: "Coordenador",
      labId: "lab-patol",
      veterinarianId: "vet-fernanda",
      status: "active",
    },
    {
      id: "usr-marcia",
      name: "Dra. Marcia Sousa",
      email: "marcia@uema.br",
      role: "Coordenador",
      labId: "lab-aclin",
      veterinarianId: "vet-marcia",
      status: "active",
    },
    {
      id: "usr-rafael",
      name: "Dr. Rafael Nunes",
      email: "rafael@uema.br",
      role: "Professor / Veterinário",
      labId: "lab-micro",
      veterinarianId: "vet-rafael",
      status: "active",
    },
    {
      id: "usr-estagio-patol",
      name: "Julia Carvalho",
      email: "julia.estagio@uema.br",
      role: "Aluno / Estagiário",
      labId: "lab-patol",
      veterinarianId: "",
      status: "active",
    },
  ],
  requisitions: [
    {
      id: "req-recoleta-luna",
      requesterUserId: "usr-rafael",
      labId: "lab-micro",
      patientId: "ani-luna",
      examId: "exa-pcr-luna",
      type: "Recoleta",
      priority: "urgent",
      status: "open",
      dueAt: "2026-04-15",
      description: "Confirmar identificacao do swab nasal antes do processamento.",
      response: "",
    },
    {
      id: "req-insumo-formalina",
      requesterUserId: "usr-fernanda",
      labId: "lab-patol",
      patientId: "",
      examId: "exa-biopsia-mimi",
      type: "Insumo",
      priority: "high",
      status: "in_review",
      dueAt: "2026-04-16",
      description: "Reposicao de formalina 10% para rotina de histopatologia.",
      response: "Aguardando validacao do estoque central.",
    },
  ],
  auditEvents: [
    {
      id: "aud-001",
      at: "2026-04-15T08:14:00.000Z",
      action: "Login no sistema",
      entity: "Sessao",
      actor: "Prof. Dr. Ewaldo Santana",
    },
    {
      id: "aud-002",
      at: "2026-04-15T09:42:00.000Z",
      action: "Laudo assinado: OS-20260414-001",
      entity: "Exames",
      actor: "Dra. Marcia Sousa",
    },
  ],
};

const collections = [
  "labs",
  "tutors",
  "veterinarians",
  "patients",
  "exams",
  "appointments",
  "inventory",
  "users",
  "requisitions",
  "auditEvents",
];

export function createInitialData() {
  return JSON.parse(JSON.stringify(seedData));
}

export function normalizeDataset(input = {}) {
  const base = createInitialData();
  const source = input && typeof input === "object" ? input : {};

  return {
    ...base,
    ...source,
    labs: normalizeCollection(source.labs, base.labs, normalizeLab),
    tutors: normalizeCollection(source.tutors, base.tutors, normalizeTutor),
    veterinarians: normalizeCollection(source.veterinarians, base.veterinarians, normalizeVeterinarian),
    patients: normalizeCollection(source.patients, base.patients, normalizePatient),
    exams: normalizeCollection(source.exams, base.exams, normalizeExam),
    appointments: normalizeCollection(source.appointments, base.appointments, normalizeAppointment),
    inventory: normalizeCollection(source.inventory, base.inventory, normalizeInventory),
    users: normalizeCollection(withSeedDefaults(source.users, base.users), base.users, normalizeUser),
    requisitions: normalizeCollection(
      withSeedDefaults(source.requisitions, base.requisitions),
      base.requisitions,
      normalizeRequisition,
    ),
    auditEvents: normalizeCollection(source.auditEvents, base.auditEvents, normalizeAuditEvent),
  };
}

function normalizeCollection(value, fallback, mapper) {
  const records = Array.isArray(value) ? value : fallback;
  return records.map(mapper).filter(Boolean);
}

function withSeedDefaults(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const existingIds = new Set(value.map((record) => record.id));
  return [...value, ...fallback.filter((record) => !existingIds.has(record.id))];
}

function normalizeLab(record) {
  return {
    id: record.id,
    name: record.name || "",
    short: record.short || "",
    coordinator: record.coordinator || "",
    local: record.local || "",
    desc: record.desc || record.description || "",
    stock: Number(record.stock || 0),
    status: record.status || "active",
    color: record.color || "#285A43",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeTutor(record) {
  return {
    id: record.id,
    name: record.name || "",
    document: record.document || "",
    phone: record.phone || "",
    email: record.email || "",
    city: record.city || "",
    address: record.address || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeVeterinarian(record) {
  return {
    id: record.id,
    name: record.name || "",
    crmv: record.crmv || "",
    phone: record.phone || "",
    email: record.email || "",
    address: record.address || "",
    species: record.species || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizePatient(record) {
  return {
    id: record.id,
    name: record.name || "",
    species: record.species || "",
    breed: record.breed || "",
    age: record.age || "",
    sex: record.sex || "",
    coat: record.coat || "",
    weight: record.weight || "",
    tutorId: record.tutorId || "",
    labs: Array.isArray(record.labs) ? record.labs : [],
    status: record.status || "waiting",
    notes: record.notes || "",
    attachments: normalizeAttachments(record.attachments),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeExam(record, index) {
  return {
    id: record.id,
    protocol: record.protocol || `OS-LEGADO-${String(index + 1).padStart(3, "0")}`,
    patientId: record.patientId || "",
    veterinarianId: record.veterinarianId || "",
    labId: record.labId || "",
    type: record.type || "Histopatologico",
    requestedBy: record.requestedBy || "",
    status: record.status || "requested",
    priority: record.priority || "normal",
    collectedAt: record.collectedAt || "",
    receivedAt: record.receivedAt || record.collectedAt || "",
    material: record.material || "",
    sampleCondition: record.sampleCondition || "adequate",
    macroDescription: record.macroDescription || "",
    microDescription: record.microDescription || "",
    diagnosis: record.diagnosis || "",
    comments: record.comments || "",
    responsibleDoctor: record.responsibleDoctor || "",
    releasedAt: record.releasedAt || "",
    price: record.price ?? "",
    paymentMethod: record.paymentMethod || "",
    paymentStatus: record.paymentStatus || "open",
    agreement: record.agreement || "",
    result: record.result || "",
    attachments: normalizeAttachments(record.attachments),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeAppointment(record) {
  return {
    id: record.id,
    date: record.date || "",
    time: record.time || "",
    patientId: record.patientId || "",
    labId: record.labId || "",
    type: record.type || "",
    vet: record.vet || "",
    status: record.status || "pending",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeInventory(record) {
  return {
    id: record.id,
    name: record.name || "",
    category: record.category || "",
    labId: record.labId || "",
    qty: Number(record.qty || 0),
    min: Number(record.min || 0),
    max: Number(record.max || 0),
    expiry: record.expiry || "",
    restricted: Boolean(record.restricted),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeUser(record) {
  return {
    id: record.id,
    name: record.name || "",
    email: record.email || "",
    role: record.role || "",
    labId: record.labId || "",
    veterinarianId: record.veterinarianId || inferVeterinarianId(record.name),
    status: record.status || "active",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function inferVeterinarianId(name = "") {
  const normalized = name.toLowerCase();
  if (normalized.includes("fernanda")) return "vet-fernanda";
  if (normalized.includes("marcia") || normalized.includes("márcia")) return "vet-marcia";
  if (normalized.includes("rafael")) return "vet-rafael";
  return "";
}

function normalizeRequisition(record) {
  return {
    id: record.id,
    requesterUserId: record.requesterUserId || "",
    labId: record.labId || "",
    patientId: record.patientId || "",
    examId: record.examId || "",
    type: record.type || "Geral",
    priority: record.priority || "normal",
    status: record.status || "open",
    dueAt: record.dueAt || "",
    description: record.description || "",
    response: record.response || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeAuditEvent(record) {
  return {
    id: record.id,
    at: record.at || new Date().toISOString(),
    action: record.action || "",
    entity: record.entity || "",
    actor: record.actor || "",
  };
}

function normalizeAttachments(value) {
  return Array.isArray(value)
    ? value.map((file) => ({
        id: file.id,
        name: file.name || "",
        type: file.type || "",
        size: Number(file.size || 0),
        uploadedAt: file.uploadedAt || "",
        dataUrl: file.dataUrl || "",
      }))
    : [];
}

export const statusLabels = {
  active: "Ativo",
  inactive: "Inativo",
  busy: "Ocupado",
  idle: "Livre",
  waiting: "Aguardando",
  in_service: "Em atendimento",
  done: "Concluido",
  requested: "Solicitado",
  processing: "Em analise",
  ready: "Pronto",
  signed: "Assinado",
  confirmed: "Confirmado",
  pending: "Pendente",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
  adequate: "Adequada",
  hemolyzed: "Hemolisada",
  insufficient: "Insuficiente",
  open: "Aberto",
  paid: "Pago",
  partial: "Parcial",
  in_review: "Em revisão",
  approved: "Aprovada",
  rejected: "Recusada",
  fulfilled: "Atendida",
};

export const moduleLabels = {
  tutors: "Tutores",
  veterinarians: "Veterinarios",
  patients: "Pacientes",
  exams: "Exames",
  appointments: "Agenda",
  requisitions: "Requisições",
  inventory: "Estoque",
  labs: "Laboratorios",
  users: "Usuarios",
};
