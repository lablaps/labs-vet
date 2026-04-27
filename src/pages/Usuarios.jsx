import { useState } from "react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { statusLabels } from "../data";

const PERFIS = ["professor", "coordenador", "aluno"];

export default function Usuarios({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const novos = isNovo
        ? [...cur.usuarios, { ...form, id: makeId("usr"), criadoEm: new Date().toISOString() }]
        : cur.usuarios.map((u) => u.id === form.id ? { ...u, ...form, atualizadoEm: new Date().toISOString() } : u);
      return registrarAuditoria({ ...cur, usuarios: novos }, "Usuários", `${isNovo ? "Novo" : "Atualizado"} usuário: ${form.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const u = data.usuarios.find((u) => u.id === id);
    if (!confirm(`Remover ${u?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, usuarios: cur.usuarios.filter((u) => u.id !== id) },
      "Usuários", `Usuário removido: ${u?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Usuários</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo usuário</button>
      </div>
      <table className="table">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {data.usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nome}</td><td>{u.email}</td>
              <td><StatusBadge value={u.perfil} label={statusLabels[u.perfil]} /></td>
              <td><StatusBadge value={u.status} label={statusLabels[u.status]} /></td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setEditando(u)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(u.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editando !== null && (
        <Modal title={editando.id ? "Editar Usuário" : "Novo Usuário"} onClose={() => setEditando(null)}>
          <UsuarioForm form={editando} onChange={setEditando} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  );
}

function UsuarioForm({ form, onChange, onSalvar, onCancelar }) {
  const set = (k) => (e) => onChange((f) => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="form-grid">
        <label className="form-field"><span>Nome</span><input value={form.nome || ""} onChange={set("nome")} /></label>
        <label className="form-field"><span>E-mail</span><input type="email" value={form.email || ""} onChange={set("email")} /></label>
        <label className="form-field">
          <span>Perfil</span>
          <select value={form.perfil || "aluno"} onChange={set("perfil")}>
            {PERFIS.map((p) => <option key={p} value={p}>{statusLabels[p] || p}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select value={form.status || "ativo"} onChange={set("status")}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </>
  );
}
