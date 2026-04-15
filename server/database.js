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
    migrateDatabase(database);
  }

  const { total } = database.prepare("SELECT COUNT(*) AS total FROM labs").get();
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
  const attachments = groupAttachments(
    db.prepare("SELECT * FROM attachments ORDER BY sort_order, uploaded_at DESC, id").all(),
  );
  const patientLabs = groupPatientLabs(
    db.prepare("SELECT * FROM patient_labs ORDER BY sort_order, lab_id").all(),
  );

  return normalizeDataset({
    labs: db.prepare("SELECT * FROM labs ORDER BY sort_order, name").all().map(mapLab),
    tutors: db.prepare("SELECT * FROM tutors ORDER BY sort_order, name").all().map(mapTutor),
    veterinarians: db
      .prepare("SELECT * FROM veterinarians ORDER BY sort_order, name")
      .all()
      .map(mapVeterinarian),
    patients: db
      .prepare("SELECT * FROM patients ORDER BY sort_order, name")
      .all()
      .map((row) => mapPatient(row, patientLabs, attachments)),
    exams: db
      .prepare("SELECT * FROM exams ORDER BY sort_order, received_at DESC, protocol")
      .all()
      .map((row) => mapExam(row, attachments)),
    appointments: db
      .prepare("SELECT * FROM appointments ORDER BY sort_order, date, time")
      .all()
      .map(mapAppointment),
    inventory: db.prepare("SELECT * FROM inventory ORDER BY sort_order, name").all().map(mapInventory),
    users: db.prepare("SELECT * FROM users ORDER BY sort_order, name").all().map(mapUser),
    requisitions: db
      .prepare("SELECT * FROM requisitions ORDER BY sort_order, due_at, id")
      .all()
      .map(mapRequisition),
    auditEvents: db.prepare("SELECT * FROM audit_events ORDER BY sort_order, at DESC").all().map(mapAuditEvent),
  });
}

