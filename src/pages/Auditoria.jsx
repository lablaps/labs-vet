export default function Auditoria({ data }) {
  return (
    <div className="page">
      <h1 className="page-title">Auditoria</h1>
      <table className="table">
        <thead>
          <tr><th>Data/hora</th><th>Módulo</th><th>Ação</th><th>Ator</th></tr>
        </thead>
        <tbody>
          {data.auditoria.map((a) => (
            <tr key={a.id}>
              <td className="mono">{new Date(a.registradoEm).toLocaleString("pt-BR")}</td>
              <td>{a.entidade}</td>
              <td>{a.acao}</td>
              <td>{a.ator}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.auditoria.length === 0 && <p className="empty-text">Nenhum registro ainda.</p>}
    </div>
  );
}
