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
  return `LAPAVE-${hoje}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
};

const makeRC = (amostras) => {
  const year = new Date().getFullYear();
  const thisYear = (amostras || []).filter((a) => a.rc && a.rc.endsWith(`/${year}`));
  const maxNum = thisYear.reduce((max, a) => {
    const match = a.rc.match(/RC-(\d+)\//);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);
  return `RC-${String(maxNum + 1).padStart(4, "0")}/${year}`;
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
  const [data, setData, persistState] = usePersistentState(STORAGE_KEY, createInitialData());
  const [screen, setScreen] = useState("login");
  const [active, setActive] = useState("dashboard");
  const [currentUserId, setCurrentUserId] = useState("");

  const currentUser = useMemo(
    () => data.usuarios.find((u) => u.id === currentUserId) ?? data.usuarios[0] ?? null,
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
          <h1 className="login-title">LaPaVe</h1>
          <p className="login-sub">Laboratório de Patologia Veterinária — UEMA</p>
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
    makeRC,
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
        {persistState.source === "browser" && (
          <div className="offline-banner">Modo offline — dados salvos localmente</div>
        )}
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
