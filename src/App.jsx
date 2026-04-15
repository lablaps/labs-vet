import { useMemo, useState } from "react";
import { moduleLabels, seedData, statusLabels, STORAGE_KEY } from "./data";
import { usePersistentState } from "./storage";

const navItems = [
  { id: "dashboard", label: "Hub", section: "Operação" },
  { id: "patients", label: "Pacientes", section: "Cadastros" },
  { id: "tutors", label: "Tutores", section: "Cadastros" },
  { id: "exams", label: "Exames", section: "Rotina" },
  { id: "appointments", label: "Agenda", section: "Rotina" },
  { id: "inventory", label: "Estoque", section: "Rotina" },
  { id: "labs", label: "Laboratórios", section: "Administração" },
  { id: "users", label: "Usuários", section: "Administração" },
  { id: "reports", label: "Relatórios", section: "Gestão" },
  { id: "audit", label: "Auditoria", section: "Gestão" },
];

const todayISO = () => new Date().toLocaleDateString("sv-SE");
const cloneSeed = () => JSON.parse(JSON.stringify(seedData));
const demoCredentials = {
  email: "ewaldo.santana@uema.br",
  password: "petcore@2026",
};
const maxStoredFileSize = 2 * 1024 * 1024;
const labRoute = (labId) => `lab:${labId}`;
const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function App() {
  const [data, setData] = usePersistentState(STORAGE_KEY, cloneSeed());
  const [screen, setScreen] = useState("login");
  const [active, setActive] = useState("dashboard");

  const context = useMemo(() => makeContext(data), [data]);
  const stats = useMemo(() => makeStats(data), [data]);
  const configs = useMemo(() => makeConfigs(data, context), [data, context]);

  function withAudit(next, entity, action) {
    const auditEvent = {
      id: makeId("aud"),
      at: new Date().toISOString(),
      entity,
      action,
      actor: "Prof. Dr. Ewaldo Santana",
    };

    return {
      ...next,
      auditEvents: [auditEvent, ...(next.auditEvents || [])].slice(0, 80),
    };
  }

  function saveRecord(config, values, editingRecord) {
    setData((current) => {
      const normalized = normalizeValues(config.fields, values);
      const label = normalized.name || normalized.type || normalized.email || normalized.date || "registro";
      const record = editingRecord
        ? { ...editingRecord, ...normalized, updatedAt: new Date().toISOString() }
        : {
            id: makeId(config.prefix),
            ...normalized,
            createdAt: new Date().toISOString(),
          };

      const list = editingRecord
        ? current[config.key].map((item) => (item.id === editingRecord.id ? record : item))
        : [record, ...current[config.key]];

      return withAudit(
        { ...current, [config.key]: list },
        config.title,
        `${editingRecord ? "Atualizou" : "Cadastrou"} ${config.single.toLowerCase()}: ${label}`,
      );
    });
  }

  function deleteRecord(config, record) {
    setData((current) =>
      withAudit(
        {
          ...current,
          [config.key]: current[config.key].filter((item) => item.id !== record.id),
        },
        config.title,
        `Removeu ${config.single.toLowerCase()}: ${config.titleOf(record, context)}`,
      ),
    );
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `petcore-${todayISO()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resetDemo() {
    setData(withAudit(cloneSeed(), "Sistema", "Restaurou a base demonstrativa do PetCore"));
    setActive("dashboard");
  }

  if (screen === "login") {
    return <LoginScreen onLogin={() => setScreen("app")} />;
  }

  const currentConfig = configs[active];
  const currentLabId = active.startsWith("lab:") ? active.slice(4) : "";
  const currentLab = data.labs.find((item) => item.id === currentLabId);

  return (
    <Shell
      active={active}
      onNavigate={setActive}
      labs={data.labs}
      stats={stats}
      onExport={exportJSON}
      onReset={resetDemo}
    >
      {active === "dashboard" && (
        <Dashboard data={data} context={context} stats={stats} onNavigate={setActive} />
      )}

      {currentConfig && (
        <CrudModule
          config={currentConfig}
          records={data[currentConfig.key]}
          context={context}
          onSave={saveRecord}
          onDelete={deleteRecord}
          onOpenLab={(labId) => setActive(labRoute(labId))}
        />
      )}

      {currentLab && (
        <LabView lab={currentLab} data={data} context={context} onNavigate={setActive} />
      )}

      {active === "reports" && <Reports data={data} context={context} stats={stats} />}
      {active === "audit" && <Audit events={data.auditEvents} />}
    </Shell>
  );
}

function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);

  function enter(event) {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(onLogin, 420);
  }

  return (
    <main className="login-screen">
      <section className="login-copy">
        <p className="eyebrow">Sistema clínico veterinário</p>
        <h1>PetCore</h1>
        <p className="login-text">
          Cadastros, agenda, exames, estoque e auditoria em uma operação única para o
          laboratório veterinário.
        </p>

        <form className="login-form" onSubmit={enter}>
          <label>
            E-mail institucional
            <input defaultValue={demoCredentials.email} type="email" required />
          </label>
          <label>
            Senha
            <input defaultValue={demoCredentials.password} type="password" required />
          </label>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? "Entrando..." : "Entrar no sistema"}
          </button>
        </form>
        <div className="credential-box">
          <span>Acesso de demonstração</span>
          <strong>Usuário: {demoCredentials.email}</strong>
          <strong>Senha: {demoCredentials.password}</strong>
        </div>
      </section>
      <section className="login-visual" aria-label="Rotina veterinária">
        <div>
          <span>Hoje</span>
          <strong>12 atendimentos</strong>
          <small>4 laudos pendentes de assinatura</small>
        </div>
      </section>
    </main>
  );
}

function Shell({ active, onNavigate, labs, stats, onExport, onReset, children }) {
  const grouped = navItems.reduce((acc, item) => {
    acc[item.section] = acc[item.section] || [];
    acc[item.section].push(item);
    return acc;
  }, {});
  const currentLab = labs.find((lab) => active === labRoute(lab.id));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">PET</span>
          <div>
            <strong>PetCore</strong>
          </div>
        </div>

        <nav className="nav-groups" aria-label="Navegação principal">
          {Object.entries(grouped).map(([section, items]) => (
            <div className="nav-group" key={section}>
              <p>{section}</p>
              {items.map((item) => (
                <button
                  key={item.id}
                  className={active === item.id ? "active" : ""}
                  onClick={() => onNavigate(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="nav-group lab-shortcuts">
          <p>Views dos laboratórios</p>
          {labs.map((lab) => (
            <button
              key={lab.id}
              className={active === labRoute(lab.id) ? "active" : ""}
              onClick={() => onNavigate(labRoute(lab.id))}
              type="button"
            >
              <span style={{ background: lab.color }} />
              {lab.short}
            </button>
          ))}
        </div>

        <div className="sidebar-status">
          <span>Base local</span>
          <strong>{stats.totalRecords} registros</strong>
          <small>Dados salvos no navegador</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              PetCore / {currentLab ? currentLab.short : labelForActive(active)}
            </span>
            <h2>{currentLab ? currentLab.name : titleForActive(active)}</h2>
          </div>
          <div className="topbar-actions">
            <button className="btn secondary" onClick={onExport} type="button">
              Exportar JSON
            </button>
            <button className="btn ghost" onClick={onReset} type="button">
              Restaurar demo
            </button>
            <div className="user-chip">
              <span>ES</span>
              <div>
                <strong>Prof. Ewaldo Santana</strong>
                <small>Gestor Hub</small>
              </div>
            </div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

function Dashboard({ data, context, stats, onNavigate }) {
  const today = todayISO();
  const todaysAppointments = data.appointments
    .filter((appointment) => appointment.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  const criticalStock = data.inventory.filter((item) => Number(item.qty) <= Number(item.min));
  const pendingExams = data.exams.filter((exam) =>
    ["requested", "processing", "ready"].includes(exam.status),
  );

  return (
    <div className="stack">
      <section className="hero-surface">
        <div>
          <p className="eyebrow">Operação integrada</p>
          <h1>Hub clínico com cadastro, fila, exame e estoque no mesmo fluxo.</h1>
          <p>
            O PetCore organiza laboratório, prontuário, laudo, agenda, estoque e anexos
            em um fluxo único para a rotina clínica.
          </p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => onNavigate("patients")} type="button">
              Cadastrar paciente
            </button>
            <button className="btn secondary" onClick={() => onNavigate("exams")} type="button">
              Abrir exames
            </button>
          </div>
        </div>
        <div className="hero-grid">
          <Metric value={stats.patients} label="Pacientes" />
          <Metric value={stats.openExams} label="Exames abertos" tone="amber" />
          <Metric value={stats.todayAppointments} label="Agenda hoje" tone="teal" />
          <Metric value={stats.criticalStock} label="Estoque crítico" tone="red" />
        </div>
      </section>

      <section className="dashboard-grid">
        <Panel title="Laboratórios" action={<button onClick={() => onNavigate("labs")}>Gerir</button>}>
          <div className="lab-list">
            {data.labs.map((lab) => (
              <button
                className="lab-row"
                key={lab.id}
                onClick={() => onNavigate(labRoute(lab.id))}
                type="button"
              >
                <span style={{ background: lab.color }} />
                <div>
                  <strong>{lab.name}</strong>
                  <small>{lab.coordinator}</small>
                </div>
                <b>{lab.stock}%</b>
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title="Agenda de hoje"
          action={<button onClick={() => onNavigate("appointments")}>Nova agenda</button>}
        >
          <div className="timeline">
            {todaysAppointments.length === 0 && <EmptyState text="Nenhum agendamento para hoje." />}
            {todaysAppointments.map((appointment) => (
              <div className="timeline-row" key={appointment.id}>
                <span>{appointment.time}</span>
                <div>
                  <strong>{context.patientName(appointment.patientId)}</strong>
                  <small>
                    {appointment.type} - {context.labName(appointment.labId)}
                  </small>
                </div>
                <Badge value={appointment.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Exames em andamento" action={<button onClick={() => onNavigate("exams")}>Abrir</button>}>
          <div className="compact-list">
            {pendingExams.slice(0, 5).map((exam) => (
              <div className="compact-row" key={exam.id}>
                <div>
                  <strong>{exam.type}</strong>
                  <small>
                    {context.patientName(exam.patientId)} - {context.labName(exam.labId)}
                  </small>
                </div>
                <Badge value={exam.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Estoque crítico" action={<button onClick={() => onNavigate("inventory")}>Regularizar</button>}>
          <div className="compact-list">
            {criticalStock.length === 0 && <EmptyState text="Nenhum item abaixo do mínimo." />}
            {criticalStock.map((item) => (
              <div className="compact-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {context.labName(item.labId)} - mínimo {item.min}
                  </small>
                </div>
                <b className="danger-text">{item.qty}</b>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function LabView({ lab, data, context, onNavigate }) {
  const patients = data.patients.filter((patient) => patient.labs.includes(lab.id));
  const exams = data.exams.filter((exam) => exam.labId === lab.id);
  const appointments = data.appointments
    .filter((appointment) => appointment.labId === lab.id)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const inventory = data.inventory.filter((item) => item.labId === lab.id);
  const criticalStock = inventory.filter((item) => Number(item.qty) <= Number(item.min));
  const attachments = [
    ...patients.flatMap((patient) =>
      (patient.attachments || []).map((file) => ({
        ...file,
        source: patient.name,
        kind: "Paciente",
      })),
    ),
    ...exams.flatMap((exam) =>
      (exam.attachments || []).map((file) => ({
        ...file,
        source: `${exam.type} - ${context.patientName(exam.patientId)}`,
        kind: "Exame",
      })),
    ),
  ];

  return (
    <div className="stack">
      <section className="lab-hero" style={{ borderColor: `${lab.color}55` }}>
        <div>
          <button className="text-button" onClick={() => onNavigate("dashboard")} type="button">
            Voltar ao hub
          </button>
          <p className="eyebrow">{lab.short}</p>
          <h1>{lab.name}</h1>
          <p>{lab.desc}</p>
          <div className="lab-meta">
            <span>{lab.coordinator}</span>
            <span>{lab.local}</span>
            <Badge value={lab.status} />
          </div>
        </div>
        <div className="hero-grid">
          <Metric value={patients.length} label="Pacientes" />
          <Metric value={exams.length} label="Exames" tone="teal" />
          <Metric value={appointments.length} label="Agenda" tone="amber" />
          <Metric value={criticalStock.length} label="Estoque crítico" tone="red" />
        </div>
      </section>

      <section className="lab-detail-grid">
        <Panel title="Pacientes vinculados" action={<button onClick={() => onNavigate("patients")}>Cadastrar</button>}>
          <div className="compact-list">
            {patients.length === 0 && <EmptyState text="Nenhum paciente vinculado." />}
            {patients.map((patient) => (
              <div className="compact-row" key={patient.id}>
                <div>
                  <strong>{patient.name}</strong>
                  <small>
                    {patient.species} - {context.tutorName(patient.tutorId)}
                  </small>
                </div>
                <Badge value={patient.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Exames do laboratório" action={<button onClick={() => onNavigate("exams")}>Solicitar</button>}>
          <div className="compact-list">
            {exams.length === 0 && <EmptyState text="Nenhum exame neste laboratório." />}
            {exams.map((exam) => (
              <div className="compact-row" key={exam.id}>
                <div>
                  <strong>{exam.type}</strong>
                  <small>
                    {context.patientName(exam.patientId)} - {formatDate(exam.collectedAt)}
                  </small>
                </div>
                <Badge value={exam.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Agenda do setor" action={<button onClick={() => onNavigate("appointments")}>Agendar</button>}>
          <div className="timeline">
            {appointments.length === 0 && <EmptyState text="Nenhum agendamento." />}
            {appointments.slice(0, 6).map((appointment) => (
              <div className="timeline-row" key={appointment.id}>
                <span>{appointment.time}</span>
                <div>
                  <strong>{formatDate(appointment.date)}</strong>
                  <small>
                    {context.patientName(appointment.patientId)} - {appointment.type}
                  </small>
                </div>
                <Badge value={appointment.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Estoque do laboratório" action={<button onClick={() => onNavigate("inventory")}>Estoque</button>}>
          <div className="compact-list">
            {inventory.length === 0 && <EmptyState text="Nenhum item cadastrado." />}
            {inventory.map((item) => (
              <div className="compact-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.category} - validade {formatDate(item.expiry)}
                  </small>
                </div>
                <b className={Number(item.qty) <= Number(item.min) ? "danger-text" : ""}>
                  {item.qty}/{item.max}
                </b>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Arquivos do laboratório" action={<button onClick={() => onNavigate("exams")}>Inserir arquivo</button>}>
        <AttachmentGallery files={attachments} />
      </Panel>
    </div>
  );
}

function CrudModule({ config, records, context, onSave, onDelete, onOpenLab }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((record) => {
      const text = `${config.searchText(record, context)} ${config.titleOf(record, context)}`.toLowerCase();
      const matchesSearch = !q || text.includes(q);
      const matchesFilter = filter === "all" || !config.filterBy || config.filterBy(record, filter, context);
      return matchesSearch && matchesFilter;
    });
  }, [records, search, filter, config, context]);

  return (
    <div className="stack">
      <section className="module-head">
        <div>
          <p className="eyebrow">Cadastro E2E</p>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <button className="btn primary" onClick={() => setModal({ mode: "create" })} type="button">
          {config.action}
        </button>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={config.searchPlaceholder}
        />
        {config.filters?.length > 0 && (
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Todos</option>
            {config.filters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        <span>{filtered.length} registro(s)</span>
      </section>

      <section className="data-surface">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {config.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  {config.columns.map((column) => (
                    <td key={column.key}>{column.render(record, context)}</td>
                  ))}
                  <td>
                    <div className="row-actions">
                      {config.key === "labs" && (
                        <button onClick={() => onOpenLab(record.id)} type="button">
                          Abrir view
                        </button>
                      )}
                      <button onClick={() => setModal({ mode: "edit", record })} type="button">
                        Editar
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          if (window.confirm(`Remover ${config.titleOf(record, context)}?`)) {
                            onDelete(config, record);
                          }
                        }}
                        type="button"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState text="Nenhum registro encontrado." />}
        </div>
      </section>

      {modal && (
        <RecordModal
          config={config}
          record={modal.record}
          context={context}
          onClose={() => setModal(null)}
          onSubmit={(values) => {
            onSave(config, values, modal.record);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function RecordModal({ config, record, onClose, onSubmit }) {
  const initial = record || config.empty;
  const [values, setValues] = useState(() => ({ ...initial }));

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field.name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={submit}>
        <header>
          <div>
            <p className="eyebrow">{record ? "Editar registro" : "Novo cadastro"}</p>
            <h2>{config.single}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} type="button">
            Fechar
          </button>
        </header>

        <div className="form-grid">
          {config.fields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(value) => updateField(field, value)}
            />
          ))}
        </div>

        <footer>
          <button className="btn ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn primary" type="submit">
            Salvar cadastro
          </button>
        </footer>
      </form>
    </div>
  );
}

function FieldControl({ field, value, onChange }) {
  const common = {
    id: field.name,
    name: field.name,
    required: field.required,
  };

  if (field.type === "files") {
    return <FileUpload field={field} value={value} onChange={onChange} />;
  }

  if (field.type === "textarea") {
    return (
      <label className={field.wide ? "wide" : ""}>
        {field.label}
        <textarea
          {...common}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
        />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className={field.wide ? "wide" : ""}>
        {field.label}
        <select {...common} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="wide checks">
        <legend>{field.label}</legend>
        <div className="checks-grid">
          {(field.options || []).map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value);
                  onChange(next);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="checkline">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  return (
    <label className={field.wide ? "wide" : ""}>
      {field.label}
      <input
        {...common}
        type={field.type || "text"}
        value={value ?? ""}
        min={field.min}
        max={field.max}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function FileUpload({ field, value, onChange }) {
  const files = Array.isArray(value) ? value : [];

  async function handleFiles(event) {
    const selected = Array.from(event.target.files || []).filter((file) =>
      file.type === "application/pdf" || file.type.startsWith("image/"),
    );
    const nextFiles = await Promise.all(selected.map(readFileAttachment));
    onChange([...files, ...nextFiles]);
    event.target.value = "";
  }

  function removeFile(id) {
    onChange(files.filter((file) => file.id !== id));
  }

  return (
    <fieldset className="wide file-field">
      <legend>{field.label}</legend>
      <input accept="application/pdf,image/*" multiple type="file" onChange={handleFiles} />
      <small>PDF e imagens são aceitos. Arquivos pequenos ficam salvos nesta base local.</small>
      <AttachmentGallery files={files} onRemove={removeFile} />
    </fieldset>
  );
}

function AttachmentGallery({ files = [], onRemove }) {
  if (!files.length) {
    return <div className="empty-state compact">Nenhum arquivo inserido.</div>;
  }

  return (
    <div className="attachment-list">
      {files.map((file) => {
        const isImage = file.type?.startsWith("image/");
        const label = file.type === "application/pdf" ? "PDF" : isImage ? "IMG" : "ARQ";

        return (
          <article className="attachment-item" key={file.id || file.name}>
            {isImage && file.dataUrl ? (
              <img src={file.dataUrl} alt={file.name} />
            ) : (
              <span className="file-kind">{label}</span>
            )}
            <div>
              <strong>{file.name}</strong>
              <small>
                {formatBytes(file.size)} {file.source ? `- ${file.kind}: ${file.source}` : ""}
              </small>
            </div>
            {file.dataUrl ? (
              <a href={file.dataUrl} target="_blank" rel="noreferrer">
                Abrir
              </a>
            ) : (
              <small>Metadado</small>
            )}
            {onRemove && (
              <button type="button" onClick={() => onRemove(file.id)}>
                Remover
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Reports({ data, context, stats }) {
  const examsByLab = data.labs.map((lab) => ({
    ...lab,
    exams: data.exams.filter((exam) => exam.labId === lab.id).length,
    patients: data.patients.filter((patient) => patient.labs.includes(lab.id)).length,
  }));

  const maxExams = Math.max(...examsByLab.map((lab) => lab.exams), 1);

  return (
    <div className="stack">
      <section className="module-head">
        <div>
          <p className="eyebrow">Indicadores</p>
          <h1>Relatórios e gestão</h1>
          <p>Resumo operacional calculado a partir dos cadastros ativos.</p>
        </div>
      </section>

      <section className="report-grid">
        <Metric value={stats.totalRecords} label="Registros totais" />
        <Metric value={stats.openExams} label="Exames abertos" tone="amber" />
        <Metric value={stats.criticalStock} label="Alertas de estoque" tone="red" />
        <Metric value={`${stats.stockAverage}%`} label="Estoque médio" tone="teal" />
      </section>

      <Panel title="Produção por laboratório">
        <div className="bar-list">
          {examsByLab.map((lab) => (
            <div className="bar-row" key={lab.id}>
              <div>
                <strong>{lab.name}</strong>
                <small>
                  {lab.patients} paciente(s) vinculados - {context.statusLabel(lab.status)}
                </small>
              </div>
              <div className="bar-track">
                <span style={{ width: `${(lab.exams / maxExams) * 100}%`, background: lab.color }} />
              </div>
              <b>{lab.exams}</b>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Audit({ events }) {
  return (
    <div className="stack">
      <section className="module-head">
        <div>
          <p className="eyebrow">Rastreabilidade</p>
          <h1>Auditoria</h1>
          <p>Todo cadastro, edição e exclusão gera um evento para acompanhamento.</p>
        </div>
      </section>
      <section className="data-surface">
        <div className="audit-list">
          {events.map((event) => (
            <article key={event.id}>
              <span>{formatDateTime(event.at)}</span>
              <div>
                <strong>{event.action}</strong>
                <small>
                  {event.entity} - {event.actor}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <section className="panel">
      <header>
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function Metric({ value, label, tone = "green" }) {
  return (
    <div className={`metric ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Badge({ value }) {
  const tone =
    ["active", "done", "signed", "confirmed"].includes(value)
      ? "ok"
      : ["busy", "waiting", "processing", "pending", "high"].includes(value)
        ? "warn"
        : ["canceled", "urgent", "inactive"].includes(value)
          ? "err"
          : "neutral";

  return <span className={`badge ${tone}`}>{statusLabels[value] || value}</span>;
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function makeContext(data) {
  const labs = Object.fromEntries(data.labs.map((item) => [item.id, item]));
  const tutors = Object.fromEntries(data.tutors.map((item) => [item.id, item]));
  const patients = Object.fromEntries(data.patients.map((item) => [item.id, item]));

  return {
    labName: (id) => labs[id]?.name || "Sem laboratório",
    labShort: (id) => labs[id]?.short || "N/D",
    tutorName: (id) => tutors[id]?.name || "Sem tutor",
    patientName: (id) => patients[id]?.name || "Sem paciente",
    patientTutor: (patientId) => tutors[patients[patientId]?.tutorId]?.name || "Sem tutor",
    statusLabel: (value) => statusLabels[value] || value,
    labOptions: [
      { value: "", label: "Sem laboratório vinculado" },
      ...data.labs.map((lab) => ({ value: lab.id, label: lab.name })),
    ],
    requiredLabOptions: data.labs.map((lab) => ({ value: lab.id, label: lab.name })),
    tutorOptions: data.tutors.map((tutor) => ({ value: tutor.id, label: tutor.name })),
    patientOptions: data.patients.map((patient) => ({
      value: patient.id,
      label: `${patient.name} - ${tutors[patient.tutorId]?.name || "Sem tutor"}`,
    })),
  };
}

function makeStats(data) {
  const openExams = data.exams.filter((exam) =>
    ["requested", "processing", "ready"].includes(exam.status),
  ).length;
  const criticalStock = data.inventory.filter((item) => Number(item.qty) <= Number(item.min)).length;
  const todayAppointments = data.appointments.filter((item) => item.date === todayISO()).length;
  const stockAverage = data.labs.length
    ? Math.round(data.labs.reduce((sum, lab) => sum + Number(lab.stock || 0), 0) / data.labs.length)
    : 0;

  return {
    patients: data.patients.length,
    tutors: data.tutors.length,
    openExams,
    criticalStock,
    todayAppointments,
    stockAverage,
    totalRecords:
      data.labs.length +
      data.tutors.length +
      data.patients.length +
      data.exams.length +
      data.appointments.length +
      data.inventory.length +
      data.users.length,
  };
}

function makeConfigs(data, context) {
  const labFilters = data.labs.map((lab) => ({ value: lab.id, label: lab.short }));
  const patientStatuses = [
    { value: "waiting", label: "Aguardando" },
    { value: "in_service", label: "Em atendimento" },
    { value: "done", label: "Concluído" },
  ];
  const examStatuses = [
    { value: "requested", label: "Solicitado" },
    { value: "processing", label: "Em análise" },
    { value: "ready", label: "Pronto" },
    { value: "signed", label: "Assinado" },
  ];
  const priorities = [
    { value: "normal", label: "Normal" },
    { value: "high", label: "Alta" },
    { value: "urgent", label: "Urgente" },
  ];

  return {
    tutors: {
      key: "tutors",
      prefix: "tut",
      title: "Tutores",
      single: "Tutor",
      action: "+ Novo tutor",
      description: "Cadastro completo dos responsáveis pelos animais atendidos.",
      searchPlaceholder: "Buscar por nome, CPF, telefone ou cidade",
      empty: { name: "", document: "", phone: "", email: "", city: "São Luís", address: "" },
      titleOf: (record) => record.name,
      searchText: (record) => Object.values(record).join(" "),
      fields: [
        { name: "name", label: "Nome completo", required: true },
        { name: "document", label: "CPF ou documento", required: true },
        { name: "phone", label: "Telefone", required: true },
        { name: "email", label: "E-mail", type: "email" },
        { name: "city", label: "Cidade" },
        { name: "address", label: "Endereço", wide: true },
      ],
      columns: [
        { key: "name", label: "Tutor", render: (record) => <strong>{record.name}</strong> },
        { key: "phone", label: "Contato", render: (record) => <span>{record.phone}</span> },
        { key: "email", label: "E-mail", render: (record) => <span>{record.email || "N/D"}</span> },
        { key: "city", label: "Cidade", render: (record) => <span>{record.city}</span> },
      ],
    },
    patients: {
      key: "patients",
      prefix: "ani",
      title: "Pacientes",
      single: "Paciente",
      action: "+ Novo paciente",
      description: "Animais vinculados aos tutores, laboratórios e histórico clínico.",
      searchPlaceholder: "Buscar por animal, espécie, raça ou tutor",
      empty: {
        name: "",
        species: "Canino",
        breed: "",
        weight: "",
        age: "",
        tutorId: data.tutors[0]?.id || "",
        labs: data.labs[0] ? [data.labs[0].id] : [],
        status: "waiting",
        notes: "",
        attachments: [],
      },
      filters: [...patientStatuses, ...labFilters],
      filterBy: (record, filter) => record.status === filter || record.labs.includes(filter),
      titleOf: (record) => record.name,
      searchText: (record, ctx) =>
        `${record.name} ${record.species} ${record.breed} ${ctx.tutorName(record.tutorId)}`,
      fields: [
        { name: "name", label: "Nome do animal", required: true },
        {
          name: "species",
          label: "Espécie",
          type: "select",
          options: [
            { value: "Canino", label: "Canino" },
            { value: "Felino", label: "Felino" },
            { value: "Ave", label: "Ave" },
            { value: "Equino", label: "Equino" },
            { value: "Silvestre", label: "Silvestre" },
          ],
        },
        { name: "breed", label: "Raça" },
        { name: "age", label: "Idade" },
        { name: "weight", label: "Peso" },
        { name: "tutorId", label: "Tutor", type: "select", options: context.tutorOptions },
        { name: "status", label: "Status", type: "select", options: patientStatuses },
        { name: "labs", label: "Laboratórios vinculados", type: "multiselect", options: context.requiredLabOptions },
        { name: "attachments", label: "PDFs e imagens do paciente", type: "files" },
        { name: "notes", label: "Observações clínicas", type: "textarea", wide: true },
      ],
      columns: [
        { key: "name", label: "Paciente", render: (record) => <strong>{record.name}</strong> },
        { key: "species", label: "Espécie", render: (record) => <span>{record.species}</span> },
        { key: "tutor", label: "Tutor", render: (record, ctx) => <span>{ctx.tutorName(record.tutorId)}</span> },
        {
          key: "labs",
          label: "Laboratórios",
          render: (record, ctx) => (
            <span>{record.labs.map((id) => ctx.labShort(id)).join(", ") || "N/D"}</span>
          ),
        },
        {
          key: "attachments",
          label: "Arquivos",
          render: (record) => <span>{record.attachments?.length || 0}</span>,
        },
        { key: "status", label: "Status", render: (record) => <Badge value={record.status} /> },
      ],
    },
    exams: {
      key: "exams",
      prefix: "exa",
      title: "Exames",
      single: "Exame",
      action: "+ Novo exame",
      description: "Solicitação, processamento, resultado e assinatura do laudo.",
      searchPlaceholder: "Buscar por paciente, exame, laboratório ou solicitante",
      empty: {
        patientId: data.patients[0]?.id || "",
        labId: data.labs[0]?.id || "",
        type: "Hemograma Completo",
        requestedBy: "",
        status: "requested",
        priority: "normal",
        collectedAt: todayISO(),
        result: "",
        attachments: [],
      },
      filters: [...examStatuses, ...priorities, ...labFilters],
      filterBy: (record, filter) =>
        record.status === filter || record.priority === filter || record.labId === filter,
      titleOf: (record, ctx) => `${record.type} - ${ctx.patientName(record.patientId)}`,
      searchText: (record, ctx) =>
        `${record.type} ${record.requestedBy} ${ctx.patientName(record.patientId)} ${ctx.labName(record.labId)}`,
      fields: [
        { name: "patientId", label: "Paciente", type: "select", options: context.patientOptions },
        { name: "labId", label: "Laboratório", type: "select", options: context.requiredLabOptions },
        {
          name: "type",
          label: "Tipo de exame",
          type: "select",
          options: [
            { value: "Hemograma Completo", label: "Hemograma Completo" },
            { value: "Bioquímica Sérica", label: "Bioquímica Sérica" },
            { value: "Raio-X Torácico", label: "Raio-X Torácico" },
            { value: "Ultrassom Abdominal", label: "Ultrassom Abdominal" },
            { value: "Biópsia de Pele", label: "Biópsia de Pele" },
            { value: "Coproparasitológico", label: "Coproparasitológico" },
            { value: "Cultura Bacteriana", label: "Cultura Bacteriana" },
          ],
        },
        { name: "requestedBy", label: "Solicitante" },
        { name: "status", label: "Status", type: "select", options: examStatuses },
        { name: "priority", label: "Prioridade", type: "select", options: priorities },
        { name: "collectedAt", label: "Data da coleta", type: "date" },
        { name: "attachments", label: "PDFs e imagens do exame", type: "files" },
        { name: "result", label: "Resultado ou andamento", type: "textarea", wide: true },
      ],
      columns: [
        { key: "type", label: "Exame", render: (record) => <strong>{record.type}</strong> },
        { key: "patient", label: "Paciente", render: (record, ctx) => <span>{ctx.patientName(record.patientId)}</span> },
        { key: "lab", label: "Laboratório", render: (record, ctx) => <span>{ctx.labShort(record.labId)}</span> },
        { key: "date", label: "Coleta", render: (record) => <span>{formatDate(record.collectedAt)}</span> },
        {
          key: "attachments",
          label: "Arquivos",
          render: (record) => <span>{record.attachments?.length || 0}</span>,
        },
        { key: "status", label: "Status", render: (record) => <Badge value={record.status} /> },
      ],
    },
    appointments: {
      key: "appointments",
      prefix: "age",
      title: "Agenda",
      single: "Agendamento",
      action: "+ Novo agendamento",
      description: "Fluxo de marcação para consultas, coletas e procedimentos.",
      searchPlaceholder: "Buscar por paciente, tipo, veterinário ou laboratório",
      empty: {
        date: todayISO(),
        time: "08:00",
        patientId: data.patients[0]?.id || "",
        labId: data.labs[0]?.id || "",
        type: "",
        vet: "",
        status: "pending",
      },
      filters: [
        { value: "confirmed", label: "Confirmado" },
        { value: "pending", label: "Pendente" },
        { value: "canceled", label: "Cancelado" },
        ...labFilters,
      ],
      filterBy: (record, filter) => record.status === filter || record.labId === filter,
      titleOf: (record, ctx) => `${record.date} ${record.time} - ${ctx.patientName(record.patientId)}`,
      searchText: (record, ctx) =>
        `${record.type} ${record.vet} ${ctx.patientName(record.patientId)} ${ctx.labName(record.labId)}`,
      fields: [
        { name: "date", label: "Data", type: "date" },
        { name: "time", label: "Horário", type: "time" },
        { name: "patientId", label: "Paciente", type: "select", options: context.patientOptions },
        { name: "labId", label: "Laboratório", type: "select", options: context.requiredLabOptions },
        { name: "type", label: "Tipo de atendimento", required: true },
        { name: "vet", label: "Veterinário responsável" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "pending", label: "Pendente" },
            { value: "confirmed", label: "Confirmado" },
            { value: "canceled", label: "Cancelado" },
          ],
        },
      ],
      columns: [
        { key: "date", label: "Data", render: (record) => <strong>{formatDate(record.date)}</strong> },
        { key: "time", label: "Horário", render: (record) => <span>{record.time}</span> },
        { key: "patient", label: "Paciente", render: (record, ctx) => <span>{ctx.patientName(record.patientId)}</span> },
        { key: "type", label: "Atendimento", render: (record) => <span>{record.type}</span> },
        { key: "status", label: "Status", render: (record) => <Badge value={record.status} /> },
      ],
    },
    inventory: {
      key: "inventory",
      prefix: "inv",
      title: "Estoque",
      single: "Item de estoque",
      action: "+ Novo item",
      description: "Medicamentos e insumos com mínimo, validade e controle restrito.",
      searchPlaceholder: "Buscar por item, categoria ou laboratório",
      empty: {
        name: "",
        category: "Medicamento",
        labId: data.labs[0]?.id || "",
        qty: 0,
        min: 10,
        max: 100,
        expiry: todayISO(),
        restricted: false,
      },
      filters: [
        { value: "critical", label: "Crítico" },
        { value: "restricted", label: "Controlado" },
        ...labFilters,
      ],
      filterBy: (record, filter) =>
        (filter === "critical" && Number(record.qty) <= Number(record.min)) ||
        (filter === "restricted" && record.restricted) ||
        record.labId === filter,
      titleOf: (record) => record.name,
      searchText: (record, ctx) => `${record.name} ${record.category} ${ctx.labName(record.labId)}`,
      fields: [
        { name: "name", label: "Nome do item", required: true },
        { name: "category", label: "Categoria" },
        { name: "labId", label: "Laboratório", type: "select", options: context.requiredLabOptions },
        { name: "qty", label: "Quantidade", type: "number", min: 0 },
        { name: "min", label: "Estoque mínimo", type: "number", min: 0 },
        { name: "max", label: "Capacidade", type: "number", min: 0 },
        { name: "expiry", label: "Validade", type: "date" },
        { name: "restricted", label: "Item controlado", type: "checkbox" },
      ],
      columns: [
        { key: "name", label: "Item", render: (record) => <strong>{record.name}</strong> },
        { key: "lab", label: "Laboratório", render: (record, ctx) => <span>{ctx.labShort(record.labId)}</span> },
        {
          key: "qty",
          label: "Saldo",
          render: (record) => (
            <span className={Number(record.qty) <= Number(record.min) ? "danger-text" : ""}>
              {record.qty} / {record.max}
            </span>
          ),
        },
        { key: "expiry", label: "Validade", render: (record) => <span>{formatDate(record.expiry)}</span> },
        { key: "restricted", label: "Controle", render: (record) => <span>{record.restricted ? "Controlado" : "Livre"}</span> },
      ],
    },
    labs: {
      key: "labs",
      prefix: "lab",
      title: "Laboratórios",
      single: "Laboratório",
      action: "+ Novo laboratório",
      description: "Estrutura, coordenadores, status e disponibilidade operacional.",
      searchPlaceholder: "Buscar por laboratório, sigla, sala ou coordenador",
      empty: {
        name: "",
        short: "",
        coordinator: "",
        local: "",
        desc: "",
        stock: 70,
        status: "active",
        color: "#285A43",
      },
      filters: [
        { value: "active", label: "Ativo" },
        { value: "busy", label: "Ocupado" },
        { value: "idle", label: "Livre" },
      ],
      filterBy: (record, filter) => record.status === filter,
      titleOf: (record) => record.name,
      searchText: (record) => `${record.name} ${record.short} ${record.coordinator} ${record.local}`,
      fields: [
        { name: "name", label: "Nome", required: true },
        { name: "short", label: "Sigla", required: true },
        { name: "coordinator", label: "Coordenador" },
        { name: "local", label: "Local" },
        { name: "stock", label: "Disponibilidade de estoque (%)", type: "number", min: 0, max: 100 },
        { name: "color", label: "Cor do laboratório", type: "color" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Ativo" },
            { value: "busy", label: "Ocupado" },
            { value: "idle", label: "Livre" },
          ],
        },
        { name: "desc", label: "Descrição", type: "textarea", wide: true },
      ],
      columns: [
        { key: "name", label: "Laboratório", render: (record) => <strong>{record.name}</strong> },
        { key: "short", label: "Sigla", render: (record) => <span>{record.short}</span> },
        { key: "coordinator", label: "Coordenação", render: (record) => <span>{record.coordinator}</span> },
        { key: "stock", label: "Estoque", render: (record) => <span>{record.stock}%</span> },
        { key: "status", label: "Status", render: (record) => <Badge value={record.status} /> },
      ],
    },
    users: {
      key: "users",
      prefix: "usr",
      title: "Usuários",
      single: "Usuário",
      action: "+ Novo usuário",
      description: "Equipe, papéis de acesso e vínculo com laboratório.",
      searchPlaceholder: "Buscar por nome, e-mail, função ou laboratório",
      empty: {
        name: "",
        email: "",
        role: "Aluno / Estagiário",
        labId: "",
        status: "active",
      },
      filters: [
        { value: "active", label: "Ativo" },
        { value: "inactive", label: "Inativo" },
        ...labFilters,
      ],
      filterBy: (record, filter) => record.status === filter || record.labId === filter,
      titleOf: (record) => record.name,
      searchText: (record, ctx) => `${record.name} ${record.email} ${record.role} ${ctx.labName(record.labId)}`,
      fields: [
        { name: "name", label: "Nome", required: true },
        { name: "email", label: "E-mail", type: "email", required: true },
        {
          name: "role",
          label: "Perfil",
          type: "select",
          options: [
            { value: "Gestor Hub", label: "Gestor Hub" },
            { value: "Coordenador", label: "Coordenador" },
            { value: "Professor / Veterinário", label: "Professor / Veterinário" },
            { value: "Aluno / Estagiário", label: "Aluno / Estagiário" },
          ],
        },
        { name: "labId", label: "Laboratório", type: "select", options: context.labOptions },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Ativo" },
            { value: "inactive", label: "Inativo" },
          ],
        },
      ],
      columns: [
        { key: "name", label: "Usuário", render: (record) => <strong>{record.name}</strong> },
        { key: "email", label: "E-mail", render: (record) => <span>{record.email}</span> },
        { key: "role", label: "Perfil", render: (record) => <span>{record.role}</span> },
        { key: "lab", label: "Laboratório", render: (record, ctx) => <span>{ctx.labName(record.labId)}</span> },
        { key: "status", label: "Status", render: (record) => <Badge value={record.status} /> },
      ],
    },
  };
}

function normalizeValues(fields, values) {
  return fields.reduce((acc, field) => {
    const value = values[field.name];

    if (field.type === "number") {
      acc[field.name] = Number(value || 0);
      return acc;
    }

    if (field.type === "checkbox") {
      acc[field.name] = Boolean(value);
      return acc;
    }

    if (field.type === "multiselect") {
      acc[field.name] = Array.isArray(value) ? value : [];
      return acc;
    }

    if (field.type === "files") {
      acc[field.name] = Array.isArray(value) ? value : [];
      return acc;
    }

    acc[field.name] = value ?? "";
    return acc;
  }, {});
}

function readFileAttachment(file) {
  const base = {
    id: makeId("file"),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl: "",
  };

  if (file.size > maxStoredFileSize) {
    return Promise.resolve(base);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ ...base, dataUrl: String(reader.result || "") });
    reader.onerror = () => resolve(base);
    reader.readAsDataURL(file);
  });
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "N/D";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function labelForActive(active) {
  return moduleLabels[active] || navItems.find((item) => item.id === active)?.label || "Hub";
}

function titleForActive(active) {
  const found = navItems.find((item) => item.id === active);
  return found?.label || "Hub Central";
}

export default App;
