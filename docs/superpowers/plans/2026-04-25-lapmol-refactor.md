# LAPMOL Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o sistema multi-laboratório genérico em um sistema focado no LAPMOL (Laboratório de Patologia Molecular), com componentes separados por módulo, fluxo centrado no ciclo de vida da amostra, e três perfis de acesso (professor, coordenador, aluno).

**Architecture:** App.jsx vira um roteador fino (~150 linhas). Cada módulo vira um arquivo em `src/pages/`. Componentes reutilizáveis em `src/components/`. O servidor e o schema SQL são reescritos para as entidades do LAPMOL. A camada de storage (localStorage ↔ SQLite) é mantida sem alteração.

**Tech Stack:** React 19, Vite, Node.js (http nativo), SQLite (`node:sqlite`), CSS puro, sem dependências novas.

> **Nota sobre testes:** O projeto não tem framework de testes. As etapas de verificação são manuais via browser. Cada tarefa termina com `npm run dev` e checklist de verificação no browser antes do commit.

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `db/schema.sql` | REESCREVER | Schema LAPMOL (9 tabelas) |
| `src/data.js` | REESCREVER | Seed data LAPMOL + normalização |
| `server/database.js` | REESCREVER | insert/read/map para tabelas LAPMOL |
| `scripts/init-db.mjs` | ATUALIZAR | Verificação de seed usa `amostras` |
| `src/App.jsx` | REESCREVER | Roteador fino + login + perfil |
| `src/styles.css` | ATUALIZAR | Remover estilos não usados, ajustar |
| `src/components/Nav.jsx` | CRIAR | Menu lateral com seções |
| `src/components/Modal.jsx` | CRIAR | Modal genérico reutilizável |
| `src/components/StatusBadge.jsx` | CRIAR | Badge de status colorido |
| `src/pages/Dashboard.jsx` | CRIAR | Visão geral + pendências |
| `src/pages/Amostras.jsx` | CRIAR | CRUD de amostras/protocolos + QR |
| `src/pages/Laudos.jsx` | CRIAR | Editor de laudo + liberação |
| `src/pages/Solicitantes.jsx` | CRIAR | CRUD de solicitantes (vets/clínicas) |
| `src/pages/Tutores.jsx` | CRIAR | CRUD de tutores |
| `src/pages/Pacientes.jsx` | CRIAR | CRUD de pacientes |
| `src/pages/Estoque.jsx` | CRIAR | CRUD de estoque + alertas |
| `src/pages/Usuarios.jsx` | CRIAR | CRUD de usuários (só professor) |
| `src/pages/Auditoria.jsx` | CRIAR | Log somente leitura |

---

## Task 1: Novo Schema SQL

**Files:**
- Rewrite: `db/schema.sql`

