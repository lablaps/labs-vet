import { useEffect, useMemo, useState } from "react";
import { createInitialData, moduleLabels, statusLabels, STORAGE_KEY } from "./data";
import { createQrSvg } from "./qr";
import { usePersistentState } from "./storage";

const navItems = [
  { id: "dashboard", label: "Hub", section: "Operação" },
  { id: "tutors", label: "Tutores", section: "Cadastros" },
  { id: "veterinarians", label: "Veterinários", section: "Cadastros" },
  { id: "patients", label: "Pacientes", section: "Cadastros" },
  { id: "exams", label: "Exames", section: "Rotina" },
  { id: "requisitions", label: "Requisições", section: "Rotina" },
  { id: "appointments", label: "Agenda", section: "Rotina" },
  { id: "inventory", label: "Estoque", section: "Rotina" },
  { id: "labs", label: "Laboratórios", section: "Administração" },
  { id: "users", label: "Usuários", section: "Administração" },
  { id: "reports", label: "Relatórios", section: "Gestão" },
  { id: "audit", label: "Auditoria", section: "Gestão" },
];

const todayISO = () => new Date().toLocaleDateString("sv-SE");
const cloneSeed = createInitialData;
const demoCredentials = {
  email: "ewaldo.santana@uema.br",
  password: "petcore@2026",
};
const maxStoredFileSize = 8 * 1024 * 1024;
const labRoute = (labId) => `lab:${labId}`;
const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const makeProtocol = () =>
  `OS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;

function App() {
  const [data, setData, storageState] = usePersistentState(STORAGE_KEY, cloneSeed());
  const [screen, setScreen] = useState("login");
  const [active, setActive] = useState("dashboard");
  const [currentUserId, setCurrentUserId] = useState("");

  const currentUser = data.users.find((user) => user.id === currentUserId) || data.users[0];
  const access = useMemo(() => makeAccess(currentUser), [currentUser]);
  const scopedData = useMemo(() => applyRlsView(data, currentUser), [data, currentUser]);
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => canAccessModule(item.id, access)),
    [access],
  );
  const context = useMemo(() => makeContext(scopedData), [scopedData]);
  const stats = useMemo(() => makeStats(scopedData), [scopedData]);
  const configs = useMemo(
    () => makeConfigs(scopedData, context, { access, currentUser }),
    [scopedData, context, access, currentUser],
  );

  useEffect(() => {
    const activeModuleAllowed = visibleNavItems.some((item) => item.id === active);
    const activeLabAllowed =
      active.startsWith("lab:") && scopedData.labs.some((lab) => active === labRoute(lab.id));

    if (!activeModuleAllowed && !activeLabAllowed) {
      setActive("dashboard");
    }
  }, [active, visibleNavItems, scopedData.labs]);

  function withAudit(next, entity, action) {
    const auditEvent = {
      id: makeId("aud"),
      at: new Date().toISOString(),
      entity,
      action,
      actor: currentUser?.name || "Sistema",
    };

    return {
      ...next,
      auditEvents: [auditEvent, ...(next.auditEvents || [])].slice(0, 80),
    };
  }

  function saveRecord(config, values, editingRecord) {
    setData((current) => {
      const normalized = normalizeValues(config.fields, values);
      if (config.key === "exams") {
        normalized.protocol = normalized.protocol || makeProtocol();
        normalized.requestedBy =
          normalized.requestedBy || context.veterinarianName(normalized.veterinarianId);
      }
      if (config.key === "requisitions") {
        normalized.requesterUserId = normalized.requesterUserId || currentUser?.id || "";
        normalized.labId = normalized.labId || currentUser?.labId || "";
      }
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
    anchor.download = `laboratorio-inteligente-${todayISO()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function printExamLabels(exams = data.exams) {
    const list = exams.length ? exams : data.exams;
    const labels = list
      .map((exam) => {
        const protocol = exam.protocol || exam.id;
        return `
          <article class="label">
            <div class="qr">${createQrSvg(protocol)}</div>
            <div>
              <small>Laboratório Inteligente</small>
              <h2>${escapeHtml(protocol)}</h2>
              <p>${escapeHtml(context.patientName(exam.patientId))}</p>
              <p>${escapeHtml(context.patientTutor(exam.patientId))}</p>
              <p>${escapeHtml(exam.type)} · ${escapeHtml(context.labShort(exam.labId))}</p>
              <p>Recebimento: ${escapeHtml(formatDate(exam.receivedAt || exam.collectedAt))}</p>
            </div>
          </article>
        `;
      })
      .join("");

    printDocument("Etiquetas de amostras", labels, "labels");
  }

  function printBatchReports(exams = data.exams) {
    const reportable = (exams.length ? exams : data.exams).filter(
      (exam) => exam.status === "ready" || exam.status === "signed" || exam.diagnosis || exam.result,
    );

    if (!reportable.length) {
      window.alert("Nenhum laudo pronto para exportar.");
      return;
    }

    const reports = reportable
      .map(
        (exam) => `
          <article class="report">
            <header>
              <div>
                <small>Laudo laboratorial</small>
                <h1>${escapeHtml(exam.protocol || exam.id)}</h1>
              </div>
              <strong>${escapeHtml(context.statusLabel(exam.status))}</strong>
            </header>
            <dl>
              <div><dt>Paciente</dt><dd>${escapeHtml(context.patientName(exam.patientId))}</dd></div>
              <div><dt>Tutor</dt><dd>${escapeHtml(context.patientTutor(exam.patientId))}</dd></div>
              <div><dt>Veterinário</dt><dd>${escapeHtml(context.veterinarianName(exam.veterinarianId) || exam.requestedBy)}</dd></div>
              <div><dt>Exame</dt><dd>${escapeHtml(exam.type)}</dd></div>
              <div><dt>Material</dt><dd>${escapeHtml(exam.material)}</dd></div>
              <div><dt>Condição</dt><dd>${escapeHtml(context.statusLabel(exam.sampleCondition))}</dd></div>
            </dl>
            <h2>Descrição macroscópica</h2>
            <p>${escapeHtml(exam.macroDescription || "Não informado.")}</p>
            <h2>Descrição microscópica</h2>
            <p>${escapeHtml(exam.microDescription || "Não informado.")}</p>
            <h2>Diagnóstico conclusivo</h2>
            <p>${escapeHtml(exam.diagnosis || exam.result || "Não informado.")}</p>
            <h2>Comentários</h2>
            <p>${escapeHtml(exam.comments || "Sem comentários adicionais.")}</p>
            <footer>
              <span>${escapeHtml(exam.responsibleDoctor || "Responsável técnico")}</span>
              <span>Liberado em ${escapeHtml(formatDate(exam.releasedAt))}</span>
            </footer>
          </article>
        `,
      )
      .join("");

    printDocument("Laudos em lote", reports, "reports");
  }

  function resetDemo() {
    setData(withAudit(cloneSeed(), "Sistema", "Restaurou a base demonstrativa do Laboratório Inteligente"));
    setActive("dashboard");
  }

  if (screen === "login") {
    return (
      <LoginScreen
        users={data.users}
        onLogin={(userId) => {
          setCurrentUserId(userId);
          setActive("dashboard");
          setScreen("app");
        }}
      />
    );
  }

  const currentConfig = configs[active];
  const currentLabId = active.startsWith("lab:") ? active.slice(4) : "";
  const currentLab = scopedData.labs.find((item) => item.id === currentLabId);

  return (
    <Shell
      active={active}
      onNavigate={setActive}
      navItems={visibleNavItems}
      labs={scopedData.labs}
      stats={stats}
      data={scopedData}
      currentUser={currentUser}
      access={access}
      storageState={storageState}
      onExport={exportJSON}
      onReset={resetDemo}
    >
      {active === "dashboard" && (
        <Dashboard
          data={scopedData}
          context={context}
          stats={stats}
          currentUser={currentUser}
          access={access}
          visibleNavItems={visibleNavItems}
          onNavigate={setActive}
        />
      )}

      {currentConfig && (
        <CrudModule
          config={currentConfig}
          records={scopedData[currentConfig.key]}
          context={context}
          access={access}
          currentUser={currentUser}
          onSave={saveRecord}
          onDelete={deleteRecord}
          onOpenLab={(labId) => setActive(labRoute(labId))}
          onPrintLabels={currentConfig.key === "exams" ? printExamLabels : undefined}
          onPrintReports={currentConfig.key === "exams" ? printBatchReports : undefined}
        />
      )}

      {currentLab && (
        <LabView
          lab={currentLab}
          data={scopedData}
          context={context}
          visibleNavItems={visibleNavItems}
          onNavigate={setActive}
        />
      )}

      {active === "reports" && <Reports data={scopedData} context={context} stats={stats} />}
      {active === "audit" && <Audit events={scopedData.auditEvents} />}
    </Shell>
  );
}