export function writeData(input, { skipSeed = false } = {}) {
  const db = initializeDatabase({ skipSeed });
  const data = normalizeDataset(input);

  db.exec("BEGIN IMMEDIATE");
  try {
    clearTables(db);
    insertLabs(db, data.labs);
    insertTutors(db, data.tutors);
    insertVeterinarians(db, data.veterinarians);
    insertPatients(db, data.patients);
    insertPatientLabs(db, data.patients);
    insertExams(db, data.exams);
    insertAppointments(db, data.appointments);
    insertInventory(db, data.inventory);
    insertUsers(db, data.users);
    insertRequisitions(db, data.requisitions);
    insertAttachments(db, data);
    insertAuditEvents(db, data.auditEvents);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return readData();
}

function clearTables(db) {
  [
    "attachments",
    "patient_labs",
    "requisitions",
    "appointments",
    "inventory",
    "exams",
    "patients",
    "veterinarians",
    "tutors",
    "users",
    "labs",
    "audit_events",
  ].forEach((table) => db.exec(`DELETE FROM ${table}`));
}

function migrateDatabase(db) {
  addColumnIfMissing(db, "users", "veterinarian_id", "TEXT REFERENCES veterinarians(id) ON DELETE SET NULL");
}

function addColumnIfMissing(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((item) => item.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function insertLabs(db, labs) {
  const statement = db.prepare(`
    INSERT INTO labs (id, name, short, coordinator, local, description, stock, status, color, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  labs.forEach((lab, index) =>
    statement.run(
      lab.id,
      lab.name,
      lab.short,
      lab.coordinator || "",
      lab.local || "",
      lab.desc || "",
      Number(lab.stock || 0),
      lab.status || "active",
      lab.color || "#285A43",
      index,
      lab.createdAt || null,
      lab.updatedAt || null,
    ),
  );
}

function insertTutors(db, tutors) {
  const statement = db.prepare(`
    INSERT INTO tutors (id, name, document, phone, email, city, address, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  tutors.forEach((tutor, index) =>
    statement.run(
      tutor.id,
      tutor.name,
      tutor.document || "",
      tutor.phone || "",
      tutor.email || "",
      tutor.city || "",
      tutor.address || "",
      index,
      tutor.createdAt || null,
      tutor.updatedAt || null,
    ),
  );
}

function insertVeterinarians(db, veterinarians) {
  const statement = db.prepare(`
    INSERT INTO veterinarians (id, name, crmv, phone, email, address, species, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  veterinarians.forEach((vet, index) =>
    statement.run(
      vet.id,
      vet.name,
      vet.crmv || "",
      vet.phone || "",
      vet.email || "",
      vet.address || "",
      vet.species || "",
      index,
      vet.createdAt || null,
      vet.updatedAt || null,
    ),
  );
}

function insertPatients(db, patients) {
  const statement = db.prepare(`
    INSERT INTO patients (id, name, species, breed, age, sex, coat, weight, tutor_id, status, notes, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  patients.forEach((patient, index) =>
    statement.run(
      patient.id,
      patient.name,
      patient.species || "",
      patient.breed || "",
      patient.age || "",
      patient.sex || "",
      patient.coat || "",
      patient.weight || "",
      patient.tutorId || null,
      patient.status || "waiting",
      patient.notes || "",
      index,
      patient.createdAt || null,
      patient.updatedAt || null,
    ),
  );
}

function insertPatientLabs(db, patients) {
  const statement = db.prepare("INSERT INTO patient_labs (patient_id, lab_id, sort_order) VALUES (?, ?, ?)");
  patients.forEach((patient) => {
    (patient.labs || []).forEach((labId, index) => {
      statement.run(patient.id, labId, index);
    });
  });
}

function insertExams(db, exams) {
  const statement = db.prepare(`
    INSERT INTO exams (
      id, protocol, patient_id, veterinarian_id, lab_id, type, requested_by, status, priority,
      collected_at, received_at, material, sample_condition, macro_description, micro_description,
      diagnosis, comments, responsible_doctor, released_at, price_cents, payment_method, payment_status,
      agreement, result, sort_order, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  exams.forEach((exam, index) =>
    statement.run(
      exam.id,
      exam.protocol,
      exam.patientId || null,
      exam.veterinarianId || null,
      exam.labId || null,
      exam.type,
      exam.requestedBy || "",
      exam.status || "requested",
      exam.priority || "normal",
      exam.collectedAt || "",
      exam.receivedAt || "",
      exam.material || "",
      exam.sampleCondition || "",
      exam.macroDescription || "",
      exam.microDescription || "",
      exam.diagnosis || "",
      exam.comments || "",
      exam.responsibleDoctor || "",
      exam.releasedAt || "",
      toCents(exam.price),
      exam.paymentMethod || "",
      exam.paymentStatus || "open",
      exam.agreement || "",
      exam.result || "",
      index,
      exam.createdAt || null,
      exam.updatedAt || null,
    ),
  );
}

function insertAppointments(db, appointments) {
  const statement = db.prepare(`
    INSERT INTO appointments (id, date, time, patient_id, lab_id, type, vet, status, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  appointments.forEach((appointment, index) =>
    statement.run(
      appointment.id,
      appointment.date,
      appointment.time,
      appointment.patientId || null,
      appointment.labId || null,
      appointment.type || "",
      appointment.vet || "",
      appointment.status || "pending",
      index,
      appointment.createdAt || null,
      appointment.updatedAt || null,
    ),
  );
}

function insertInventory(db, inventory) {
  const statement = db.prepare(`
    INSERT INTO inventory (id, name, category, lab_id, qty, min_qty, max_qty, expiry, restricted, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  inventory.forEach((item, index) =>
    statement.run(
      item.id,
      item.name,
      item.category || "",
      item.labId || null,
      Number(item.qty || 0),
      Number(item.min || 0),
      Number(item.max || 0),
      item.expiry || "",
      item.restricted ? 1 : 0,
      index,
      item.createdAt || null,
      item.updatedAt || null,
    ),
  );
}

function insertUsers(db, users) {
  const statement = db.prepare(`
    INSERT INTO users (id, name, email, role, lab_id, veterinarian_id, status, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  users.forEach((user, index) =>
    statement.run(
      user.id,
      user.name,
      user.email,
      user.role || "",
      user.labId || null,
      user.veterinarianId || null,
      user.status || "active",
      index,
      user.createdAt || null,
      user.updatedAt || null,
    ),
  );
}

function insertRequisitions(db, requisitions) {
  const statement = db.prepare(`
    INSERT INTO requisitions (
      id, requester_user_id, lab_id, patient_id, exam_id, type, priority, status,
      due_at, description, response, sort_order, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  requisitions.forEach((request, index) =>
    statement.run(
      request.id,
      request.requesterUserId || null,
      request.labId || null,
      request.patientId || null,
      request.examId || null,
      request.type,
      request.priority || "normal",
      request.status || "open",
      request.dueAt || "",
      request.description || "",
      request.response || "",
      index,
      request.createdAt || null,
      request.updatedAt || null,
    ),
  );
}

function insertAttachments(db, data) {
  const statement = db.prepare(`
    INSERT INTO attachments (id, entity_type, entity_id, name, type, size, uploaded_at, data_url, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  data.patients.forEach((patient) => {
    (patient.attachments || []).forEach((file, index) =>
      statement.run(
        file.id,
        "patient",
        patient.id,
        file.name,
        file.type || "",
        Number(file.size || 0),
        file.uploadedAt || null,
        file.dataUrl || "",
        index,
      ),
    );
  });

  data.exams.forEach((exam) => {
    (exam.attachments || []).forEach((file, index) =>
      statement.run(
        file.id,
        "exam",
        exam.id,
        file.name,
        file.type || "",
        Number(file.size || 0),
        file.uploadedAt || null,
        file.dataUrl || "",
        index,
      ),
    );
  });
}

function insertAuditEvents(db, events) {
  const statement = db.prepare(`
    INSERT INTO audit_events (id, at, entity, action, actor, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  events.forEach((event, index) =>
    statement.run(event.id, event.at, event.entity || "", event.action, event.actor || "", index),
  );
}

function mapLab(row) {
  return {
    id: row.id,
    name: row.name,
    short: row.short,
    coordinator: row.coordinator || "",
    local: row.local || "",
    desc: row.description || "",
    stock: Number(row.stock || 0),
    status: row.status || "active",
    color: row.color || "#285A43",
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapTutor(row) {
  return {
    id: row.id,
    name: row.name,
    document: row.document || "",
    phone: row.phone || "",
    email: row.email || "",
    city: row.city || "",
    address: row.address || "",
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapVeterinarian(row) {
  return {
    id: row.id,
    name: row.name,
    crmv: row.crmv || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    species: row.species || "",
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapPatient(row, patientLabs, attachments) {
  return {
    id: row.id,
    name: row.name,
    species: row.species || "",
    breed: row.breed || "",
    age: row.age || "",
    sex: row.sex || "",
    coat: row.coat || "",
    weight: row.weight || "",
    tutorId: row.tutor_id || "",
    labs: patientLabs.get(row.id) || [],
    status: row.status || "waiting",
    notes: row.notes || "",
    attachments: attachments.get(`patient:${row.id}`) || [],
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapExam(row, attachments) {
  return {
    id: row.id,
    protocol: row.protocol,
    patientId: row.patient_id || "",
    veterinarianId: row.veterinarian_id || "",
    labId: row.lab_id || "",
    type: row.type,
    requestedBy: row.requested_by || "",
    status: row.status || "requested",
    priority: row.priority || "normal",
    collectedAt: row.collected_at || "",
    receivedAt: row.received_at || "",
    material: row.material || "",
    sampleCondition: row.sample_condition || "",
    macroDescription: row.macro_description || "",
    microDescription: row.micro_description || "",
    diagnosis: row.diagnosis || "",
    comments: row.comments || "",
    responsibleDoctor: row.responsible_doctor || "",
    releasedAt: row.released_at || "",
    price: fromCents(row.price_cents),
    paymentMethod: row.payment_method || "",
    paymentStatus: row.payment_status || "open",
    agreement: row.agreement || "",
    result: row.result || "",
    attachments: attachments.get(`exam:${row.id}`) || [],
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapAppointment(row) {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    patientId: row.patient_id || "",
    labId: row.lab_id || "",
    type: row.type || "",
    vet: row.vet || "",
    status: row.status || "pending",
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapInventory(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || "",
    labId: row.lab_id || "",
    qty: Number(row.qty || 0),
    min: Number(row.min_qty || 0),
    max: Number(row.max_qty || 0),
    expiry: row.expiry || "",
    restricted: Boolean(row.restricted),
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || "",
    labId: row.lab_id || "",
    veterinarianId: row.veterinarian_id || "",
    status: row.status || "active",
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapRequisition(row) {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id || "",
    labId: row.lab_id || "",
    patientId: row.patient_id || "",
    examId: row.exam_id || "",
    type: row.type,
    priority: row.priority || "normal",
    status: row.status || "open",
    dueAt: row.due_at || "",
    description: row.description || "",
    response: row.response || "",
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapAuditEvent(row) {
  return {
    id: row.id,
    at: row.at,
    action: row.action,
    entity: row.entity || "",
    actor: row.actor || "",
  };
}

function groupAttachments(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = `${row.entity_type}:${row.entity_id}`;
    const files = map.get(key) || [];
    files.push({
      id: row.id,
      name: row.name,
      type: row.type || "",
      size: Number(row.size || 0),
      uploadedAt: row.uploaded_at || "",
      dataUrl: row.data_url || "",
    });
    map.set(key, files);
  });
  return map;
}

function groupPatientLabs(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const labs = map.get(row.patient_id) || [];
    labs.push(row.lab_id);
    map.set(row.patient_id, labs);
  });
  return map;
}

function toCents(value) {
  if (value === "" || value === null || value === undefined) return null;
  return Math.round(Number(value || 0) * 100);
}

function fromCents(value) {
  if (value === null || value === undefined) return "";
  return Number(value) / 100;
}
