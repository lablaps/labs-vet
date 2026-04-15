PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS labs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  coordinator TEXT,
  local TEXT,
  description TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  color TEXT NOT NULL DEFAULT '#285A43',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS tutors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS veterinarians (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  crmv TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  species TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT,
  breed TEXT,
  age TEXT,
  sex TEXT,
  coat TEXT,
  weight TEXT,
  tutor_id TEXT REFERENCES tutors(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS patient_labs (
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  lab_id TEXT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (patient_id, lab_id)
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  protocol TEXT NOT NULL UNIQUE,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  veterinarian_id TEXT REFERENCES veterinarians(id) ON DELETE SET NULL,
  lab_id TEXT REFERENCES labs(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  requested_by TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  priority TEXT NOT NULL DEFAULT 'normal',
  collected_at TEXT,
  received_at TEXT,
  material TEXT,
  sample_condition TEXT,
  macro_description TEXT,
  micro_description TEXT,
  diagnosis TEXT,
  comments TEXT,
  responsible_doctor TEXT,
  released_at TEXT,
  price_cents INTEGER,
  payment_method TEXT,
  payment_status TEXT,
  agreement TEXT,
  result TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  lab_id TEXT REFERENCES labs(id) ON DELETE SET NULL,
  type TEXT,
  vet TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  lab_id TEXT REFERENCES labs(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  min_qty INTEGER NOT NULL DEFAULT 0,
  max_qty INTEGER NOT NULL DEFAULT 0,
  expiry TEXT,
  restricted INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  lab_id TEXT REFERENCES labs(id) ON DELETE SET NULL,
  veterinarian_id TEXT REFERENCES veterinarians(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('patient', 'exam')),
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  size INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT,
  data_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS requisitions (
  id TEXT PRIMARY KEY,
  requester_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  lab_id TEXT REFERENCES labs(id) ON DELETE SET NULL,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  exam_id TEXT REFERENCES exams(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  due_at TEXT,
  description TEXT,
  response TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  entity TEXT,
  action TEXT NOT NULL,
  actor TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exams_protocol ON exams(protocol);
CREATE INDEX IF NOT EXISTS idx_exams_received_at ON exams(received_at);
CREATE INDEX IF NOT EXISTS idx_exams_patient ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_tutor ON patients(tutor_id);
CREATE INDEX IF NOT EXISTS idx_patient_labs_pair ON patient_labs(patient_id, lab_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_lab ON requisitions(lab_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