- [ ] **Substituir todo o conteúdo de `db/schema.sql`:**

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS solicitantes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  crmv TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  especies TEXT NOT NULL DEFAULT '',
  criado_em TEXT,
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS tutores (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  criado_em TEXT,
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS pacientes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  especie TEXT NOT NULL DEFAULT '',
  raca TEXT NOT NULL DEFAULT '',
  idade TEXT NOT NULL DEFAULT '',
  sexo TEXT NOT NULL DEFAULT '',
  pelagem TEXT NOT NULL DEFAULT '',
  tutor_id TEXT REFERENCES tutores(id) ON DELETE SET NULL,
  criado_em TEXT,
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS amostras (
  id TEXT PRIMARY KEY,
  protocolo TEXT NOT NULL UNIQUE,
  paciente_id TEXT REFERENCES pacientes(id) ON DELETE SET NULL,
  solicitante_id TEXT REFERENCES solicitantes(id) ON DELETE SET NULL,
  tipo_exame TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL DEFAULT '',
  condicao TEXT NOT NULL DEFAULT 'adequada',
  prioridade TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'recebida',
  data_coleta TEXT NOT NULL DEFAULT '',
  data_recebimento TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  criado_em TEXT,
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS laudos (
  id TEXT PRIMARY KEY,
  amostra_id TEXT NOT NULL UNIQUE REFERENCES amostras(id) ON DELETE CASCADE,
  macro TEXT NOT NULL DEFAULT '',
  micro TEXT NOT NULL DEFAULT '',
  diagnostico TEXT NOT NULL DEFAULT '',
  comentarios TEXT NOT NULL DEFAULT '',
  responsavel TEXT NOT NULL DEFAULT '',
  liberado_por TEXT NOT NULL DEFAULT '',
  liberado_em TEXT NOT NULL DEFAULT '',
  criado_em TEXT,
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS financeiro (
  id TEXT PRIMARY KEY,
  amostra_id TEXT NOT NULL UNIQUE REFERENCES amostras(id) ON DELETE CASCADE,
  preco_centavos INTEGER,
  forma_pagamento TEXT NOT NULL DEFAULT '',
  status_pagamento TEXT NOT NULL DEFAULT 'aberto',
  convenio TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS estoque (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  quantidade INTEGER NOT NULL DEFAULT 0,
  qtd_minima INTEGER NOT NULL DEFAULT 0,
  qtd_maxima INTEGER NOT NULL DEFAULT 0,
  validade TEXT NOT NULL DEFAULT '',
  restrito INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT,
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'aluno',
  status TEXT NOT NULL DEFAULT 'ativo',
  criado_em TEXT,
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS auditoria (
  id TEXT PRIMARY KEY,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL DEFAULT '',
  ator TEXT NOT NULL DEFAULT '',
  registrado_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_amostras_protocolo ON amostras(protocolo);
CREATE INDEX IF NOT EXISTS idx_amostras_status ON amostras(status);
CREATE INDEX IF NOT EXISTS idx_amostras_recebimento ON amostras(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_pacientes_tutor ON pacientes(tutor_id);
```

- [ ] **Deletar o banco antigo para forçar recriação:**

```bash
rm -f data/laboratorio.sqlite data/laboratorio.sqlite-shm data/laboratorio.sqlite-wal
```

- [ ] **Commit:**

```bash
git add db/schema.sql
git commit -m "feat: novo schema SQL focado no LAPMOL"
```

---

## Task 2: Reescrever src/data.js

**Files:**
- Rewrite: `src/data.js`

- [ ] **Substituir todo o conteúdo de `src/data.js`:**

```js
export const STORAGE_KEY = "lapmol.v1";

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
  return (Array.isArray(value) ? value : fallback).map(mapper).filter(Boolean);
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
```

- [ ] **Commit:**

```bash
git add src/data.js
git commit -m "feat: seed data e normalização para o LAPMOL"
```

---

## Task 3: Reescrever server/database.js

**Files:**
- Rewrite: `server/database.js`

- [ ] **Substituir todo o conteúdo de `server/database.js`:**

```js
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { createInitialData, normalizeDataset } from "../src/data.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultDatabasePath = resolve(rootDir, "data", "laboratorio.sqlite");
const schemaPath = resolve(rootDir, "db", "schema.sql");
const databasePath = resolve(process.env.LABVET_DB_PATH || defaultDatabasePath);

let database;

export function getDatabasePath() {
  return databasePath;
}

export function initializeDatabase({ forceSeed = false, skipSeed = false } = {}) {
  if (!database) {
    mkdirSync(dirname(databasePath), { recursive: true });
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON");
    database.exec("PRAGMA journal_mode = WAL");
    database.exec(readFileSync(schemaPath, "utf8"));
  }

  const { total } = database.prepare("SELECT COUNT(*) AS total FROM amostras").get();
  if (!skipSeed && (forceSeed || total === 0)) {
    writeData(createInitialData(), { skipSeed: true });
  }

  return database;
}

export function closeDatabase() {
  if (database) {
    database.close();
    database = undefined;
  }
}

export function resetDatabase() {
  initializeDatabase({ skipSeed: true });
  writeData(createInitialData(), { skipSeed: true });
  return readData();
}

export function readData() {
  const db = initializeDatabase();
  return normalizeDataset({
    solicitantes: db.prepare("SELECT * FROM solicitantes ORDER BY nome").all().map(mapSolicitante),
    tutores: db.prepare("SELECT * FROM tutores ORDER BY nome").all().map(mapTutor),
    pacientes: db.prepare("SELECT * FROM pacientes ORDER BY nome").all().map(mapPaciente),
    amostras: db.prepare("SELECT * FROM amostras ORDER BY data_recebimento DESC, protocolo").all().map(mapAmostra),
    laudos: db.prepare("SELECT * FROM laudos ORDER BY criado_em DESC").all().map(mapLaudo),
    financeiro: db.prepare("SELECT * FROM financeiro").all().map(mapFinanceiro),
    estoque: db.prepare("SELECT * FROM estoque ORDER BY nome").all().map(mapEstoque),
    usuarios: db.prepare("SELECT * FROM usuarios ORDER BY nome").all().map(mapUsuario),
    auditoria: db.prepare("SELECT * FROM auditoria ORDER BY registrado_em DESC").all().map(mapAuditoria),
  });
}

export function writeData(input, { skipSeed = false } = {}) {
  const db = initializeDatabase({ skipSeed });
  const data = normalizeDataset(input);

  db.exec("BEGIN IMMEDIATE");
  try {
    clearTables(db);
    insertSolicitantes(db, data.solicitantes);
    insertTutores(db, data.tutores);
    insertPacientes(db, data.pacientes);
    insertAmostras(db, data.amostras);
    insertLaudos(db, data.laudos);
    insertFinanceiro(db, data.financeiro);
    insertEstoque(db, data.estoque);
    insertUsuarios(db, data.usuarios);
    insertAuditoria(db, data.auditoria);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return readData();
}

function clearTables(db) {
  ["auditoria", "financeiro", "laudos", "amostras", "pacientes", "tutores", "solicitantes", "estoque", "usuarios"]
    .forEach((t) => db.exec(`DELETE FROM ${t}`));
}

function insertSolicitantes(db, rows) {
  const s = db.prepare(`INSERT INTO solicitantes (id, nome, crmv, telefone, email, endereco, especies, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  rows.forEach((r) => s.run(r.id, r.nome, r.crmv, r.telefone, r.email, r.endereco, r.especies, r.criadoEm || null, r.atualizadoEm || null));
}

function insertTutores(db, rows) {
  const s = db.prepare(`INSERT INTO tutores (id, nome, cpf, telefone, email, cidade, endereco, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  rows.forEach((r) => s.run(r.id, r.nome, r.cpf, r.telefone, r.email, r.cidade, r.endereco, r.criadoEm || null, r.atualizadoEm || null));
}

function insertPacientes(db, rows) {
  const s = db.prepare(`INSERT INTO pacientes (id, nome, especie, raca, idade, sexo, pelagem, tutor_id, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  rows.forEach((r) => s.run(r.id, r.nome, r.especie, r.raca, r.idade, r.sexo, r.pelagem, r.tutorId || null, r.criadoEm || null, r.atualizadoEm || null));
}

function insertAmostras(db, rows) {
  const s = db.prepare(`INSERT INTO amostras (id, protocolo, paciente_id, solicitante_id, tipo_exame, material, condicao, prioridade, status, data_coleta, data_recebimento, observacoes, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  rows.forEach((r) => s.run(r.id, r.protocolo, r.pacienteId || null, r.solicitanteId || null, r.tipoExame, r.material, r.condicao, r.prioridade, r.status, r.dataColeta, r.dataRecebimento, r.observacoes, r.criadoEm || null, r.atualizadoEm || null));
}

function insertLaudos(db, rows) {
  const s = db.prepare(`INSERT INTO laudos (id, amostra_id, macro, micro, diagnostico, comentarios, responsavel, liberado_por, liberado_em, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  rows.forEach((r) => s.run(r.id, r.amostraId, r.macro, r.micro, r.diagnostico, r.comentarios, r.responsavel, r.liberadoPor, r.liberadoEm, r.criadoEm || null, r.atualizadoEm || null));
}

function insertFinanceiro(db, rows) {
  const s = db.prepare(`INSERT INTO financeiro (id, amostra_id, preco_centavos, forma_pagamento, status_pagamento, convenio) VALUES (?, ?, ?, ?, ?, ?)`);
  rows.forEach((r) => s.run(r.id, r.amostraId, r.precoCentavos ?? null, r.formaPagamento, r.statusPagamento, r.convenio));
}

function insertEstoque(db, rows) {
  const s = db.prepare(`INSERT INTO estoque (id, nome, categoria, quantidade, qtd_minima, qtd_maxima, validade, restrito, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  rows.forEach((r) => s.run(r.id, r.nome, r.categoria, r.quantidade, r.qtdMinima, r.qtdMaxima, r.validade, r.restrito ? 1 : 0, r.criadoEm || null, r.atualizadoEm || null));
}

function insertUsuarios(db, rows) {
  const s = db.prepare(`INSERT INTO usuarios (id, nome, email, perfil, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  rows.forEach((r) => s.run(r.id, r.nome, r.email, r.perfil, r.status, r.criadoEm || null, r.atualizadoEm || null));
}

function insertAuditoria(db, rows) {
  const s = db.prepare(`INSERT INTO auditoria (id, acao, entidade, ator, registrado_em) VALUES (?, ?, ?, ?, ?)`);
  rows.forEach((r) => s.run(r.id, r.acao, r.entidade, r.ator, r.registradoEm));
}

function mapSolicitante(r) {
  return { id: r.id, nome: r.nome, crmv: r.crmv || "", telefone: r.telefone || "", email: r.email || "", endereco: r.endereco || "", especies: r.especies || "", criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapTutor(r) {
  return { id: r.id, nome: r.nome, cpf: r.cpf || "", telefone: r.telefone || "", email: r.email || "", cidade: r.cidade || "", endereco: r.endereco || "", criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapPaciente(r) {
  return { id: r.id, nome: r.nome, especie: r.especie || "", raca: r.raca || "", idade: r.idade || "", sexo: r.sexo || "", pelagem: r.pelagem || "", tutorId: r.tutor_id || "", criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapAmostra(r) {
  return { id: r.id, protocolo: r.protocolo, pacienteId: r.paciente_id || "", solicitanteId: r.solicitante_id || "", tipoExame: r.tipo_exame || "", material: r.material || "", condicao: r.condicao || "adequada", prioridade: r.prioridade || "normal", status: r.status || "recebida", dataColeta: r.data_coleta || "", dataRecebimento: r.data_recebimento || "", observacoes: r.observacoes || "", criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapLaudo(r) {
  return { id: r.id, amostraId: r.amostra_id, macro: r.macro || "", micro: r.micro || "", diagnostico: r.diagnostico || "", comentarios: r.comentarios || "", responsavel: r.responsavel || "", liberadoPor: r.liberado_por || "", liberadoEm: r.liberado_em || "", criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapFinanceiro(r) {
  return { id: r.id, amostraId: r.amostra_id, precoCentavos: r.preco_centavos ?? null, formaPagamento: r.forma_pagamento || "", statusPagamento: r.status_pagamento || "aberto", convenio: r.convenio || "" };
}

function mapEstoque(r) {
  return { id: r.id, nome: r.nome, categoria: r.categoria || "", quantidade: Number(r.quantidade || 0), qtdMinima: Number(r.qtd_minima || 0), qtdMaxima: Number(r.qtd_maxima || 0), validade: r.validade || "", restrito: Boolean(r.restrito), criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapUsuario(r) {
  return { id: r.id, nome: r.nome, email: r.email, perfil: r.perfil || "aluno", status: r.status || "ativo", criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapAuditoria(r) {
  return { id: r.id, acao: r.acao, entidade: r.entidade || "", ator: r.ator || "", registradoEm: r.registrado_em };
}
```

- [ ] **Atualizar `scripts/init-db.mjs`** — trocar verificação de `labs` para `amostras`:

```js
// Abrir o arquivo e localizar a linha com "labs" no SELECT COUNT
// Substituir:
//   const { total } = database.prepare("SELECT COUNT(*) AS total FROM labs").get();
// Por (esta linha já está em database.js, mas init-db.mjs pode ter sua própria):
// Verificar se o arquivo tem referência a labs e corrigir se necessário
```

```bash
grep -n "labs" scripts/init-db.mjs
```

Se retornar resultado, substituir `labs` por `amostras` nessas linhas.

- [ ] **Reinicializar o banco:**

```bash
npm run db:init
```

Resultado esperado: sem erros, mensagem de seed concluída.

- [ ] **Commit:**

```bash
git add server/database.js scripts/init-db.mjs
git commit -m "feat: server/database.js reescrito para entidades LAPMOL"
```

---

## Task 4: Componentes Base

**Files:**
- Create: `src/components/Nav.jsx`
- Create: `src/components/Modal.jsx`
- Create: `src/components/StatusBadge.jsx`

- [ ] **Criar `src/components/Nav.jsx`:**

```jsx
export default function Nav({ items, active, onNavigate, currentUser, onLogout }) {
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">LAPMOL</span>
        <span className="sidebar-sub">UEMA — Patologia Molecular</span>
      </div>

      <div className="sidebar-nav">
        {sections.map((section) => (
          <div key={section} className="nav-section">
            <span className="nav-section-label">{section}</span>
            {items
              .filter((i) => i.section === section)
              .map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${active === item.id ? "nav-item--active" : ""}`}
                  onClick={() => onNavigate(item.id)}
                >
                  {item.label}
                </button>
              ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <span className="sidebar-user">{currentUser?.nome}</span>
        <span className="sidebar-perfil">{currentUser?.perfil}</span>
        <button className="btn-link" onClick={onLogout}>Sair</button>
      </div>
    </nav>
  );
}
```

- [ ] **Criar `src/components/Modal.jsx`:**

```jsx
import { useEffect } from "react";

export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${wide ? "modal--wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Criar `src/components/StatusBadge.jsx`:**

```jsx
const colors = {
  recebida: "#6B7280",
  em_analise: "#D97706",
  laudo_redigido: "#2563EB",
  laudo_liberado: "#059669",
  entregue: "#374151",
  urgente: "#DC2626",
  alta: "#D97706",
  normal: "#6B7280",
  adequada: "#059669",
  hemolisada: "#D97706",
  insuficiente: "#DC2626",
  aberto: "#6B7280",
  pago: "#059669",
  parcial: "#D97706",
  ativo: "#059669",
  inativo: "#6B7280",
};

export default function StatusBadge({ value, label }) {
  const color = colors[value] || "#6B7280";
  return (
    <span
      className="status-badge"
      style={{ background: color + "20", color, border: `1px solid ${color}40` }}
    >
      {label || value}
    </span>
  );
}
```

- [ ] **Commit:**

```bash
git add src/components/
git commit -m "feat: componentes Nav, Modal e StatusBadge"
```

---

## Task 5: Reescrever App.jsx

**Files:**
- Rewrite: `src/App.jsx`

- [ ] **Substituir todo o conteúdo de `src/App.jsx`:**

```jsx
import { useState, useMemo } from "react";
import { usePersistentState } from "./storage";
import { createInitialData, STORAGE_KEY } from "./data";
import Nav from "./components/Nav";
import Dashboard from "./pages/Dashboard";
import Amostras from "./pages/Amostras";
import Laudos from "./pages/Laudos";
import Solicitantes from "./pages/Solicitantes";
import Tutores from "./pages/Tutores";
import Pacientes from "./pages/Pacientes";
import Estoque from "./pages/Estoque";
import Usuarios from "./pages/Usuarios";
import Auditoria from "./pages/Auditoria";

const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const makeProtocolo = () => {
  const hoje = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `LAPMOL-${hoje}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
};

const ALL_NAV = [
  { id: "dashboard", label: "Dashboard", section: "Operação" },
  { id: "amostras", label: "Amostras", section: "Amostras" },
  { id: "laudos", label: "Laudos", section: "Amostras" },
  { id: "solicitantes", label: "Solicitantes", section: "Cadastros" },
  { id: "tutores", label: "Tutores", section: "Cadastros" },
  { id: "pacientes", label: "Pacientes", section: "Cadastros" },
  { id: "estoque", label: "Estoque", section: "Estoque" },
  { id: "usuarios", label: "Usuários", section: "Administração" },
  { id: "auditoria", label: "Auditoria", section: "Administração" },
];

export default function App() {
  const [data, setData] = usePersistentState(STORAGE_KEY, createInitialData());
  const [screen, setScreen] = useState("login");
  const [active, setActive] = useState("dashboard");
  const [currentUserId, setCurrentUserId] = useState("");

  const currentUser = useMemo(
    () => data.usuarios.find((u) => u.id === currentUserId) || data.usuarios[0],
    [data.usuarios, currentUserId],
  );

  const acesso = useMemo(() => ({
    podeLiberar: currentUser?.perfil === "professor" || currentUser?.perfil === "coordenador",
    podeGerenciarUsuarios: currentUser?.perfil === "professor",
    podeVerAuditoria: currentUser?.perfil === "professor" || currentUser?.perfil === "coordenador",
  }), [currentUser]);

  const navItems = useMemo(() => ALL_NAV.filter((item) => {
    if (item.id === "usuarios") return acesso.podeGerenciarUsuarios;
    if (item.id === "auditoria") return acesso.podeVerAuditoria;
    return true;
  }), [acesso]);

  function registrarAuditoria(next, entidade, acao) {
    const evento = {
      id: makeId("aud"),
      acao,
      entidade,
      ator: currentUser?.nome || "Sistema",
      registradoEm: new Date().toISOString(),
    };
    return { ...next, auditoria: [evento, ...(next.auditoria || [])].slice(0, 200) };
  }

  if (screen === "login") {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1 className="login-title">LAPMOL</h1>
          <p className="login-sub">Laboratório de Patologia Molecular — UEMA</p>
          <p className="login-hint">Selecione seu perfil para continuar:</p>
          <div className="login-users">
            {data.usuarios.filter((u) => u.status === "ativo").map((u) => (
              <button
                key={u.id}
                className="login-user-btn"
                onClick={() => { setCurrentUserId(u.id); setScreen("app"); }}
              >
                <span className="login-user-nome">{u.nome}</span>
                <span className="login-user-perfil">{u.perfil}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pageProps = {
    data,
    setData,
    currentUser,
    acesso,
    makeId,
    makeProtocolo,
    registrarAuditoria,
  };

  return (
    <div className="app-shell">
      <Nav
        items={navItems}
        active={active}
        onNavigate={setActive}
        currentUser={currentUser}
        onLogout={() => setScreen("login")}
      />
      <main className="main-content">
        {active === "dashboard" && <Dashboard {...pageProps} />}
        {active === "amostras" && <Amostras {...pageProps} />}
        {active === "laudos" && <Laudos {...pageProps} />}
        {active === "solicitantes" && <Solicitantes {...pageProps} />}
        {active === "tutores" && <Tutores {...pageProps} />}
        {active === "pacientes" && <Pacientes {...pageProps} />}
        {active === "estoque" && <Estoque {...pageProps} />}
        {active === "usuarios" && acesso.podeGerenciarUsuarios && <Usuarios {...pageProps} />}
        {active === "auditoria" && acesso.podeVerAuditoria && <Auditoria {...pageProps} />}
      </main>
    </div>
  );
}
```

- [ ] **Criar stub para cada página** (para o app compilar antes de implementar cada uma):

Criar `src/pages/Dashboard.jsx`, `src/pages/Amostras.jsx`, `src/pages/Laudos.jsx`, `src/pages/Solicitantes.jsx`, `src/pages/Tutores.jsx`, `src/pages/Pacientes.jsx`, `src/pages/Estoque.jsx`, `src/pages/Usuarios.jsx`, `src/pages/Auditoria.jsx` — cada um com:

```jsx
// Exemplo para Dashboard.jsx — repetir para os outros trocando o nome
export default function Dashboard() {
  return <div className="page"><h1>Dashboard</h1><p>Em construção.</p></div>;
}
```

- [ ] **Verificar que o app compila e a tela de login aparece:**

```bash
npm run dev
```

Abrir `http://127.0.0.1:5173`. Deve aparecer a tela de login com os 3 usuários do seed. Clicar em qualquer um deve exibir o shell com o menu lateral e o stub "Em construção".

- [ ] **Commit:**

```bash
git add src/App.jsx src/pages/
git commit -m "feat: App.jsx refatorado como roteador fino, stubs de páginas criados"
```

---

## Task 6: Página Dashboard

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Implementar `src/pages/Dashboard.jsx`:**

```jsx
import StatusBadge from "../components/StatusBadge";
import { statusLabels } from "../data";

export default function Dashboard({ data }) {
  const { amostras, laudos, estoque, auditoria } = data;

  const pendentes = amostras.filter((a) => ["recebida", "em_analise"].includes(a.status));
  const semLaudo = amostras.filter(
    (a) => !["laudo_liberado", "entregue"].includes(a.status) && !laudos.find((l) => l.amostraId === a.id),
  );
  const laudosRedigidos = amostras.filter((a) => a.status === "laudo_redigido");
  const estoqueCritico = estoque.filter((e) => e.quantidade < e.qtdMinima);

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>

      <div className="stats-grid">
        <StatCard label="Amostras pendentes" value={pendentes.length} color="#D97706" />
        <StatCard label="Sem laudo" value={semLaudo.length} color="#DC2626" />
        <StatCard label="Laudos aguardando liberação" value={laudosRedigidos.length} color="#2563EB" />
        <StatCard label="Estoque crítico" value={estoqueCritico.length} color="#DC2626" />
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2 className="section-title">Amostras em andamento</h2>
          {pendentes.length === 0 ? (
            <p className="empty-text">Nenhuma amostra pendente.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Protocolo</th><th>Tipo</th><th>Prioridade</th><th>Status</th></tr>
              </thead>
              <tbody>
                {pendentes.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.protocolo}</td>
                    <td>{a.tipoExame}</td>
                    <td><StatusBadge value={a.prioridade} label={statusLabels[a.prioridade]} /></td>
                    <td><StatusBadge value={a.status} label={statusLabels[a.status]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {estoqueCritico.length > 0 && (
          <section className="dashboard-section">
            <h2 className="section-title">⚠ Estoque crítico</h2>
            <table className="table">
              <thead>
                <tr><th>Item</th><th>Categoria</th><th>Qtd atual</th><th>Mínimo</th></tr>
              </thead>
              <tbody>
                {estoqueCritico.map((e) => (
                  <tr key={e.id} className="row-alert">
                    <td>{e.nome}</td>
                    <td>{e.categoria}</td>
                    <td className="text-danger">{e.quantidade}</td>
                    <td>{e.qtdMinima}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="dashboard-section">
          <h2 className="section-title">Últimas ações</h2>
          <ul className="audit-list">
            {auditoria.slice(0, 8).map((a) => (
              <li key={a.id} className="audit-item">
                <span className="audit-acao">{a.acao}</span>
                <span className="audit-meta">{a.ator} · {new Date(a.registradoEm).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <span className="stat-value" style={{ color }}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
```

- [ ] **Verificar no browser:** Dashboard mostra 3 cards de contagem (2 amostras pendentes, 1 sem laudo, 0 aguardando liberação, 2 itens de estoque crítico com base no seed).

- [ ] **Commit:**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: página Dashboard com pendências e estoque crítico"
```

---

## Task 7: Página Amostras

**Files:**
- Modify: `src/pages/Amostras.jsx`

- [ ] **Implementar `src/pages/Amostras.jsx`:**

```jsx
import { useState, useMemo } from "react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { statusLabels } from "../data";
import { createQrSvg } from "../qr";

const STATUS_FLOW = ["recebida", "em_analise", "laudo_redigido", "laudo_liberado", "entregue"];
const CONDICOES = ["adequada", "hemolisada", "insuficiente"];
const PRIORIDADES = ["normal", "alta", "urgente"];

export default function Amostras({ data, setData, currentUser, makeId, makeProtocolo, registrarAuditoria }) {
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [qrAmostra, setQrAmostra] = useState(null);

  const { amostras, pacientes, solicitantes } = data;

  const nomePaciente = (id) => pacientes.find((p) => p.id === id)?.nome || "—";
  const nomeSolicitante = (id) => solicitantes.find((s) => s.id === id)?.nome || "—";

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase();
    if (!q) return amostras;
    return amostras.filter(
      (a) =>
        a.protocolo.toLowerCase().includes(q) ||
        nomePaciente(a.pacienteId).toLowerCase().includes(q) ||
        nomeSolicitante(a.solicitanteId).toLowerCase().includes(q) ||
        a.tipoExame.toLowerCase().includes(q),
    );
  }, [amostras, busca, pacientes, solicitantes]);

  function salvar(values) {
    setData((cur) => {
      const isNova = !values.id;
      const registro = isNova
        ? { ...values, id: makeId("amo"), protocolo: makeProtocolo(), criadoEm: new Date().toISOString() }
        : { ...cur.amostras.find((a) => a.id === values.id), ...values, atualizadoEm: new Date().toISOString() };

      const novas = isNova
        ? [registro, ...cur.amostras]
        : cur.amostras.map((a) => (a.id === registro.id ? registro : a));

      return registrarAuditoria(
        { ...cur, amostras: novas },
        "Amostras",
        `${isNova ? "Nova amostra" : "Amostra atualizada"}: ${registro.protocolo}`,
      );
    });
    setEditando(null);
  }

  function remover(id) {
    if (!confirm("Remover esta amostra?")) return;
    setData((cur) => {
      const amostra = cur.amostras.find((a) => a.id === id);
      return registrarAuditoria(
        {
          ...cur,
          amostras: cur.amostras.filter((a) => a.id !== id),
          laudos: cur.laudos.filter((l) => l.amostraId !== id),
          financeiro: cur.financeiro.filter((f) => f.amostraId !== id),
        },
        "Amostras",
        `Amostra removida: ${amostra?.protocolo}`,
      );
    });
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Amostras</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Nova amostra</button>
      </div>

      <input
        className="search-input"
        placeholder="Buscar por protocolo, paciente, solicitante ou tipo..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <table className="table">
        <thead>
          <tr>
            <th>Protocolo</th><th>Paciente</th><th>Solicitante</th>
            <th>Tipo</th><th>Prioridade</th><th>Status</th><th>Recebimento</th><th></th>
          </tr>
        </thead>
        <tbody>
          {filtradas.map((a) => (
            <tr key={a.id}>
              <td className="mono">{a.protocolo}</td>
              <td>{nomePaciente(a.pacienteId)}</td>
              <td>{nomeSolicitante(a.solicitanteId)}</td>
              <td>{a.tipoExame}</td>
              <td><StatusBadge value={a.prioridade} label={statusLabels[a.prioridade]} /></td>
              <td><StatusBadge value={a.status} label={statusLabels[a.status]} /></td>
              <td>{a.dataRecebimento}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setQrAmostra(a)}>QR</button>
                <button className="btn-sm" onClick={() => setEditando(a)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(a.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editando !== null && (
        <AmostraModal
          amostra={editando}
          pacientes={pacientes}
          solicitantes={solicitantes}
          onSalvar={salvar}
          onFechar={() => setEditando(null)}
        />
      )}

      {qrAmostra && (
        <Modal title={`Etiqueta — ${qrAmostra.protocolo}`} onClose={() => setQrAmostra(null)}>
          <div className="qr-container">
            <div
              className="qr-svg"
              dangerouslySetInnerHTML={{ __html: createQrSvg(qrAmostra.protocolo, 200) }}
            />
            <p className="qr-protocolo">{qrAmostra.protocolo}</p>
            <p className="qr-sub">{nomePaciente(qrAmostra.pacienteId)} · {qrAmostra.tipoExame}</p>
            <button className="btn-primary" onClick={() => window.print()}>Imprimir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AmostraModal({ amostra, pacientes, solicitantes, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    pacienteId: amostra.pacienteId || "",
    solicitanteId: amostra.solicitanteId || "",
    tipoExame: amostra.tipoExame || "",
    material: amostra.material || "",
    condicao: amostra.condicao || "adequada",
    prioridade: amostra.prioridade || "normal",
    status: amostra.status || "recebida",
    dataColeta: amostra.dataColeta || new Date().toLocaleDateString("sv-SE"),
    dataRecebimento: amostra.dataRecebimento || new Date().toLocaleDateString("sv-SE"),
    observacoes: amostra.observacoes || "",
    id: amostra.id,
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Modal title={amostra.id ? `Editar — ${amostra.protocolo}` : "Nova Amostra"} onClose={onFechar} wide>
      <div className="form-grid">
        <label className="form-field">
          Paciente
          <select value={form.pacienteId} onChange={set("pacienteId")}>
            <option value="">— selecione —</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.especie})</option>)}
          </select>
        </label>

        <label className="form-field">
          Solicitante
          <select value={form.solicitanteId} onChange={set("solicitanteId")}>
            <option value="">— selecione —</option>
            {solicitantes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>

        <label className="form-field">
          Tipo de exame
          <input value={form.tipoExame} onChange={set("tipoExame")} placeholder="PCR, Histopatológico..." />
        </label>

        <label className="form-field">
          Material
          <input value={form.material} onChange={set("material")} placeholder="Swab nasal, tecido..." />
        </label>

        <label className="form-field">
          Condição da amostra
          <select value={form.condicao} onChange={set("condicao")}>
            {CONDICOES.map((c) => <option key={c} value={c}>{statusLabels[c]}</option>)}
          </select>
        </label>

        <label className="form-field">
          Prioridade
          <select value={form.prioridade} onChange={set("prioridade")}>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{statusLabels[p]}</option>)}
          </select>
        </label>

        <label className="form-field">
          Status
          <select value={form.status} onChange={set("status")}>
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>
        </label>

        <label className="form-field">
          Data de coleta
          <input type="date" value={form.dataColeta} onChange={set("dataColeta")} />
        </label>

        <label className="form-field">
          Data de recebimento
          <input type="date" value={form.dataRecebimento} onChange={set("dataRecebimento")} />
        </label>

        <label className="form-field form-field--full">
          Observações
          <textarea value={form.observacoes} onChange={set("observacoes")} rows={3} />
        </label>
      </div>

      <div className="modal-footer">
        <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </Modal>
  );
}
```

- [ ] **Verificar no browser:** Listar as 3 amostras do seed; busca por "LAPMOL" filtra; clicar em QR abre modal com QR Code; clicar em Editar abre formulário; salvar atualiza a lista.

- [ ] **Commit:**

```bash
git add src/pages/Amostras.jsx
git commit -m "feat: página Amostras com CRUD, busca e etiqueta QR"
```

---

## Task 8: Página Laudos

**Files:**
- Modify: `src/pages/Laudos.jsx`

- [ ] **Implementar `src/pages/Laudos.jsx`:**

```jsx
import { useState, useMemo } from "react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { statusLabels } from "../data";

export default function Laudos({ data, setData, currentUser, acesso, makeId, registrarAuditoria }) {
  const [amostraSelecionada, setAmostraSelecionada] = useState(null);

  const { amostras, laudos, pacientes, solicitantes } = data;

  const nomePaciente = (id) => pacientes.find((p) => p.id === id)?.nome || "—";
  const nomeSolicitante = (id) => solicitantes.find((s) => s.id === id)?.nome || "—";
  const laudoDe = (amostraId) => laudos.find((l) => l.amostraId === amostraId);

  const amostrasCom = useMemo(() =>
    amostras.map((a) => ({ ...a, laudo: laudoDe(a.id) })),
    [amostras, laudos],
  );

  function salvarLaudo(amostra, form) {
    setData((cur) => {
      const laudoExistente = cur.laudos.find((l) => l.amostraId === amostra.id);
      const novoLaudo = laudoExistente
        ? { ...laudoExistente, ...form, atualizadoEm: new Date().toISOString() }
        : { id: makeId("lau"), amostraId: amostra.id, ...form, criadoEm: new Date().toISOString() };

      const novosLaudos = laudoExistente
        ? cur.laudos.map((l) => (l.amostraId === amostra.id ? novoLaudo : l))
        : [...cur.laudos, novoLaudo];

      const novasAmostras = cur.amostras.map((a) =>
        a.id === amostra.id ? { ...a, status: "laudo_redigido", atualizadoEm: new Date().toISOString() } : a,
      );

      return registrarAuditoria(
        { ...cur, amostras: novasAmostras, laudos: novosLaudos },
        "Laudos",
        `Laudo redigido: ${amostra.protocolo}`,
      );
    });
    setAmostraSelecionada(null);
  }

  function liberarLaudo(amostra) {
    if (!acesso.podeLiberar) return alert("Sem permissão para liberar laudos.");
    if (!confirm(`Liberar laudo da amostra ${amostra.protocolo}?`)) return;

    setData((cur) => {
      const novosLaudos = cur.laudos.map((l) =>
        l.amostraId === amostra.id
          ? { ...l, liberadoPor: currentUser.nome, liberadoEm: new Date().toLocaleDateString("sv-SE"), atualizadoEm: new Date().toISOString() }
          : l,
      );
      const novasAmostras = cur.amostras.map((a) =>
        a.id === amostra.id ? { ...a, status: "laudo_liberado", atualizadoEm: new Date().toISOString() } : a,
      );
      return registrarAuditoria(
        { ...cur, amostras: novasAmostras, laudos: novosLaudos },
        "Laudos",
        `Laudo liberado: ${amostra.protocolo} por ${currentUser.nome}`,
      );
    });
  }

  function imprimirLaudo(amostra) {
    const laudo = laudoDe(amostra.id);
    if (!laudo) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Laudo ${amostra.protocolo}</title>
      <style>body{font-family:Arial,sans-serif;margin:40px;} h1{font-size:18px;} .field{margin:12px 0;} label{font-weight:bold;display:block;} .footer{margin-top:40px;border-top:1px solid #ccc;padding-top:16px;}</style>
      </head><body>
      <h1>LAPMOL — Laboratório de Patologia Molecular / UEMA</h1>
      <div class="field"><label>Protocolo:</label>${amostra.protocolo}</div>
      <div class="field"><label>Paciente:</label>${nomePaciente(amostra.pacienteId)}</div>
      <div class="field"><label>Solicitante:</label>${nomeSolicitante(amostra.solicitanteId)}</div>
      <div class="field"><label>Tipo de exame:</label>${amostra.tipoExame}</div>
      <div class="field"><label>Material:</label>${amostra.material}</div>
      <div class="field"><label>Descrição macroscópica:</label>${laudo.macro}</div>
      <div class="field"><label>Descrição microscópica:</label>${laudo.micro}</div>
      <div class="field"><label>Diagnóstico:</label>${laudo.diagnostico}</div>
      <div class="field"><label>Comentários:</label>${laudo.comentarios}</div>
      <div class="footer"><label>Responsável:</label>${laudo.responsavel} — Liberado em: ${laudo.liberadoEm || "—"}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Laudos</h1>
      </div>

      <table className="table">
        <thead>
          <tr><th>Protocolo</th><th>Paciente</th><th>Tipo</th><th>Status</th><th>Laudo</th><th></th></tr>
        </thead>
        <tbody>
          {amostrasCom.map((a) => (
            <tr key={a.id}>
              <td className="mono">{a.protocolo}</td>
              <td>{nomePaciente(a.pacienteId)}</td>
              <td>{a.tipoExame}</td>
              <td><StatusBadge value={a.status} label={statusLabels[a.status]} /></td>
              <td>{a.laudo ? (a.laudo.liberadoEm ? "Liberado" : "Redigido") : "Sem laudo"}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setAmostraSelecionada(a)}>
                  {a.laudo ? "Editar laudo" : "Redigir laudo"}
                </button>
                {a.laudo && !a.laudo.liberadoEm && acesso.podeLiberar && (
                  <button className="btn-sm btn-success" onClick={() => liberarLaudo(a)}>Liberar</button>
                )}
                {a.laudo?.liberadoEm && (
                  <button className="btn-sm" onClick={() => imprimirLaudo(a)}>Imprimir</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {amostraSelecionada && (
        <LaudoModal
          amostra={amostraSelecionada}
          laudo={laudoDe(amostraSelecionada.id)}
          currentUser={currentUser}
          onSalvar={(form) => salvarLaudo(amostraSelecionada, form)}
          onFechar={() => setAmostraSelecionada(null)}
        />
      )}
    </div>
  );
}

function LaudoModal({ amostra, laudo, currentUser, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    macro: laudo?.macro || "",
    micro: laudo?.micro || "",
    diagnostico: laudo?.diagnostico || "",
    comentarios: laudo?.comentarios || "",
    responsavel: laudo?.responsavel || currentUser?.nome || "",
    liberadoPor: laudo?.liberadoPor || "",
    liberadoEm: laudo?.liberadoEm || "",
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Modal title={`Laudo — ${amostra.protocolo}`} onClose={onFechar} wide>
      <div className="form-grid">
        <label className="form-field form-field--full">
          Descrição macroscópica
          <textarea value={form.macro} onChange={set("macro")} rows={3} />
        </label>
        <label className="form-field form-field--full">
          Descrição microscópica
          <textarea value={form.micro} onChange={set("micro")} rows={3} />
        </label>
        <label className="form-field form-field--full">
          Diagnóstico conclusivo
          <textarea value={form.diagnostico} onChange={set("diagnostico")} rows={3} />
        </label>
        <label className="form-field form-field--full">
          Comentários / recomendações
          <textarea value={form.comentarios} onChange={set("comentarios")} rows={2} />
        </label>
        <label className="form-field">
          Responsável pelo laudo
          <input value={form.responsavel} onChange={set("responsavel")} />
        </label>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar laudo</button>
      </div>
    </Modal>
  );
}
```

- [ ] **Verificar no browser:** Página Laudos lista todas as amostras; clicar em "Editar laudo" em LAPMOL-20260414-001 mostra o laudo preexistente; clicar "Liberar" (como professor/coordenador) muda o status; "Imprimir" abre janela de impressão com laudo formatado.

- [ ] **Commit:**

```bash
git add src/pages/Laudos.jsx
git commit -m "feat: página Laudos com editor, liberação e impressão"
```

---

## Task 9: Páginas CRUD Simples (Solicitantes, Tutores, Pacientes)

> Estas três páginas seguem o mesmo padrão. Implementar uma de cada vez, verificando no browser após cada uma.

**Files:**
- Modify: `src/pages/Solicitantes.jsx`
- Modify: `src/pages/Tutores.jsx`
- Modify: `src/pages/Pacientes.jsx`

- [ ] **Implementar `src/pages/Solicitantes.jsx`:**

```jsx
import { useState } from "react";
import Modal from "../components/Modal";

const CAMPOS = [
  { key: "nome", label: "Nome", required: true },
  { key: "crmv", label: "CRMV" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "endereco", label: "Endereço" },
  { key: "especies", label: "Espécies atendidas" },
];

export default function Solicitantes({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const filtrados = data.solicitantes.filter((s) =>
    !busca || s.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const reg = isNovo
        ? { ...form, id: makeId("sol"), criadoEm: new Date().toISOString() }
        : cur.solicitantes.map((s) => s.id === form.id ? { ...s, ...form, atualizadoEm: new Date().toISOString() } : s).find((s) => s.id === form.id);

      const novos = isNovo
        ? [...cur.solicitantes, reg]
        : cur.solicitantes.map((s) => s.id === form.id ? { ...s, ...form, atualizadoEm: new Date().toISOString() } : s);

      return registrarAuditoria({ ...cur, solicitantes: novos }, "Solicitantes", `${isNovo ? "Novo" : "Atualizado"} solicitante: ${form.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const s = data.solicitantes.find((s) => s.id === id);
    if (!confirm(`Remover ${s?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, solicitantes: cur.solicitantes.filter((s) => s.id !== id) },
      "Solicitantes", `Solicitante removido: ${s?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Solicitantes</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo</button>
      </div>
      <input className="search-input" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <table className="table">
        <thead><tr><th>Nome</th><th>CRMV</th><th>Telefone</th><th>E-mail</th><th></th></tr></thead>
        <tbody>
          {filtrados.map((s) => (
            <tr key={s.id}>
              <td>{s.nome}</td><td>{s.crmv}</td><td>{s.telefone}</td><td>{s.email}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setEditando(s)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(s.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editando !== null && (
        <Modal title={editando.id ? "Editar Solicitante" : "Novo Solicitante"} onClose={() => setEditando(null)} wide>
          <CrudForm campos={CAMPOS} inicial={editando} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  );
}

function CrudForm({ campos, inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState({ ...inicial });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="form-grid">
        {campos.map(({ key, label }) => (
          <label key={key} className="form-field">
            {label}
            <input value={form[key] || ""} onChange={set(key)} />
          </label>
        ))}
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </>
  );
}
```

- [ ] **Implementar `src/pages/Tutores.jsx`** — mesmo padrão, campos diferentes:

```jsx
import { useState } from "react";
import Modal from "../components/Modal";

const CAMPOS = [
  { key: "nome", label: "Nome", required: true },
  { key: "cpf", label: "CPF" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "cidade", label: "Cidade" },
  { key: "endereco", label: "Endereço" },
];

export default function Tutores({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const filtrados = data.tutores.filter((t) =>
    !busca || t.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const novos = isNovo
        ? [...cur.tutores, { ...form, id: makeId("tut"), criadoEm: new Date().toISOString() }]
        : cur.tutores.map((t) => t.id === form.id ? { ...t, ...form, atualizadoEm: new Date().toISOString() } : t);
      return registrarAuditoria({ ...cur, tutores: novos }, "Tutores", `${isNovo ? "Novo" : "Atualizado"} tutor: ${form.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const t = data.tutores.find((t) => t.id === id);
    if (!confirm(`Remover ${t?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, tutores: cur.tutores.filter((t) => t.id !== id) },
      "Tutores", `Tutor removido: ${t?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Tutores</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo</button>
      </div>
      <input className="search-input" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <table className="table">
        <thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Cidade</th><th></th></tr></thead>
        <tbody>
          {filtrados.map((t) => (
            <tr key={t.id}>
              <td>{t.nome}</td><td>{t.cpf}</td><td>{t.telefone}</td><td>{t.cidade}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setEditando(t)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(t.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editando !== null && (
        <Modal title={editando.id ? "Editar Tutor" : "Novo Tutor"} onClose={() => setEditando(null)} wide>
          <div className="form-grid">
            {CAMPOS.map(({ key, label }) => (
              <label key={key} className="form-field">
                {label}
                <input value={editando[key] || ""} onChange={(e) => setEditando((f) => ({ ...f, [key]: e.target.value }))} />
              </label>
            ))}
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
            <button className="btn-primary" onClick={() => salvar(editando)}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

- [ ] **Implementar `src/pages/Pacientes.jsx`:**

```jsx
import { useState } from "react";
import Modal from "../components/Modal";

export default function Pacientes({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const { pacientes, tutores } = data;
  const nomeTutor = (id) => tutores.find((t) => t.id === id)?.nome || "—";

  const filtrados = pacientes.filter((p) =>
    !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || nomeTutor(p.tutorId).toLowerCase().includes(busca.toLowerCase()),
  );

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const novos = isNovo
        ? [...cur.pacientes, { ...form, id: makeId("pac"), criadoEm: new Date().toISOString() }]
        : cur.pacientes.map((p) => p.id === form.id ? { ...p, ...form, atualizadoEm: new Date().toISOString() } : p);
      return registrarAuditoria({ ...cur, pacientes: novos }, "Pacientes", `${isNovo ? "Novo" : "Atualizado"} paciente: ${form.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const p = pacientes.find((p) => p.id === id);
    if (!confirm(`Remover ${p?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, pacientes: cur.pacientes.filter((p) => p.id !== id) },
      "Pacientes", `Paciente removido: ${p?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Pacientes</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo</button>
      </div>
      <input className="search-input" placeholder="Buscar por nome ou tutor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <table className="table">
        <thead><tr><th>Nome</th><th>Espécie</th><th>Raça</th><th>Sexo</th><th>Tutor</th><th></th></tr></thead>
        <tbody>
          {filtrados.map((p) => (
            <tr key={p.id}>
              <td>{p.nome}</td><td>{p.especie}</td><td>{p.raca}</td><td>{p.sexo}</td>
              <td>{nomeTutor(p.tutorId)}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setEditando(p)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(p.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editando !== null && (
        <Modal title={editando.id ? "Editar Paciente" : "Novo Paciente"} onClose={() => setEditando(null)} wide>
          <PacienteForm form={editando} tutores={tutores} onChange={setEditando} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  );
}

function PacienteForm({ form, tutores, onChange, onSalvar, onCancelar }) {
  const set = (k) => (e) => onChange((f) => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="form-grid">
        <label className="form-field"><span>Nome</span><input value={form.nome || ""} onChange={set("nome")} /></label>
        <label className="form-field"><span>Espécie</span><input value={form.especie || ""} onChange={set("especie")} placeholder="Canino, Felino..." /></label>
        <label className="form-field"><span>Raça</span><input value={form.raca || ""} onChange={set("raca")} /></label>
        <label className="form-field"><span>Idade</span><input value={form.idade || ""} onChange={set("idade")} /></label>
        <label className="form-field">
          <span>Sexo</span>
          <select value={form.sexo || ""} onChange={set("sexo")}>
            <option value="">—</option>
            <option value="Macho">Macho</option>
            <option value="Fêmea">Fêmea</option>
          </select>
        </label>
        <label className="form-field"><span>Pelagem</span><input value={form.pelagem || ""} onChange={set("pelagem")} /></label>
        <label className="form-field">
          <span>Tutor</span>
          <select value={form.tutorId || ""} onChange={set("tutorId")}>
            <option value="">— selecione —</option>
            {tutores.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </label>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </>
  );
}
```

- [ ] **Verificar no browser:** Cada módulo lista os registros do seed, busca funciona, formulário de criação/edição abre e salva.

- [ ] **Commit:**

```bash
git add src/pages/Solicitantes.jsx src/pages/Tutores.jsx src/pages/Pacientes.jsx
git commit -m "feat: páginas CRUD de Solicitantes, Tutores e Pacientes"
```

---

## Task 10: Página Estoque

**Files:**
- Modify: `src/pages/Estoque.jsx`

- [ ] **Implementar `src/pages/Estoque.jsx`:**

```jsx
import { useState } from "react";
import Modal from "../components/Modal";

export default function Estoque({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const filtrados = data.estoque.filter((e) =>
    !busca || e.nome.toLowerCase().includes(busca.toLowerCase()) || e.categoria.toLowerCase().includes(busca.toLowerCase()),
  );

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const reg = {
        ...form,
        quantidade: Number(form.quantidade || 0),
        qtdMinima: Number(form.qtdMinima || 0),
        qtdMaxima: Number(form.qtdMaxima || 0),
        restrito: Boolean(form.restrito),
      };
      const novos = isNovo
        ? [...cur.estoque, { ...reg, id: makeId("est"), criadoEm: new Date().toISOString() }]
        : cur.estoque.map((e) => e.id === reg.id ? { ...e, ...reg, atualizadoEm: new Date().toISOString() } : e);
      return registrarAuditoria({ ...cur, estoque: novos }, "Estoque", `${isNovo ? "Novo item" : "Item atualizado"}: ${reg.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const e = data.estoque.find((e) => e.id === id);
    if (!confirm(`Remover ${e?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, estoque: cur.estoque.filter((e) => e.id !== id) },
      "Estoque", `Item removido: ${e?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Estoque</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo item</button>
      </div>
      <input className="search-input" placeholder="Buscar por nome ou categoria..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <table className="table">
        <thead>
          <tr><th>Nome</th><th>Categoria</th><th>Qtd</th><th>Mín.</th><th>Validade</th><th>Restrito</th><th></th></tr>
        </thead>
        <tbody>
          {filtrados.map((e) => {
            const critico = e.quantidade < e.qtdMinima;
            return (
              <tr key={e.id} className={critico ? "row-alert" : ""}>
                <td>{e.nome}</td>
                <td>{e.categoria}</td>
                <td className={critico ? "text-danger" : ""}>{e.quantidade}</td>
                <td>{e.qtdMinima}</td>
                <td>{e.validade || "—"}</td>
                <td>{e.restrito ? "Sim" : "Não"}</td>
                <td className="row-actions">
                  <button className="btn-sm" onClick={() => setEditando(e)}>Editar</button>
                  <button className="btn-sm btn-danger" onClick={() => remover(e.id)}>Rem.</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editando !== null && (
        <Modal title={editando.id ? "Editar Item" : "Novo Item"} onClose={() => setEditando(null)} wide>
          <EstoqueForm form={editando} onChange={setEditando} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  );
}

function EstoqueForm({ form, onChange, onSalvar, onCancelar }) {
  const set = (k) => (e) => onChange((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  return (
    <>
      <div className="form-grid">
        <label className="form-field"><span>Nome</span><input value={form.nome || ""} onChange={set("nome")} /></label>
        <label className="form-field"><span>Categoria</span><input value={form.categoria || ""} onChange={set("categoria")} placeholder="Fixador, Reagente..." /></label>
        <label className="form-field"><span>Quantidade</span><input type="number" min="0" value={form.quantidade ?? ""} onChange={set("quantidade")} /></label>
        <label className="form-field"><span>Qtd. mínima</span><input type="number" min="0" value={form.qtdMinima ?? ""} onChange={set("qtdMinima")} /></label>
        <label className="form-field"><span>Qtd. máxima</span><input type="number" min="0" value={form.qtdMaxima ?? ""} onChange={set("qtdMaxima")} /></label>
        <label className="form-field"><span>Validade</span><input type="date" value={form.validade || ""} onChange={set("validade")} /></label>
        <label className="form-field form-field--checkbox">
          <input type="checkbox" checked={Boolean(form.restrito)} onChange={set("restrito")} />
          <span>Produto restrito</span>
        </label>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </>
  );
}
```

- [ ] **Verificar no browser:** Itens do seed listados; linhas críticas (Formalina e Luvas) em destaque; formulário salva corretamente.

- [ ] **Commit:**

```bash
git add src/pages/Estoque.jsx
git commit -m "feat: página Estoque com alertas de quantidade mínima"
```

---

## Task 11: Páginas Usuários e Auditoria

**Files:**
- Modify: `src/pages/Usuarios.jsx`
- Modify: `src/pages/Auditoria.jsx`

- [ ] **Implementar `src/pages/Usuarios.jsx`:**

```jsx
import { useState } from "react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { statusLabels } from "../data";

const PERFIS = ["professor", "coordenador", "aluno"];

export default function Usuarios({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const novos = isNovo
        ? [...cur.usuarios, { ...form, id: makeId("usr"), criadoEm: new Date().toISOString() }]
        : cur.usuarios.map((u) => u.id === form.id ? { ...u, ...form, atualizadoEm: new Date().toISOString() } : u);
      return registrarAuditoria({ ...cur, usuarios: novos }, "Usuários", `${isNovo ? "Novo" : "Atualizado"} usuário: ${form.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const u = data.usuarios.find((u) => u.id === id);
    if (!confirm(`Remover ${u?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, usuarios: cur.usuarios.filter((u) => u.id !== id) },
      "Usuários", `Usuário removido: ${u?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Usuários</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo usuário</button>
      </div>
      <table className="table">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {data.usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nome}</td><td>{u.email}</td>
              <td><StatusBadge value={u.perfil} label={statusLabels[u.perfil]} /></td>
              <td><StatusBadge value={u.status} label={statusLabels[u.status]} /></td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setEditando(u)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(u.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editando !== null && (
        <Modal title={editando.id ? "Editar Usuário" : "Novo Usuário"} onClose={() => setEditando(null)}>
          <UsuarioForm form={editando} onChange={setEditando} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  );
}

function UsuarioForm({ form, onChange, onSalvar, onCancelar }) {
  const set = (k) => (e) => onChange((f) => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="form-grid">
        <label className="form-field"><span>Nome</span><input value={form.nome || ""} onChange={set("nome")} /></label>
        <label className="form-field"><span>E-mail</span><input type="email" value={form.email || ""} onChange={set("email")} /></label>
        <label className="form-field">
          <span>Perfil</span>
          <select value={form.perfil || "aluno"} onChange={set("perfil")}>
            {PERFIS.map((p) => <option key={p} value={p}>{statusLabels[p] || p}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select value={form.status || "ativo"} onChange={set("status")}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </>
  );
}
```

- [ ] **Implementar `src/pages/Auditoria.jsx`:**

```jsx
export default function Auditoria({ data }) {
  return (
    <div className="page">
      <h1 className="page-title">Auditoria</h1>
      <table className="table">
        <thead>
          <tr><th>Data/hora</th><th>Módulo</th><th>Ação</th><th>Ator</th></tr>
        </thead>
        <tbody>
          {data.auditoria.map((a) => (
            <tr key={a.id}>
              <td className="mono">{new Date(a.registradoEm).toLocaleString("pt-BR")}</td>
              <td>{a.entidade}</td>
              <td>{a.acao}</td>
              <td>{a.ator}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.auditoria.length === 0 && <p className="empty-text">Nenhum registro ainda.</p>}
    </div>
  );
}
```

- [ ] **Verificar no browser:** Usuários listados com badges de perfil; aluno não vê a seção Usuários no menu; Auditoria exibe o log do seed.

- [ ] **Commit:**

```bash
git add src/pages/Usuarios.jsx src/pages/Auditoria.jsx
git commit -m "feat: páginas Usuários e Auditoria"
```

---

## Task 12: Atualizar styles.css

**Files:**
- Modify: `src/styles.css`

- [ ] **Adicionar ao final de `src/styles.css`** as classes usadas pelos novos componentes (se já não existirem classes equivalentes no arquivo atual):

```css
/* === Shell === */
.app-shell { display: flex; height: 100vh; overflow: hidden; }
.main-content { flex: 1; overflow-y: auto; padding: 24px; background: #F9FAFB; }

/* === Sidebar === */
.sidebar { width: 220px; min-width: 220px; background: #1A2E22; color: #fff; display: flex; flex-direction: column; }
.sidebar-header { padding: 20px 16px 12px; border-bottom: 1px solid #2D4A35; }
.sidebar-logo { display: block; font-size: 20px; font-weight: 700; color: #4ADE80; }
.sidebar-sub { display: block; font-size: 11px; color: #9CA3AF; margin-top: 2px; }
.sidebar-nav { flex: 1; overflow-y: auto; padding: 8px 0; }
.nav-section { margin-bottom: 4px; }
.nav-section-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6B7280; padding: 8px 16px 4px; }
.nav-item { display: block; width: 100%; text-align: left; padding: 8px 16px; font-size: 14px; color: #D1FAE5; background: none; border: none; cursor: pointer; border-radius: 0; }
.nav-item:hover { background: #2D4A35; }
.nav-item--active { background: #285A43; color: #fff; font-weight: 600; }
.sidebar-footer { padding: 12px 16px; border-top: 1px solid #2D4A35; }
.sidebar-user { display: block; font-size: 13px; font-weight: 600; color: #fff; }
.sidebar-perfil { display: block; font-size: 11px; color: #9CA3AF; text-transform: capitalize; margin-bottom: 8px; }

/* === Login === */
.login-screen { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #F0FDF4; }
.login-card { background: #fff; border-radius: 12px; padding: 40px; width: 360px; box-shadow: 0 4px 24px rgba(0,0,0,.08); text-align: center; }
.login-title { font-size: 28px; font-weight: 700; color: #1A2E22; margin-bottom: 4px; }
.login-sub { font-size: 13px; color: #6B7280; margin-bottom: 24px; }
.login-hint { font-size: 13px; color: #374151; margin-bottom: 12px; }
.login-users { display: flex; flex-direction: column; gap: 8px; }
.login-user-btn { display: flex; flex-direction: column; padding: 12px 16px; border: 1px solid #D1FAE5; border-radius: 8px; background: #F0FDF4; cursor: pointer; text-align: left; }
.login-user-btn:hover { background: #DCFCE7; border-color: #4ADE80; }
.login-user-nome { font-size: 14px; font-weight: 600; color: #1A2E22; }
.login-user-perfil { font-size: 12px; color: #6B7280; text-transform: capitalize; }

/* === Page === */
.page { max-width: 1100px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { font-size: 22px; font-weight: 700; color: #1A2E22; }

/* === Buttons === */
.btn-primary { background: #285A43; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500; }
.btn-primary:hover { background: #1A3D2B; }
.btn-secondary { background: #fff; color: #374151; border: 1px solid #D1D5DB; padding: 8px 18px; border-radius: 6px; font-size: 14px; cursor: pointer; }
.btn-link { background: none; border: none; color: #9CA3AF; font-size: 12px; cursor: pointer; padding: 0; text-decoration: underline; }
.btn-sm { font-size: 12px; padding: 4px 10px; border-radius: 4px; border: 1px solid #D1D5DB; background: #fff; cursor: pointer; }
.btn-sm:hover { background: #F3F4F6; }
.btn-danger { color: #DC2626; border-color: #FCA5A5; }
.btn-danger:hover { background: #FEF2F2; }
.btn-success { color: #059669; border-color: #6EE7B7; }
.btn-success:hover { background: #ECFDF5; }

/* === Search === */
.search-input { width: 100%; max-width: 420px; padding: 8px 12px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px; margin-bottom: 16px; }

/* === Table === */
.table { width: 100%; border-collapse: collapse; font-size: 14px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.table th { background: #F9FAFB; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB; }
.table td { padding: 10px 14px; border-bottom: 1px solid #F3F4F6; color: #374151; }
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: #F9FAFB; }
.row-alert td { background: #FFF7ED; }
.row-actions { white-space: nowrap; display: flex; gap: 4px; }
.text-danger { color: #DC2626; font-weight: 600; }
.mono { font-family: monospace; font-size: 13px; }
.empty-text { color: #9CA3AF; font-size: 14px; margin: 24px 0; }

/* === Modal === */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 10px; width: 480px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 40px rgba(0,0,0,.18); }
.modal--wide { width: 720px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #E5E7EB; }
.modal-title { font-size: 16px; font-weight: 600; color: #1A2E22; }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #9CA3AF; }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 16px; border-top: 1px solid #E5E7EB; margin-top: 8px; }

/* === Form === */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 500; color: #374151; }
.form-field input, .form-field select, .form-field textarea { padding: 7px 10px; border: 1px solid #D1D5DB; border-radius: 5px; font-size: 14px; font-family: inherit; }
.form-field textarea { resize: vertical; }
.form-field--full { grid-column: 1 / -1; }
.form-field--checkbox { flex-direction: row; align-items: center; gap: 8px; }

/* === Dashboard === */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
.stat-card { background: #fff; border-radius: 8px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.stat-value { display: block; font-size: 32px; font-weight: 700; }
.stat-label { display: block; font-size: 13px; color: #6B7280; margin-top: 4px; }
.dashboard-sections { display: flex; flex-direction: column; gap: 24px; }
.dashboard-section { background: #fff; border-radius: 8px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.section-title { font-size: 15px; font-weight: 600; color: #1A2E22; margin-bottom: 12px; }

/* === Audit list === */
.audit-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.audit-item { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; border-bottom: 1px solid #F3F4F6; }
.audit-item:last-child { border-bottom: none; }
.audit-acao { font-size: 13px; color: #374151; }
.audit-meta { font-size: 12px; color: #9CA3AF; }

/* === Status Badge === */
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }

/* === QR === */
.qr-container { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.qr-protocolo { font-family: monospace; font-size: 16px; font-weight: 700; }
.qr-sub { font-size: 13px; color: #6B7280; }
```

- [ ] **Remover do `src/styles.css` qualquer classe órfã** referente ao sistema antigo (ex: `.hub-badge`, `.lab-card`, `.rls-bar`). Fazer `grep` para confirmar que não há referências nos novos componentes:

```bash
grep -r "hub-badge\|lab-card\|rls-bar" src/
```

Se retornar vazio, as classes não são usadas e podem ser removidas do CSS.

- [ ] **Verificar no browser com `npm run dev`:** Toda a aplicação visual está consistente — sidebar verde-escura, cards de stats no Dashboard, tabelas com linhas de alerta em laranja.

- [ ] **Commit:**

```bash
git add src/styles.css
git commit -m "feat: estilos CSS para o sistema LAPMOL"
```

---

## Task 13: Verificação Final e Seed do Banco

- [ ] **Derrubar qualquer banco antigo e re-inicializar:**

```bash
rm -f data/laboratorio.sqlite data/laboratorio.sqlite-shm data/laboratorio.sqlite-wal
npm run db:init
```

- [ ] **Rodar o sistema completo:**

```bash
npm run dev
```

- [ ] **Checklist de verificação no browser (`http://127.0.0.1:5173`):**

  - [ ] Tela de login mostra 3 usuários (professor, coordenador, aluno)
  - [ ] Login como **aluno** → menu não exibe "Usuários" nem "Auditoria"
  - [ ] Login como **professor** → menu exibe todos os módulos
  - [ ] Dashboard mostra 2 amostras pendentes e 2 itens de estoque crítico
  - [ ] Amostras → listagem com 3 registros do seed
  - [ ] Amostras → busca por "LAPMOL-20260414" filtra para 1 resultado
  - [ ] Amostras → clicar QR em qualquer amostra mostra modal com QR Code
  - [ ] Amostras → criar nova amostra → aparece na lista com protocolo gerado automaticamente
  - [ ] Laudos → LAPMOL-20260414-001 já tem laudo; clicar "Editar laudo" mostra o texto preexistente
  - [ ] Laudos → como professor, clicar "Liberar" muda status para "laudo_liberado"
  - [ ] Laudos → clicar "Imprimir" abre janela do browser com laudo formatado
  - [ ] Solicitantes, Tutores, Pacientes → CRUD funcionando
  - [ ] Estoque → formalina e luvas com linha em laranja (crítico)
  - [ ] Usuários → só visível como professor; cria novo usuário
  - [ ] Auditoria → log de ações registradas aparece cronologicamente

- [ ] **Commit final:**

```bash
git add -A
git commit -m "chore: verificação final — sistema LAPMOL operacional"
```

---

## Resumo de Commits Esperados

1. `feat: novo schema SQL focado no LAPMOL`
2. `feat: seed data e normalização para o LAPMOL`
3. `feat: server/database.js reescrito para entidades LAPMOL`
4. `feat: componentes Nav, Modal e StatusBadge`
5. `feat: App.jsx refatorado como roteador fino, stubs de páginas criados`
6. `feat: página Dashboard com pendências e estoque crítico`
7. `feat: página Amostras com CRUD, busca e etiqueta QR`
8. `feat: página Laudos com editor, liberação e impressão`
9. `feat: páginas CRUD de Solicitantes, Tutores e Pacientes`
10. `feat: página Estoque com alertas de quantidade mínima`
11. `feat: páginas Usuários e Auditoria`
12. `feat: estilos CSS para o sistema LAPMOL`
13. `chore: verificação final — sistema LAPMOL operacional`
