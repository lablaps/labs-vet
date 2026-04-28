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

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
      <LoginScreen
        usuarios={data.usuarios}
        onLogin={(userId) => { setCurrentUserId(userId); setScreen("app"); }}
      />
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

function LoginScreen({ usuarios, onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    try {
      const hash = await sha256(senha);
      const user = usuarios.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.senha === hash && u.status === "ativo",
      );
      if (user) {
        onLogin(user.id);
      } else {
        setErro("E-mail ou senha incorretos.");
      }
    } catch {
      setErro("Erro ao verificar credenciais. Tente novamente.");
    }
    setCarregando(false);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo-area">
          <h1 className="login-title">LaPaVe</h1>
          <p className="login-sub">Laboratório de Patologia Veterinária — UEMA</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} autoComplete="on">
          <label className="form-field">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@uema.br"
              autoComplete="username"
              required
            />
          </label>

          <label className="form-field">
            Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {erro && <p className="login-erro">{erro}</p>}

          <button type="submit" className="btn-primary login-btn" disabled={carregando}>
            {carregando ? "Verificando..." : "Entrar"}
          </button>
        </form>

        <p className="login-version">LaPaVe — UEMA · {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