function LoginScreen({ users, onLogin }) {
  const [email, setEmail] = useState(demoCredentials.email);
  const [password, setPassword] = useState(demoCredentials.password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function enter(event) {
    event.preventDefault();
    const user = users.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.status === "active",
    );

    if (!user || password !== demoCredentials.password) {
      setError("E-mail ou senha inválidos para a demonstração.");
      return;
    }

    setError("");
    setLoading(true);
    window.setTimeout(() => onLogin(user.id), 420);
  }

  return (
    <main className="login-screen">
      <section className="login-copy">
        <p className="eyebrow">Laboratório veterinário inteligente</p>
        <h1>LabVet</h1>
        <p className="login-text">
          Protocolos, amostras, laudos, etiquetas, financeiro e auditoria em uma operação
          local com SQLite.
        </p>

        <form className="login-form" onSubmit={enter}>
          <label>
            E-mail institucional
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Senha
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? "Entrando..." : "Entrar no sistema"}
          </button>
        </form>
        <div className="credential-box">
          <span>Acesso de demonstração</span>
          <strong>Use o e-mail de qualquer usuário cadastrado</strong>
          <strong>Senha: {demoCredentials.password}</strong>
        </div>
      </section>
      <section className="login-visual" aria-label="Rotina veterinária">
        <div>
          <span>Hoje</span>
          <strong>12 amostras</strong>
          <small>4 laudos pendentes de liberação</small>
        </div>
      </section>
    </main>
  );
}

