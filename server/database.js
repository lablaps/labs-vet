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
  rows.forEach((r) => {
    if (!r.amostraId) throw new Error(`insertLaudos: amostraId obrigatório (laudo id=${r.id})`);
    s.run(r.id, r.amostraId, r.macro, r.micro, r.diagnostico, r.comentarios, r.responsavel, r.liberadoPor, r.liberadoEm, r.criadoEm || null, r.atualizadoEm || null);
  });
}

function insertFinanceiro(db, rows) {
  const s = db.prepare(`INSERT INTO financeiro (id, amostra_id, preco_centavos, forma_pagamento, status_pagamento, convenio, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  rows.forEach((r) => {
    if (!r.amostraId) throw new Error(`insertFinanceiro: amostraId obrigatório (financeiro id=${r.id})`);
    s.run(r.id, r.amostraId, r.precoCentavos ?? null, r.formaPagamento, r.statusPagamento, r.convenio, r.criadoEm || null, r.atualizadoEm || null);
  });
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
  return { id: r.id, nome: r.nome, especie: r.especie || "", raca: r.raca || "", idade: r.idade || "", sexo: r.sexo || "", pelagem: r.pelagem || "", tutorId: r.tutor_id || null, criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapAmostra(r) {
  return { id: r.id, protocolo: r.protocolo, pacienteId: r.paciente_id || null, solicitanteId: r.solicitante_id || null, tipoExame: r.tipo_exame || "", material: r.material || "", condicao: r.condicao || "adequada", prioridade: r.prioridade || "normal", status: r.status || "recebida", dataColeta: r.data_coleta || "", dataRecebimento: r.data_recebimento || "", observacoes: r.observacoes || "", criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapLaudo(r) {
  return { id: r.id, amostraId: r.amostra_id, macro: r.macro || "", micro: r.micro || "", diagnostico: r.diagnostico || "", comentarios: r.comentarios || "", responsavel: r.responsavel || "", liberadoPor: r.liberado_por || "", liberadoEm: r.liberado_em || "", criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
}

function mapFinanceiro(r) {
  return { id: r.id, amostraId: r.amostra_id, precoCentavos: r.preco_centavos ?? null, formaPagamento: r.forma_pagamento || "", statusPagamento: r.status_pagamento || "aberto", convenio: r.convenio || "", criadoEm: r.criado_em, atualizadoEm: r.atualizado_em };
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
