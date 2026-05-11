export default function Nav({ items = [], active, onNavigate, currentUser, onLogout, isOpen, onClose }) {
  const sections = [...new Set(items.map((i) => i.section))];

  function handleNavigate(id) {
    onNavigate?.(id);
    onClose?.(); // fecha sidebar no mobile após navegar
  }

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <nav className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">LaPaVe</span>
          <span className="sidebar-sub">UEMA — Patologia Veterinária</span>
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
                    onClick={() => handleNavigate(item.id)}
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
    </>
  );
}
