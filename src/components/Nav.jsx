export default function Nav({ items = [], active, onNavigate, currentUser, onLogout }) {
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
                  onClick={() => onNavigate?.(item.id)}
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
