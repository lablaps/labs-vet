import StatusBadge from "../components/StatusBadge";
import { statusLabels } from "../data";

export default function Dashboard({ data }) {
  const { amostras, laudos, estoque, auditoria } = data;

  const pendentes = amostras.filter((a) => ["recebida", "em_analise"].includes(a.status));
  const semLaudo = amostras.filter(
    (a) => !["laudo_liberado", "entregue"].includes(a.status) && !laudos.find((l) => l.amostraId === a.id),
  );
  const laudosRedigidos = amostras.filter((a) => a.status === "laudo_redigido");
  const estoqueCritico = estoque.filter((e) => e.quantidade < e.qtdMinima);

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>

      <div className="stats-grid">
        <StatCard label="Amostras pendentes" value={pendentes.length} color="#D97706" />
        <StatCard label="Sem laudo" value={semLaudo.length} color="#DC2626" />
        <StatCard label="Laudos aguardando liberação" value={laudosRedigidos.length} color="#2563EB" />
        <StatCard label="Estoque crítico" value={estoqueCritico.length} color="#DC2626" />
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2 className="section-title">Amostras em andamento</h2>
          {pendentes.length === 0 ? (
            <p className="empty-text">Nenhuma amostra pendente.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Protocolo</th><th>Tipo</th><th>Prioridade</th><th>Status</th></tr>
              </thead>
              <tbody>
                {pendentes.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.protocolo}</td>
                    <td>{a.tipoExame}</td>
                    <td><StatusBadge value={a.prioridade} label={statusLabels[a.prioridade]} /></td>
                    <td><StatusBadge value={a.status} label={statusLabels[a.status]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {estoqueCritico.length > 0 && (
          <section className="dashboard-section">
            <h2 className="section-title">⚠ Estoque crítico</h2>
            <table className="table">
              <thead>
                <tr><th>Item</th><th>Categoria</th><th>Qtd atual</th><th>Mínimo</th></tr>
              </thead>
              <tbody>
                {estoqueCritico.map((e) => (
                  <tr key={e.id} className="row-alert">
                    <td>{e.nome}</td>
                    <td>{e.categoria}</td>
                    <td className="text-danger">{e.quantidade}</td>
                    <td>{e.qtdMinima}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="dashboard-section">
          <h2 className="section-title">Últimas ações</h2>
          <ul className="audit-list">
            {auditoria.slice(0, 8).map((a) => (
              <li key={a.id} className="audit-item">
                <span className="audit-acao">{a.acao}</span>
                <span className="audit-meta">{a.ator} · {new Date(a.registradoEm).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <span className="stat-value" style={{ color }}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