function Shell({
  active,
  onNavigate,
  navItems,
  labs,
  stats,
  data,
  currentUser,
  access,
  storageState,
  onExport,
  onReset,
  children,
}) {
  const grouped = navItems.reduce((acc, item) => {
    acc[item.section] = acc[item.section] || [];
    acc[item.section].push(item);
    return acc;
  }, {});
  const currentLab = labs.find((lab) => active === labRoute(lab.id));

  return (
    <div className={`app-shell scope-${access.scope}`}>
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">LAB</span>
          <div>
            <strong>LabVet</strong>
            <small>SQLite local</small>
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
          <small>{storageState?.label || "SQLite local"}</small>
          {storageState?.error && <small>{storageState.error}</small>}
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              LabVet / {currentLab ? currentLab.short : labelForActive(active)}
            </span>
            <h2>{currentLab ? currentLab.name : titleForActive(active)}</h2>
          </div>
          <div className="topbar-actions">
            <div className={`sync-pill ${storageState?.source === "sqlite" ? "online" : "offline"}`}>
              <span />
              {storageState?.label || "SQLite local"}
            </div>
            <button className="btn secondary" onClick={onExport} type="button">
              Exportar JSON
            </button>
            <button className="btn ghost" onClick={onReset} type="button">
              Restaurar demo
            </button>
            <div className="user-chip" title={`Escopo RLS: ${access.scopeLabel}`}>
              <span>{userInitials(currentUser?.name)}</span>
              <div>
                <strong>{currentUser?.name || "Usuário"}</strong>
                <small>{currentUser?.role || "Sem perfil"} · {access.scopeLabel}</small>
              </div>
            </div>
          </div>
        </header>
        <section className="rls-strip" aria-label="Resumo de acesso">
          <span>RLS local</span>
          <strong>{access.scopeLabel}</strong>
          <small>{access.description}</small>
          <b>{stats.totalRecords} registros visíveis</b>
        </section>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

function Dashboard({ data, context, stats, currentUser, access, visibleNavItems, onNavigate }) {
  const today = todayISO();
  const view = dashboardViewFor(access, currentUser, stats);
  const canNavigate = (id) => visibleNavItems.some((item) => item.id === id);
  const panelAction = (target, label) =>
    canNavigate(target) ? (
      <button onClick={() => onNavigate(target)} type="button">
        {label}
      </button>
    ) : null;
  const todaysAppointments = data.appointments
    .filter((appointment) => appointment.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  const criticalStock = data.inventory.filter((item) => Number(item.qty) <= Number(item.min));
  const pendingExams = data.exams.filter((exam) =>
    ["requested", "processing", "ready"].includes(exam.status),
  );
  const pendingSamples = data.exams.filter((exam) => !exam.receivedAt || exam.status === "requested");
  const pendingReports = data.exams.filter((exam) => !exam.releasedAt && exam.status !== "signed");
  const signedReports = data.exams.filter((exam) => exam.status === "signed").length;

  return (
    <div className="stack">
      <section className={`hero-surface lab-command hero-${access.scope}`}>
        <div className="command-copy">
          <p className="eyebrow">{view.eyebrow}</p>
          <h1>{view.title}</h1>
          <p>{view.description}</p>
          <div className="hero-actions">
            {view.actions
              .filter((action) => canNavigate(action.target))
              .map((action, index) => (
                <button
                  className={`btn ${index === 0 ? "primary" : "secondary"}`}
                  key={action.target}
                  onClick={() => onNavigate(action.target)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
          </div>
        </div>
        <div className="process-board" aria-label="Fluxo laboratorial">
          <div>
            <span>Receber</span>
            <strong>{stats.samplesPending}</strong>
            <small>amostras na porta</small>
          </div>
          <div>
            <span>Analisar</span>
            <strong>{stats.openExams}</strong>
            <small>exames ativos</small>
          </div>
          <div>
            <span>Laudar</span>
            <strong>{stats.reportsPending}</strong>
            <small>pendências técnicas</small>
          </div>
          <div>
            <span>Liberar</span>
            <strong>{signedReports}</strong>
            <small>assinados</small>
          </div>
        </div>
        <div className="specimen-visual" aria-label="Bancada de laboratório">
          <div>
            <span>Próximo protocolo</span>
            <strong>{pendingSamples[0]?.protocol || pendingReports[0]?.protocol || "Fila limpa"}</strong>
            <small>
              {pendingSamples[0]
                ? `${pendingSamples[0].material || "Material não informado"} · ${context.labShort(pendingSamples[0].labId)}`
                : "Nenhuma amostra aguardando recebimento"}
            </small>
          </div>
        </div>
      </section>

      <section className="quick-strip" aria-label="Atalhos da rotina">
        {view.tiles
          .filter((tile) => !tile.target || canNavigate(tile.target))
          .map((tile) => (
            <button key={tile.label} type="button" onClick={() => tile.target && onNavigate(tile.target)}>
              <span>{tile.label}</span>
              <strong>{tile.value}</strong>
            </button>
          ))}
      </section>

      <RoleWorkspace
        access={access}
        data={data}
        context={context}
        stats={stats}
        currentUser={currentUser}
        canNavigate={canNavigate}
        onNavigate={onNavigate}
      />

      <section className="insight-grid">
        <Panel title="Distribuição dos exames">
          <DonutChart counts={stats.statusCounts} context={context} />
        </Panel>
        <Panel title="Tipos mais solicitados">
          <MiniBars counts={stats.examTypeCounts} />
        </Panel>
        <Panel title="Escopo do perfil">
          <div className="profile-scope">
            <strong>{currentUser?.role}</strong>
            <p>{access.description}</p>
            <ul className="scope-rules">
              {view.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <dl>
              <div>
                <dt>Laboratórios</dt>
                <dd>{data.labs.length}</dd>
              </div>
              <div>
                <dt>Anexos</dt>
                <dd>{stats.attachmentCount}</dd>
              </div>
              <div>
                <dt>Requisições</dt>
                <dd>{stats.openRequisitions}</dd>
              </div>
              {access.canSeeFinancial && (
                <div>
                  <dt>Financeiro aberto</dt>
                  <dd>{formatCurrency(stats.financialOpen)}</dd>
                </div>
              )}
            </dl>
          </div>
        </Panel>
      </section>

      <section className="dashboard-grid">
        <Panel title="Laboratórios" action={panelAction("labs", "Gerir")}>
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
          action={panelAction("appointments", "Nova agenda")}
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

        <Panel title="Exames em andamento" action={panelAction("exams", "Abrir")}>
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

        <Panel title="Pendências de laudo" action={panelAction("exams", "Revisar")}>
          <div className="compact-list">
            {pendingReports.length === 0 && <EmptyState text="Nenhum laudo pendente." />}
            {pendingReports.slice(0, 5).map((exam) => (
              <div className="compact-row" key={exam.id}>
                <div>
                  <strong>{exam.protocol}</strong>
                  <small>
                    {context.patientName(exam.patientId)} - {exam.type}
                  </small>
                </div>
                <Badge value={exam.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Amostras a receber" action={panelAction("exams", "Conferir")}>
          <div className="compact-list">
            {pendingSamples.length === 0 && <EmptyState text="Nenhuma amostra pendente." />}
            {pendingSamples.slice(0, 5).map((exam) => (
              <div className="compact-row" key={exam.id}>
                <div>
                  <strong>{exam.protocol}</strong>
                  <small>
                    {exam.material || "Material não informado"} - {context.labShort(exam.labId)}
                  </small>
                </div>
                <Badge value={exam.sampleCondition || "pending"} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Estoque crítico" action={panelAction("inventory", "Regularizar")}>
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

function LabView({ lab, data, context, visibleNavItems, onNavigate }) {
  const canNavigate = (id) => visibleNavItems.some((item) => item.id === id);
  const panelAction = (target, label) =>
    canNavigate(target) ? (
      <button onClick={() => onNavigate(target)} type="button">
        {label}
      </button>
    ) : null;
  const patients = data.patients.filter((patient) => (patient.labs || []).includes(lab.id));
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
        <Panel title="Pacientes vinculados" action={panelAction("patients", "Cadastrar")}>
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

        <Panel title="Exames do laboratório" action={panelAction("exams", "Solicitar")}>
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

        <Panel title="Agenda do setor" action={panelAction("appointments", "Agendar")}>
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

        <Panel title="Estoque do laboratório" action={panelAction("inventory", "Estoque")}>
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

      <Panel title="Arquivos do laboratório" action={panelAction("exams", "Inserir arquivo")}>
        <AttachmentGallery files={attachments} />
      </Panel>
    </div>
  );
}

function CrudModule({
  config,
  records = [],
  context,
  access,
  currentUser,
  onSave,
  onDelete,
  onOpenLab,
  onPrintLabels,
  onPrintReports,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const policy = modulePolicy(config.key, access, currentUser);
  const canCreate = canCreateRecord(config.key, access);
  const canEdit = canEditRecord(config.key, access);

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
          <p className="eyebrow">Operação local</p>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <div className="module-actions">
          {onPrintLabels && (
            <button className="btn secondary" onClick={() => onPrintLabels(filtered)} type="button">
              Etiquetas QR
            </button>
          )}
          {onPrintReports && (
            <button className="btn secondary" onClick={() => onPrintReports(filtered)} type="button">
              Laudos PDF
            </button>
          )}
          {canCreate && (
            <button className="btn primary" onClick={() => setModal({ mode: "create" })} type="button">
              {config.action}
            </button>
          )}
        </div>
      </section>

      <RlsModuleBanner policy={policy} visibleCount={records.length} filteredCount={filtered.length} />

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
                      {onPrintLabels && (
                        <button onClick={() => onPrintLabels([record])} type="button">
                          Etiqueta
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => setModal({ mode: "edit", record })} type="button">
                          {policy.editLabel}
                        </button>
                      )}
                      {access?.canDelete && (
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
                      )}
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
    const hasOptions = (field.options || []).length > 0;
    const options = hasOptions ? field.options : [{ value: "", label: "Sem opções disponíveis" }];

    return (
      <label className={field.wide ? "wide" : ""}>
        {field.label}
        <select
          {...common}
          value={value ?? ""}
          disabled={!hasOptions}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
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
          {(field.options || []).length === 0 && <small>Sem opções disponíveis para este perfil.</small>}
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
        step={field.step}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function FileUpload({ field, value, onChange }) {
  const files = Array.isArray(value) ? value : [];

  async function appendFiles(fileList) {
    const selected = Array.from(fileList || []).filter((file) =>
      file.type === "application/pdf" || file.type.startsWith("image/"),
    );
    if (!selected.length) return;
    const nextFiles = await Promise.all(selected.map(readFileAttachment));
    onChange([...files, ...nextFiles]);
  }

  async function handleFiles(event) {
    await appendFiles(event.target.files);
    event.target.value = "";
  }

  function removeFile(id) {
    onChange(files.filter((file) => file.id !== id));
  }

  return (
    <fieldset
      className="wide file-field"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        appendFiles(event.dataTransfer.files);
      }}
    >
      <legend>{field.label}</legend>
      <div className="drop-zone">
        <strong>Solte imagens, fotos da amostra ou PDFs aqui</strong>
        <small>
          Arquivos até {formatBytes(maxStoredFileSize)} ficam salvos na base local; maiores ficam como
          metadado.
        </small>
        <input accept="application/pdf,image/*" capture="environment" multiple type="file" onChange={handleFiles} />
      </div>
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
              <button type="button" onClick={() => openAttachment(file)}>
                Abrir
              </button>
            ) : (
              <small title={`Reenvie um arquivo de até ${formatBytes(maxStoredFileSize)} para salvar a prévia.`}>
                Metadado
              </small>
            )}
            {file.dataUrl && (
              <button type="button" onClick={() => downloadAttachment(file)}>
                Baixar
              </button>
            )}
            {onRemove && (
              <button className="danger" type="button" onClick={() => onRemove(file.id)}>
                Remover
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function RoleWorkspace({ access, data, context, stats, currentUser, canNavigate, onNavigate }) {
  if (access.scope === "global") {
    const pending = (data.requisitions || []).filter((item) =>
      ["open", "in_review"].includes(item.status),
    );

    return (
      <section className="role-workspace executive-console">
        <div className="executive-main">
          <p className="eyebrow">Console do gestor</p>
          <h2>Mapa geral da operação</h2>
          <div className="executive-kpis">
            <Metric value={data.labs.length} label="Laboratórios" />
            <Metric value={stats.openExams} label="Exames ativos" tone="teal" />
            <Metric value={formatCurrency(stats.financialOpen)} label="Em aberto" tone="amber" />
            <Metric value={data.users.length} label="Usuários" tone="red" />
          </div>
          <div className="lab-command-table">
            {data.labs.map((lab) => {
              const labExams = data.exams.filter((exam) => exam.labId === lab.id);
              const labPending = labExams.filter((exam) => exam.status !== "signed").length;
              return (
                <button key={lab.id} type="button" onClick={() => onNavigate(labRoute(lab.id))}>
                  <span style={{ background: lab.color }} />
                  <strong>{lab.short}</strong>
                  <small>{lab.name}</small>
                  <b>{labPending} pend.</b>
                </button>
              );
            })}
          </div>
        </div>
        <div className="access-matrix">
          <p className="eyebrow">Usuários e RLS</p>
          {data.users.map((user) => (
            <article key={user.id}>
              <strong>{user.name}</strong>
              <span>{user.role}</span>
              <small>{user.labId || "todos"} {user.veterinarianId ? `· ${user.veterinarianId}` : ""}</small>
            </article>
          ))}
        </div>
        <div className="request-radar">
          <p className="eyebrow">Requisições críticas</p>
          {pending.length === 0 && <EmptyState text="Nenhuma requisição aberta." />}
          {pending.slice(0, 4).map((item) => (
            <article key={item.id}>
              <Badge value={item.priority} />
              <strong>{item.type}</strong>
              <small>{context.examProtocol(item.examId)} · {formatDate(item.dueAt)}</small>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (access.scope === "lab") {
    const columns = [
      { title: "Receber", items: data.exams.filter((exam) => !exam.receivedAt || exam.status === "requested") },
      { title: "Processar", items: data.exams.filter((exam) => exam.status === "processing") },
      { title: "Laudar", items: data.exams.filter((exam) => exam.status === "ready" || !exam.releasedAt) },
    ];

    return (
      <section className="role-workspace bench-kanban">
        <header>
          <p className="eyebrow">Coordenação de bancada</p>
          <h2>{currentUser?.labId || "Laboratório"} em fluxo operacional</h2>
          {canNavigate("requisitions") && (
            <button className="btn primary" type="button" onClick={() => onNavigate("requisitions")}>
              Ver requisições
            </button>
          )}
        </header>
        <div className="kanban-columns">
          {columns.map((column) => (
            <div key={column.title} className="kanban-column">
              <h3>{column.title}</h3>
              {column.items.slice(0, 4).map((exam) => (
                <article key={exam.id}>
                  <strong>{exam.protocol}</strong>
                  <small>{context.patientName(exam.patientId)} · {exam.type}</small>
                  <Badge value={exam.status} />
                </article>
              ))}
              {column.items.length === 0 && <EmptyState text="Sem itens nesta etapa." />}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (access.scope === "veterinarian") {
    return (
      <section className="role-workspace vet-cases">
        <div>
          <p className="eyebrow">Meus casos</p>
          <h2>Protocolos solicitados por {currentUser?.name}</h2>
          <div className="case-list">
            {data.exams.map((exam) => (
              <article key={exam.id}>
                <header>
                  <strong>{exam.protocol}</strong>
                  <Badge value={exam.status} />
                </header>
                <p>{context.patientName(exam.patientId)} · {context.patientTutor(exam.patientId)}</p>
                <small>{exam.type} · {exam.material || "sem material informado"}</small>
              </article>
            ))}
            {data.exams.length === 0 && <EmptyState text="Nenhum caso vinculado ao veterinário." />}
          </div>
        </div>
        <aside>
          <p className="eyebrow">Ações do solicitante</p>
          {canNavigate("requisitions") && (
            <button className="btn primary" type="button" onClick={() => onNavigate("requisitions")}>
              Solicitar ajuste
            </button>
          )}
          {canNavigate("reports") && (
            <button className="btn secondary" type="button" onClick={() => onNavigate("reports")}>
              Ver produção
            </button>
          )}
          <div className="vet-note">
            <strong>Sem financeiro</strong>
            <small>Valores, usuários e auditoria não aparecem para este perfil.</small>
          </div>
        </aside>
      </section>
    );
  }

  const sampleTasks = data.exams.filter((exam) => exam.status !== "signed");

  return (
    <section className="role-workspace student-bench">
      <div>
        <p className="eyebrow">Checklist da bancada</p>
        <h2>Conferência operacional do laboratório</h2>
        <div className="checklist-board">
          {sampleTasks.slice(0, 5).map((exam) => (
            <article key={exam.id}>
              <input type="checkbox" aria-label={`Conferir ${exam.protocol}`} />
              <div>
                <strong>{exam.protocol}</strong>
                <small>{exam.material || "Material não informado"} · {context.patientName(exam.patientId)}</small>
              </div>
              <Badge value={exam.sampleCondition || "pending"} />
            </article>
          ))}
          {sampleTasks.length === 0 && <EmptyState text="Bancada sem pendências." />}
        </div>
      </div>
      <aside>
        <p className="eyebrow">Permitido</p>
        <strong>Anexar imagens e abrir requisições</strong>
        <small>Alterações técnicas de laudo e financeiro ficam bloqueadas.</small>
        {canNavigate("requisitions") && (
          <button className="btn primary" type="button" onClick={() => onNavigate("requisitions")}>
            Nova requisição
          </button>
        )}
      </aside>
    </section>
  );
}

function DonutChart({ counts, context }) {
  const entries = Object.entries(counts).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const palette = ["#285a43", "#0b7a75", "#8a6418", "#9f332d", "#4e6c8a", "#6b5b95"];
  let cursor = 0;
  const slices = entries
    .map(([label, value], index) => {
      const start = cursor;
      const end = cursor + (value / Math.max(total, 1)) * 100;
      cursor = end;
      return `${palette[index % palette.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="donut-wrap">
      <div
        className="donut"
        style={{ background: total ? `conic-gradient(${slices})` : "var(--surface-soft)" }}
      >
        <span>{total}</span>
      </div>
      <div className="legend-list">
        {entries.length === 0 && <EmptyState text="Sem dados para o gráfico." />}
        {entries.map(([label, value], index) => (
          <div key={label}>
            <i style={{ background: palette[index % palette.length] }} />
            <span>{context.statusLabel(label)}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBars({ counts }) {
  const entries = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="mini-bars">
      {entries.length === 0 && <EmptyState text="Sem produção registrada." />}
      {entries.map(([label, value]) => (
        <div key={label}>
          <header>
            <span>{label}</span>
            <strong>{value}</strong>
          </header>
          <div>
            <span style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </div>
      ))}
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
        <Metric value={stats.openRequisitions} label="Requisições abertas" tone="teal" />
        <Metric value={stats.criticalStock} label="Alertas de estoque" tone="red" />
        <Metric value={`${stats.stockAverage}%`} label="Estoque médio" tone="teal" />
      </section>

      <section className="insight-grid">
        <Panel title="Status dos exames">
          <DonutChart counts={stats.statusCounts} context={context} />
        </Panel>
        <Panel title="Condição das amostras">
          <DonutChart counts={stats.sampleConditionCounts} context={context} />
        </Panel>
        <Panel title="Requisições por status">
          <MiniBars counts={stats.requisitionStatusCounts} />
        </Panel>
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
    ["active", "done", "signed", "confirmed", "adequate", "paid"].includes(value)
      ? "ok"
      : ["busy", "waiting", "processing", "pending", "high", "open", "partial"].includes(value)
        ? "warn"
        : ["canceled", "urgent", "inactive", "hemolyzed", "insufficient"].includes(value)
          ? "err"
          : "neutral";

  return <span className={`badge ${tone}`}>{statusLabels[value] || value}</span>;
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function RlsModuleBanner({ policy, visibleCount, filteredCount }) {
  return (
    <section className={`rls-module-card ${policy.tone}`}>
      <div>
        <p className="eyebrow">Página por perfil</p>
        <h3>{policy.title}</h3>
        <p>{policy.description}</p>
      </div>
      <dl>
        <div>
          <dt>Visíveis</dt>
          <dd>{visibleCount}</dd>
        </div>
        <div>
          <dt>Filtrados</dt>
          <dd>{filteredCount}</dd>
        </div>
        <div>
          <dt>Modo</dt>
          <dd>{policy.mode}</dd>
        </div>
      </dl>
      <ul>
        {policy.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}

function dashboardViewFor(access, user, stats) {
  const name = user?.name || "Usuário";

  if (access.scope === "global") {
    return {
      eyebrow: "Visão executiva",
      title: "Todos os laboratórios em uma fila única.",
      description:
        "Acompanhe produção, pendências, financeiro, auditoria e usuários com acesso total ao banco local.",
      actions: [
        { label: "Abrir protocolo", target: "exams" },
        { label: "Gerir usuários", target: "users" },
        { label: "Auditoria", target: "audit" },
      ],
      tiles: [
        { label: "Financeiro aberto", value: formatCurrency(stats.financialOpen), target: "reports" },
        { label: "Requisições", value: stats.openRequisitions, target: "requisitions" },
        { label: "Usuários ativos", value: stats.users || "-", target: "users" },
        { label: "Estoque crítico", value: stats.criticalStock, target: "inventory" },
      ],
      rules: [
        "Vê todos os laboratórios e todos os módulos.",
        "Pode cadastrar, editar, excluir e auditar registros.",
        "Vê financeiro e usuários.",
      ],
    };
  }

  if (access.scope === "lab") {
    return {
      eyebrow: "Coordenação do laboratório",
      title: "Sua bancada, seus exames e suas pendências.",
      description:
        "A página mostra apenas registros vinculados ao laboratório do coordenador, com gestão operacional completa desse setor.",
      actions: [
        { label: "Protocolos do setor", target: "exams" },
        { label: "Requisições do setor", target: "requisitions" },
        { label: "Estoque do setor", target: "inventory" },
      ],
      tiles: [
        { label: "Exames do lab", value: stats.openExams, target: "exams" },
        { label: "Requisições", value: stats.openRequisitions, target: "requisitions" },
        { label: "Insumos críticos", value: stats.criticalStock, target: "inventory" },
        { label: "Laudos pendentes", value: stats.reportsPending, target: "exams" },
      ],
      rules: [
        "Vê apenas registros do laboratório vinculado.",
        "Não acessa usuários nem auditoria global.",
        "Pode gerenciar exames, estoque e requisições do setor.",
      ],
    };
  }

  if (access.scope === "veterinarian") {
    return {
      eyebrow: "Minha fila clínica",
      title: `${name.split(" ")[0]}, seus protocolos solicitados estão aqui.`,
      description:
        "A página mostra pacientes, exames e requisições associados ao veterinário solicitante. Financeiro e auditoria ficam ocultos.",
      actions: [
        { label: "Meus exames", target: "exams" },
        { label: "Nova requisição", target: "requisitions" },
        { label: "Relatório dos meus casos", target: "reports" },
      ],
      tiles: [
        { label: "Meus protocolos", value: stats.openExams, target: "exams" },
        { label: "Laudos pendentes", value: stats.reportsPending, target: "exams" },
        { label: "Requisições abertas", value: stats.openRequisitions, target: "requisitions" },
        { label: "Anexos", value: stats.attachmentCount, target: "exams" },
      ],
      rules: [
        "Vê apenas exames solicitados por esse veterinário.",
        "Não vê financeiro, usuários, estoque global nem auditoria.",
        "Pode acompanhar laudos e abrir requisições dos próprios casos.",
      ],
    };
  }

  return {
    eyebrow: "Bancada operacional",
    title: "Fila do laboratório com edição limitada.",
    description:
      "A página mostra a rotina do laboratório do usuário com foco em conferência, anexos, pendências e requisições.",
    actions: [
      { label: "Conferir exames", target: "exams" },
      { label: "Abrir requisição", target: "requisitions" },
      { label: "Agenda do setor", target: "appointments" },
    ],
    tiles: [
      { label: "Amostras a conferir", value: stats.samplesPending, target: "exams" },
      { label: "Requisições", value: stats.openRequisitions, target: "requisitions" },
      { label: "Anexos", value: stats.attachmentCount, target: "exams" },
      { label: "Insumos críticos", value: stats.criticalStock, target: "inventory" },
    ],
    rules: [
      "Vê apenas a bancada do laboratório vinculado.",
      "Não vê financeiro, usuários, auditoria ou relatórios gerenciais.",
      "Pode registrar requisições e acompanhar pendências operacionais.",
    ],
  };
}

function modulePolicy(moduleKey, access, user) {
  const moduleNames = {
    tutors: "tutores",
    veterinarians: "veterinários",
    patients: "pacientes",
    exams: "exames e laudos",
    requisitions: "requisições",
    appointments: "agenda",
    inventory: "estoque",
    labs: "laboratórios",
    users: "usuários",
  };
  const readableModule = moduleNames[moduleKey] || "registros";
  const editAllowed = canEditRecord(moduleKey, access);
  const createAllowed = canCreateRecord(moduleKey, access);

  if (access.scope === "global") {
    return {
      tone: "manager",
      title: `Gestão completa de ${readableModule}`,
      description: `${user?.name || "Gestor"} acessa esta página sem filtro de laboratório ou solicitante.`,
      mode: "Completo",
      editLabel: "Editar",
      rules: [
        "Todos os registros do SQLite entram nesta página.",
        "Campos financeiros, auditoria e exclusão estão disponíveis quando o módulo permite.",
        "A busca consulta a base global.",
      ],
    };
  }

  if (access.scope === "lab") {
    return {
      tone: "lab",
      title: `${readableModule} do laboratório vinculado`,
      description: `Esta página foi recortada pelo laboratório do coordenador: ${user?.labId || "sem lab"}.`,
      mode: "Laboratório",
      editLabel: "Editar setor",
      rules: [
        "Só aparecem registros do laboratório vinculado ao usuário.",
        moduleKey === "users"
          ? "Usuários globais ficam ocultos para coordenação."
          : "Usuários e auditoria global ficam fora do menu.",
        createAllowed
          ? "Cadastro e edição permanecem liberados para a rotina do setor."
          : "Criação bloqueada para este perfil.",
      ],
    };
  }

  if (access.scope === "veterinarian") {
    return {
      tone: "vet",
      title: `${readableModule} vinculados ao veterinário`,
      description: `A página mostra apenas casos ligados a ${user?.name || "este veterinário"}.`,
      mode: "Solicitante",
      editLabel: "Acompanhar",
      rules: [
        "Exames são filtrados por veterinário solicitante.",
        "Financeiro, usuários, estoque global e auditoria ficam ocultos.",
        editAllowed
          ? "Edição permitida apenas nos módulos do próprio fluxo clínico."
          : "Edição bloqueada nesta página.",
      ],
    };
  }

  return {
    tone: "student",
    title: `${readableModule} em modo bancada`,
    description: `A página mostra a fila operacional do laboratório ${user?.labId || "vinculado"}.`,
    mode: "Limitado",
    editLabel: "Conferir",
    rules: [
      "Dados filtrados por laboratório, sem financeiro e sem auditoria.",
      moduleKey === "exams"
        ? "Campos de laudo técnico e financeiro são removidos do formulário."
        : "Ações administrativas ficam ocultas.",
      createAllowed
        ? "Criação liberada para requisições operacionais."
        : "Criação bloqueada; use requisições para solicitar alterações.",
    ],
  };
}

function canCreateRecord(moduleKey, access) {
  if (access.modules === "all") return true;
  if (access.scope === "lab") return !["labs"].includes(moduleKey);
  if (access.scope === "veterinarian") return ["exams", "requisitions", "appointments"].includes(moduleKey);
  if (access.scope === "lab-readonly") return ["requisitions"].includes(moduleKey);
  return false;
}

function canEditRecord(moduleKey, access) {
  if (access.modules === "all") return true;
  if (access.scope === "lab") return true;
  if (access.scope === "veterinarian") return ["patients", "exams", "requisitions", "appointments"].includes(moduleKey);
  if (access.scope === "lab-readonly") return ["exams", "requisitions"].includes(moduleKey);
  return false;
}

function makeAccess(user) {
  const role = user?.role || "Gestor Hub";
  const isManager = role === "Gestor Hub";
  const isCoordinator = role === "Coordenador";
  const isVeterinarian = role === "Professor / Veterinário";
  const isStudent = role === "Aluno / Estagiário";

  if (isManager) {
    return {
      role,
      scope: "global",
      scopeLabel: "Todos os laboratórios",
      description: "Gestão completa de cadastros, laudos, financeiro, usuários e auditoria.",
      canDelete: true,
      canSeeFinancial: true,
      canSeeAudit: true,
      canSeeUsers: true,
      canEditReports: true,
      modules: "all",
    };
  }

  if (isCoordinator) {
    return {
      role,
      scope: "lab",
      scopeLabel: "Laboratório vinculado",
      description: "Registros filtrados pelo laboratório do coordenador.",
      canDelete: true,
      canSeeFinancial: true,
      canSeeAudit: false,
      canSeeUsers: false,
      canEditReports: true,
      modules: ["dashboard", "patients", "exams", "requisitions", "appointments", "inventory", "labs", "reports"],
    };
  }

  if (isVeterinarian) {
    return {
      role,
      scope: "veterinarian",
      scopeLabel: "Solicitações próprias",
      description: "Exames e pacientes vinculados ao veterinário solicitante.",
      canDelete: false,
      canSeeFinancial: false,
      canSeeAudit: false,
      canSeeUsers: false,
      canEditReports: true,
      modules: ["dashboard", "patients", "exams", "requisitions", "appointments", "reports"],
    };
  }

  if (isStudent) {
    return {
      role,
      scope: "lab-readonly",
      scopeLabel: "Bancada do laboratório",
      description: "Consulta operacional do laboratório com edição limitada.",
      canDelete: false,
      canSeeFinancial: false,
      canSeeAudit: false,
      canSeeUsers: false,
      canEditReports: false,
      modules: ["dashboard", "patients", "exams", "requisitions", "appointments", "inventory"],
    };
  }

  return makeAccess({ role: "Gestor Hub" });
}

function canAccessModule(moduleId, access) {
  if (moduleId === "dashboard") return true;
  if (access.modules === "all") return true;
  if (moduleId === "audit") return access.canSeeAudit;
  if (moduleId === "users") return access.canSeeUsers;
  return Array.isArray(access.modules) && access.modules.includes(moduleId);
}

function applyRlsView(data, user) {
  const access = makeAccess(user);
  if (access.scope === "global") return data;

  const labId = user?.labId || "";
  const veterinarianId = user?.veterinarianId || "";
  const byLab = (item) => !labId || item.labId === labId;
  const byVet = (exam) =>
    !veterinarianId || exam.veterinarianId === veterinarianId || exam.requestedBy === user?.name;

  const exams =
    access.scope === "veterinarian"
      ? data.exams.filter(byVet)
      : data.exams.filter((exam) => byLab(exam) || exam.veterinarianId === veterinarianId);
  const examIds = new Set(exams.map((exam) => exam.id));
  const patientIds = new Set(exams.map((exam) => exam.patientId).filter(Boolean));
  const patients = data.patients.filter((patient) =>
    access.scope === "veterinarian"
      ? patientIds.has(patient.id)
      : patientIds.has(patient.id) || (labId && patient.labs?.includes(labId)),
  );
  const visiblePatientIds = new Set(patients.map((patient) => patient.id));
  const tutorIds = new Set(patients.map((patient) => patient.tutorId).filter(Boolean));
  const labIds = new Set([labId, ...exams.map((exam) => exam.labId)].filter(Boolean));

  return {
    ...data,
    labs: data.labs.filter((lab) => labIds.has(lab.id)),
    tutors: data.tutors.filter((tutor) => tutorIds.has(tutor.id)),
    veterinarians:
      access.scope === "veterinarian"
        ? data.veterinarians.filter((vet) => vet.id === veterinarianId)
        : data.veterinarians,
    patients,
    exams,
    appointments: data.appointments.filter((appointment) =>
      access.scope === "veterinarian"
        ? visiblePatientIds.has(appointment.patientId) || appointment.vet === user?.name
        : byLab(appointment) || visiblePatientIds.has(appointment.patientId),
    ),
    inventory: access.scope === "veterinarian" ? [] : data.inventory.filter(byLab),
    users:
      access.scope === "veterinarian"
        ? data.users.filter((item) => item.id === user?.id)
        : data.users.filter((item) => item.id === user?.id || (labId && item.labId === labId)),
    requisitions: (data.requisitions || []).filter(
      (request) =>
        request.requesterUserId === user?.id ||
        (labId && request.labId === labId) ||
        (request.examId && examIds.has(request.examId)),
    ),
    auditEvents: access.canSeeAudit ? data.auditEvents : [],
  };
}

function makeContext(data) {
  const labs = Object.fromEntries(data.labs.map((item) => [item.id, item]));
  const tutors = Object.fromEntries(data.tutors.map((item) => [item.id, item]));
  const patients = Object.fromEntries(data.patients.map((item) => [item.id, item]));
  const veterinarians = Object.fromEntries(data.veterinarians.map((item) => [item.id, item]));
  const users = Object.fromEntries(data.users.map((item) => [item.id, item]));
  const exams = Object.fromEntries(data.exams.map((item) => [item.id, item]));

  return {
    labName: (id) => labs[id]?.name || "Sem laboratório",
    labShort: (id) => labs[id]?.short || "N/D",
    tutorName: (id) => tutors[id]?.name || "Sem tutor",
    patientName: (id) => patients[id]?.name || "Sem paciente",
    patientTutor: (patientId) => tutors[patients[patientId]?.tutorId]?.name || "Sem tutor",
    veterinarianName: (id) => veterinarians[id]?.name || "",
    userName: (id) => users[id]?.name || "Sem solicitante",
    examProtocol: (id) => exams[id]?.protocol || "Sem exame",
    statusLabel: (value) => statusLabels[value] || value,
    labOptions: [
      { value: "", label: "Sem laboratório vinculado" },
      ...data.labs.map((lab) => ({ value: lab.id, label: lab.name })),
    ],
    requiredLabOptions: data.labs.map((lab) => ({ value: lab.id, label: lab.name })),
    tutorOptions: data.tutors.map((tutor) => ({ value: tutor.id, label: tutor.name })),
    veterinarianOptions: [
      { value: "", label: "Sem veterinário vinculado" },
      ...data.veterinarians.map((vet) => ({ value: vet.id, label: `${vet.name} - ${vet.crmv}` })),
    ],
    patientOptions: data.patients.map((patient) => ({
      value: patient.id,
      label: `${patient.name} - ${tutors[patient.tutorId]?.name || "Sem tutor"}`,
    })),
    userOptions: data.users.map((user) => ({ value: user.id, label: `${user.name} - ${user.role}` })),
    examOptions: [
      { value: "", label: "Sem exame vinculado" },
      ...data.exams.map((exam) => ({ value: exam.id, label: `${exam.protocol} - ${exam.type}` })),
    ],
  };
}

function makeStats(data) {
  const openExams = data.exams.filter((exam) =>
    ["requested", "processing", "ready"].includes(exam.status),
  ).length;
  const criticalStock = data.inventory.filter((item) => Number(item.qty) <= Number(item.min)).length;
  const todayAppointments = data.appointments.filter((item) => item.date === todayISO()).length;
  const samplesPending = data.exams.filter((exam) => !exam.receivedAt || exam.status === "requested").length;
  const reportsPending = data.exams.filter((exam) => !exam.releasedAt && exam.status !== "signed").length;
  const openRequisitions = (data.requisitions || []).filter((item) =>
    ["open", "in_review"].includes(item.status),
  ).length;
  const attachmentCount =
    data.patients.reduce((sum, patient) => sum + (patient.attachments?.length || 0), 0) +
    data.exams.reduce((sum, exam) => sum + (exam.attachments?.length || 0), 0);
  const financialOpen = data.exams
    .filter((exam) => exam.paymentStatus !== "paid")
    .reduce((sum, exam) => sum + Number(exam.price || 0), 0);
  const stockAverage = data.labs.length
    ? Math.round(data.labs.reduce((sum, lab) => sum + Number(lab.stock || 0), 0) / data.labs.length)
    : 0;

  return {
    patients: data.patients.length,
    tutors: data.tutors.length,
    veterinarians: data.veterinarians.length,
    openExams,
    criticalStock,
    todayAppointments,
    samplesPending,
    reportsPending,
    openRequisitions,
      attachmentCount,
      financialOpen,
      statusCounts: countBy(data.exams, "status"),
    examTypeCounts: countBy(data.exams, "type"),
    sampleConditionCounts: countBy(data.exams, "sampleCondition"),
    requisitionStatusCounts: countBy(data.requisitions || [], "status"),
    stockAverage,
    totalRecords:
      data.labs.length +
      data.tutors.length +
      data.veterinarians.length +
      data.patients.length +
      data.exams.length +
      data.appointments.length +
      (data.requisitions || []).length +
      data.inventory.length +
      data.users.length,
    users: data.users.length,
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "N/D";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function makeConfigs(data, context, { access, currentUser } = {}) {
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
  const sampleConditions = [
    { value: "pending", label: "Aguardando recebimento" },
    { value: "adequate", label: "Adequada" },
    { value: "hemolyzed", label: "Hemolisada" },
    { value: "insufficient", label: "Insuficiente" },
  ];
  const paymentStatuses = [
    { value: "open", label: "Aberto" },
    { value: "paid", label: "Pago" },
    { value: "partial", label: "Parcial" },
  ];
  const requisitionStatuses = [
    { value: "open", label: "Aberta" },
    { value: "in_review", label: "Em revisão" },
    { value: "approved", label: "Aprovada" },
    { value: "fulfilled", label: "Atendida" },
    { value: "rejected", label: "Recusada" },
  ];

  const configs = {
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
    veterinarians: {
      key: "veterinarians",
      prefix: "vet",
      title: "Veterinários",
      single: "Veterinário",
      action: "+ Novo veterinário",
      description: "Solicitantes e responsáveis técnicos com CRMV e espécies atendidas.",
      searchPlaceholder: "Buscar por nome, CRMV, telefone, e-mail ou espécie",
      empty: { name: "", crmv: "", phone: "", email: "", address: "", species: "" },
      titleOf: (record) => record.name,
      searchText: (record) => Object.values(record).join(" "),
      fields: [
        { name: "name", label: "Nome completo", required: true },
        { name: "crmv", label: "CRMV", required: true },
        { name: "phone", label: "Telefone" },
        { name: "email", label: "E-mail", type: "email" },
        { name: "species", label: "Espécies mais atendidas" },
        { name: "address", label: "Endereço", wide: true },
      ],
      columns: [
        { key: "name", label: "Veterinário", render: (record) => <strong>{record.name}</strong> },
        { key: "crmv", label: "CRMV", render: (record) => <span>{record.crmv}</span> },
        { key: "phone", label: "Contato", render: (record) => <span>{record.phone || "N/D"}</span> },
        { key: "species", label: "Espécies", render: (record) => <span>{record.species || "N/D"}</span> },
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
        age: "",
        sex: "Macho",
        coat: "",
        weight: "",
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
        {
          name: "sex",
          label: "Sexo",
          type: "select",
          options: [
            { value: "Macho", label: "Macho" },
            { value: "Fêmea", label: "Fêmea" },
            { value: "Não informado", label: "Não informado" },
          ],
        },
        { name: "coat", label: "Pelagem" },
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
        { key: "sex", label: "Sexo", render: (record) => <span>{record.sex || "N/D"}</span> },
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
      action: "+ Novo protocolo",
      description: "Cadastro da amostra, processamento, laudo, etiqueta QR e financeiro.",
      searchPlaceholder: "Buscar por protocolo, animal, tutor, exame, laboratório ou solicitante",
      empty: {
        protocol: makeProtocol(),
        patientId: data.patients[0]?.id || "",
        veterinarianId: data.veterinarians[0]?.id || "",
        labId: data.labs[0]?.id || "",
        type: "Histopatológico",
        requestedBy: "",
        status: "requested",
        priority: "normal",
        collectedAt: todayISO(),
        receivedAt: todayISO(),
        material: "",
        sampleCondition: "adequate",
        macroDescription: "",
        microDescription: "",
        diagnosis: "",
        comments: "",
        responsibleDoctor: "",
        releasedAt: "",
        price: "",
        paymentMethod: "",
        paymentStatus: "open",
        agreement: "",
        result: "",
        attachments: [],
      },
      filters: [...examStatuses, ...priorities, ...sampleConditions, ...paymentStatuses, ...labFilters],
      filterBy: (record, filter) =>
        record.status === filter ||
        record.priority === filter ||
        record.sampleCondition === filter ||
        record.paymentStatus === filter ||
        record.labId === filter,
      titleOf: (record, ctx) => `${record.protocol || record.type} - ${ctx.patientName(record.patientId)}`,
      searchText: (record, ctx) =>
        `${record.protocol} ${record.type} ${record.requestedBy} ${ctx.veterinarianName(record.veterinarianId)} ${ctx.patientName(record.patientId)} ${ctx.patientTutor(record.patientId)} ${ctx.labName(record.labId)} ${record.material} ${record.diagnosis}`,
      fields: [
        { name: "protocol", label: "Protocolo / OS", required: true },
        { name: "patientId", label: "Paciente", type: "select", options: context.patientOptions },
        { name: "veterinarianId", label: "Veterinário solicitante", type: "select", options: context.veterinarianOptions },
        { name: "labId", label: "Laboratório", type: "select", options: context.requiredLabOptions },
        {
          name: "type",
          label: "Tipo de exame",
          type: "select",
          options: [
            { value: "Histopatológico", label: "Histopatológico" },
            { value: "Citológico", label: "Citológico" },
            { value: "Necropsia", label: "Necropsia" },
            { value: "PCR", label: "PCR" },
            { value: "Bioquímico", label: "Bioquímico" },
            { value: "Hemograma Completo", label: "Hemograma Completo" },
            { value: "Coproparasitológico", label: "Coproparasitológico" },
            { value: "Cultura Bacteriana", label: "Cultura Bacteriana" },
          ],
        },
        { name: "requestedBy", label: "Solicitante livre" },
        { name: "status", label: "Status", type: "select", options: examStatuses },
        { name: "priority", label: "Prioridade", type: "select", options: priorities },
        { name: "collectedAt", label: "Data da coleta", type: "date" },
        { name: "receivedAt", label: "Data de recebimento", type: "date" },
        { name: "material", label: "Material recebido" },
        { name: "sampleCondition", label: "Condição da amostra", type: "select", options: sampleConditions },
        { name: "macroDescription", label: "Descrição macroscópica", type: "textarea", wide: true },
        { name: "microDescription", label: "Descrição microscópica", type: "textarea", wide: true },
        { name: "diagnosis", label: "Diagnóstico conclusivo", type: "textarea", wide: true },
        { name: "comments", label: "Comentários / recomendações", type: "textarea", wide: true },
        { name: "responsibleDoctor", label: "Médico responsável pelo laudo" },
        { name: "releasedAt", label: "Data de liberação", type: "date" },
        { name: "price", label: "Preço do exame", type: "number", min: 0, step: "0.01" },
        { name: "paymentMethod", label: "Forma de pagamento" },
        { name: "paymentStatus", label: "Status financeiro", type: "select", options: paymentStatuses },
        { name: "agreement", label: "Convênio / plano" },
        { name: "attachments", label: "PDFs e imagens do exame", type: "files" },
        { name: "result", label: "Resumo do resultado ou andamento", type: "textarea", wide: true },
      ],
      columns: [
        { key: "protocol", label: "Protocolo", render: (record) => <strong>{record.protocol || record.id}</strong> },
        { key: "type", label: "Exame", render: (record) => <span>{record.type}</span> },
        { key: "patient", label: "Paciente", render: (record, ctx) => <span>{ctx.patientName(record.patientId)}</span> },
        { key: "tutor", label: "Tutor", render: (record, ctx) => <span>{ctx.patientTutor(record.patientId)}</span> },
        { key: "lab", label: "Laboratório", render: (record, ctx) => <span>{ctx.labShort(record.labId)}</span> },
        { key: "receivedAt", label: "Recebimento", render: (record) => <span>{formatDate(record.receivedAt)}</span> },
        { key: "sampleCondition", label: "Amostra", render: (record) => <Badge value={record.sampleCondition} /> },
        { key: "paymentStatus", label: "Financeiro", render: (record) => <Badge value={record.paymentStatus} /> },
        { key: "status", label: "Status", render: (record) => <Badge value={record.status} /> },
      ],
    },
    requisitions: {
      key: "requisitions",
      prefix: "req",
      title: "Requisições",
      single: "Requisição",
      action: "+ Nova requisição",
      description: "Pedidos internos de recoleta, insumo, revisão de laudo e suporte de bancada.",
      searchPlaceholder: "Buscar por tipo, protocolo, paciente, solicitante ou descrição",
      empty: {
        requesterUserId: currentUser?.id || data.users[0]?.id || "",
        labId: currentUser?.labId || data.labs[0]?.id || "",
        patientId: data.patients[0]?.id || "",
        examId: data.exams[0]?.id || "",
        type: "Recoleta",
        priority: "normal",
        status: "open",
        dueAt: todayISO(),
        description: "",
        response: "",
      },
      filters: [...requisitionStatuses, ...priorities, ...labFilters],
      filterBy: (record, filter) =>
        record.status === filter || record.priority === filter || record.labId === filter,
      titleOf: (record, ctx) => `${record.type} - ${ctx.examProtocol(record.examId)}`,
      searchText: (record, ctx) =>
        `${record.type} ${record.description} ${record.response} ${ctx.examProtocol(record.examId)} ${ctx.patientName(record.patientId)} ${ctx.userName(record.requesterUserId)} ${ctx.labName(record.labId)}`,
      fields: [
        { name: "requesterUserId", label: "Solicitante", type: "select", options: context.userOptions },
        { name: "labId", label: "Laboratório", type: "select", options: context.requiredLabOptions },
        { name: "patientId", label: "Paciente", type: "select", options: context.patientOptions },
        { name: "examId", label: "Exame vinculado", type: "select", options: context.examOptions },
        {
          name: "type",
          label: "Tipo",
          type: "select",
          options: [
            { value: "Recoleta", label: "Recoleta" },
            { value: "Insumo", label: "Insumo" },
            { value: "Revisão de laudo", label: "Revisão de laudo" },
            { value: "Amostra externa", label: "Amostra externa" },
            { value: "Suporte", label: "Suporte" },
          ],
        },
        { name: "priority", label: "Prioridade", type: "select", options: priorities },
        { name: "status", label: "Status", type: "select", options: requisitionStatuses },
        { name: "dueAt", label: "Prazo", type: "date" },
        { name: "description", label: "Pedido", type: "textarea", wide: true },
        { name: "response", label: "Resposta / encaminhamento", type: "textarea", wide: true },
      ],
      columns: [
        { key: "type", label: "Tipo", render: (record) => <strong>{record.type}</strong> },
        { key: "exam", label: "Protocolo", render: (record, ctx) => <span>{ctx.examProtocol(record.examId)}</span> },
        { key: "patient", label: "Paciente", render: (record, ctx) => <span>{ctx.patientName(record.patientId)}</span> },
        { key: "requester", label: "Solicitante", render: (record, ctx) => <span>{ctx.userName(record.requesterUserId)}</span> },
        { key: "dueAt", label: "Prazo", render: (record) => <span>{formatDate(record.dueAt)}</span> },
        { key: "priority", label: "Prioridade", render: (record) => <Badge value={record.priority} /> },
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
        veterinarianId: "",
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
        { name: "veterinarianId", label: "Veterinário vinculado", type: "select", options: context.veterinarianOptions },
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
        { key: "vet", label: "RLS", render: (record, ctx) => <span>{ctx.veterinarianName(record.veterinarianId) || "Por laboratório"}</span> },
        { key: "status", label: "Status", render: (record) => <Badge value={record.status} /> },
      ],
    },
  };

  if (!access?.canSeeFinancial) {
    const financialFields = new Set(["price", "paymentMethod", "paymentStatus", "agreement"]);
    const financialColumns = new Set(["paymentStatus"]);
    configs.exams.fields = configs.exams.fields.filter((field) => !financialFields.has(field.name));
    configs.exams.columns = configs.exams.columns.filter((column) => !financialColumns.has(column.key));
  }

  if (!access?.canEditReports) {
    const reportFields = new Set([
      "macroDescription",
      "microDescription",
      "diagnosis",
      "comments",
      "responsibleDoctor",
      "releasedAt",
    ]);
    configs.exams.fields = configs.exams.fields.filter((field) => !reportFields.has(field.name));
  }

  return configs;
}

function normalizeValues(fields, values) {
  return fields.reduce((acc, field) => {
    const value = values[field.name];

    if (field.type === "number") {
      acc[field.name] = value === "" || value === null || value === undefined ? "" : Number(value);
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

function openAttachment(file) {
  if (!file?.dataUrl) {
    window.alert(`O arquivo "${file?.name || "selecionado"}" foi salvo apenas como metadado. Reenvie em até ${formatBytes(maxStoredFileSize)}.`);
    return;
  }

  const url = URL.createObjectURL(dataUrlToBlob(file.dataUrl));
  const opened = window.open(url, "_blank");
  if (!opened) {
    downloadUrl(url, file.name || "arquivo");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadAttachment(file) {
  if (!file?.dataUrl) {
    window.alert(`O arquivo "${file?.name || "selecionado"}" foi salvo apenas como metadado. Reenvie em até ${formatBytes(maxStoredFileSize)}.`);
    return;
  }

  const url = URL.createObjectURL(dataUrlToBlob(file.dataUrl));
  downloadUrl(url, file.name || "arquivo");
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

function downloadUrl(url, name) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function dataUrlToBlob(dataUrl) {
  const [metadata = "", payload = ""] = dataUrl.split(",");
  const type = metadata.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = window.atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type });
}

function printDocument(title, body, kind) {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    window.alert("Permita pop-ups para gerar a impressão.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f7f7f2;
            color: #151815;
            font-family: Arial, sans-serif;
          }
          main {
            display: grid;
            gap: 16px;
            padding: 20px;
          }
          .label {
            width: 92mm;
            min-height: 36mm;
            display: grid;
            grid-template-columns: 30mm 1fr;
            gap: 10px;
            align-items: center;
            break-inside: avoid;
            border: 1px solid #111;
            border-radius: 6px;
            background: #fff;
            padding: 8px;
          }
          .qr svg {
            width: 28mm;
            height: 28mm;
            display: block;
          }
          .label h2,
          .label p,
          .label small {
            margin: 0;
          }
          .label h2 {
            font-size: 16px;
          }
          .label p {
            margin-top: 2px;
            font-size: 11px;
          }
          .label small,
          .report small {
            color: #59625a;
            font-weight: 700;
            text-transform: uppercase;
          }
          .report {
            break-after: page;
            border: 1px solid #d7ded3;
            border-radius: 8px;
            background: #fff;
            padding: 28px;
          }
          .report header,
          .report footer,
          .report dl {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .report header {
            align-items: start;
            border-bottom: 1px solid #d7ded3;
            padding-bottom: 16px;
          }
          .report h1,
          .report h2,
          .report p,
          .report dl {
            margin: 0;
          }
          .report h1 {
            font-size: 28px;
          }
          .report h2 {
            margin-top: 18px;
            font-size: 16px;
          }
          .report p,
          .report dd {
            line-height: 1.5;
          }
          .report dt {
            color: #59625a;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .report dd {
            margin: 2px 0 0;
          }
          .report footer {
            margin-top: 28px;
            border-top: 1px solid #d7ded3;
            padding-top: 16px;
          }
          @media print {
            body { background: #fff; }
            main { padding: 0; }
            ${kind === "labels" ? "@page { size: auto; margin: 8mm; }" : "@page { size: A4; margin: 14mm; }"}
          }
        </style>
      </head>
      <body>
        <main>${body}</main>
        <script>window.setTimeout(() => window.print(), 250);</script>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function userInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
