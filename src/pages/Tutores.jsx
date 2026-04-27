import { useState } from "react";
import Modal from "../components/Modal";

const CAMPOS = [
  { key: "nome", label: "Nome", required: true },
  { key: "cpf", label: "CPF" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "cidade", label: "Cidade" },
  { key: "endereco", label: "Endereço" },
];

export default function Tutores({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const filtrados = data.tutores.filter((t) =>
    !busca || t.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const novos = isNovo
        ? [...cur.tutores, { ...form, id: makeId("tut"), criadoEm: new Date().toISOString() }]
        : cur.tutores.map((t) => t.id === form.id ? { ...t, ...form, atualizadoEm: new Date().toISOString() } : t);
      return registrarAuditoria({ ...cur, tutores: novos }, "Tutores", `${isNovo ? "Novo" : "Atualizado"} tutor: ${form.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const t = data.tutores.find((t) => t.id === id);
    if (!confirm(`Remover ${t?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, tutores: cur.tutores.filter((t) => t.id !== id) },
      "Tutores", `Tutor removido: ${t?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Tutores</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo</button>
      </div>
      <input className="search-input" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <table className="table">
        <thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Cidade</th><th></th></tr></thead>
        <tbody>
          {filtrados.map((t) => (
            <tr key={t.id}>
              <td>{t.nome}</td><td>{t.cpf}</td><td>{t.telefone}</td><td>{t.cidade}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setEditando(t)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(t.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editando !== null && (
        <Modal title={editando.id ? "Editar Tutor" : "Novo Tutor"} onClose={() => setEditando(null)} wide>
          <div className="form-grid">
            {CAMPOS.map(({ key, label }) => (
              <label key={key} className="form-field">
                {label}
                <input value={editando[key] || ""} onChange={(e) => setEditando((f) => ({ ...f, [key]: e.target.value }))} />
              </label>
            ))}
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
            <button className="btn-primary" onClick={() => salvar(editando)}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
