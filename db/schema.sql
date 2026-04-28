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
  peso TEXT NOT NULL DEFAULT '',
  tutor_id TEXT REFERENCES tutores(id) ON DELETE SET NULL,
  criado_em TEXT,
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS amostras (
  id TEXT PRIMARY KEY,
  protocolo TEXT NOT NULL UNIQUE,
  rc TEXT NOT NULL DEFAULT '',
  paciente_id TEXT REFERENCES pacientes(id) ON DELETE SET NULL,
  solicitante_id TEXT REFERENCES solicitantes(id) ON DELETE SET NULL,
  tipo_exame TEXT NOT NULL DEFAULT 'citologico',
  material TEXT NOT NULL DEFAULT '',
  tecnica_coleta TEXT NOT NULL DEFAULT '',
  coloracao TEXT NOT NULL DEFAULT '',
  responsavel_coleta TEXT NOT NULL DEFAULT '',
  historico TEXT NOT NULL DEFAULT '',
  condicao TEXT NOT NULL DEFAULT 'adequada',
  prioridade TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'recebida',
  data_coleta TEXT NOT NULL DEFAULT '',
  data_recebimento TEXT NOT NULL DEFAULT '',
  data_entrada TEXT NOT NULL DEFAULT '',
  data_resultado TEXT NOT NULL DEFAULT '',
  data_entregue TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  caracteristicas_lesao TEXT NOT NULL DEFAULT '[]',
  localizacao_lesao TEXT NOT NULL DEFAULT '[]',
  neoplasia TEXT NOT NULL DEFAULT '{}',
  terapia_recente TEXT NOT NULL DEFAULT '',
  enfermidades_intercorrentes TEXT NOT NULL DEFAULT '',
  suspeita_clinica TEXT NOT NULL DEFAULT '',
  animal_castrado INTEGER NOT NULL DEFAULT 0,
  intencao_castracao TEXT NOT NULL DEFAULT '',
  criado_em TEXT,
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS laudos (
  id TEXT PRIMARY KEY,
  amostra_id TEXT NOT NULL UNIQUE REFERENCES amostras(id) ON DELETE CASCADE,
  material_enviado TEXT NOT NULL DEFAULT '',
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
  convenio TEXT NOT NULL DEFAULT '',
  criado_em TEXT,
  atualizado_em TEXT
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

CREATE INDEX IF NOT EXISTS idx_amostras_rc ON amostras(rc);
CREATE INDEX IF NOT EXISTS idx_amostras_protocolo ON amostras(protocolo);
CREATE INDEX IF NOT EXISTS idx_amostras_status ON amostras(status);
CREATE INDEX IF NOT EXISTS idx_amostras_recebimento ON amostras(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_pacientes_tutor ON pacientes(tutor_id);
