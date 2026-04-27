import { useState } from "react";
import Modal from "../components/Modal";

const CAMPOS = [
  { key: "nome", label: "Nome", required: true },
  { key: "crmv", label: "CRMV" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "endereco", label: "Endereço" },
  { key: "especies", label: "Espécies atendidas" },
];

export default function Solicitantes({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const filtrados = data.solicitantes.filter((s) =>
    !busca || s.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const reg = isNovo
        ? { ...form, id: makeId("sol"), criadoEm: new Date().toISOString() }
        : cur.solicitantes.map((s) => s.id === form.id ? { ...s, ...form, atualizadoEm: new Date().toISOString() } : s).find((s) => s.id === form.id);

      const novos = isNovo
        ? [...cur.solicitantes, reg]
        : cur.solicitantes.map((s) => s.id === form.id ? { ...s, ...form, atualizadoEm: new Date().toISOString() } : s);

      return registrarAuditoria({ ...cur, solicitantes: novos }, "Solicitantes", `${isNovo ? "Novo" : "Atualizado"} solicitante: ${form.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const s = data.solicitantes.find((s) => s.id === id);
    if (!confirm(`Remover ${s?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, solicitantes: cur.solicitantes.filter((s) => s.id !== id) },
      "Solicitantes", `Solicitante removido: ${s?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Solicitantes</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo</button>
      </div>
      <input className="search-input" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <table className="table">
        <thead><tr><th>Nome</th><th>CRMV</th><th>Telefone</th><th>E-mail</th><th></th></tr></thead>
        <tbody>
          {filtrados.map((s) => (
            <tr key={s.id}>
              <td>{s.nome}</td><td>{s.crmv}</td><td>{s.telefone}</td><td>{s.email}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setEditando(s)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(s.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editando !== null && (
        <Modal title={editando.id ? "Editar Solicitante" : "Novo Solicitante"} onClose={() => setEditando(null)} wide>
          <CrudForm campos={CAMPOS} inicial={editando} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  );
}

function CrudForm({ campos, inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState({ ...inicial });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="form-grid">
        {campos.map(({ key, label }) => (
          <label key={key} className="form-field">
            {label}
            <input value={form[key] || ""} onChange={set(key)} />
          </label>
        ))}
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </>
  );
}
