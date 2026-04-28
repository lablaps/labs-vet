import { useState } from "react";
import Modal from "../components/Modal";

export default function Pacientes({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const { pacientes, tutores } = data;
  const nomeTutor = (id) => tutores.find((t) => t.id === id)?.nome || "—";

  const filtrados = pacientes.filter((p) =>
    !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || nomeTutor(p.tutorId).toLowerCase().includes(busca.toLowerCase()),
  );

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const novos = isNovo
        ? [...cur.pacientes, { ...form, id: makeId("pac"), criadoEm: new Date().toISOString() }]
        : cur.pacientes.map((p) => p.id === form.id ? { ...p, ...form, atualizadoEm: new Date().toISOString() } : p);
      return registrarAuditoria({ ...cur, pacientes: novos }, "Pacientes", `${isNovo ? "Novo" : "Atualizado"} paciente: ${form.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const p = pacientes.find((p) => p.id === id);
    if (!confirm(`Remover ${p?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, pacientes: cur.pacientes.filter((p) => p.id !== id) },
      "Pacientes", `Paciente removido: ${p?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Pacientes</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo</button>
      </div>
      <input className="search-input" placeholder="Buscar por nome ou tutor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <table className="table">
        <thead><tr><th>Nome</th><th>Espécie</th><th>Raça</th><th>Sexo</th><th>Tutor</th><th></th></tr></thead>
        <tbody>
          {filtrados.map((p) => (
            <tr key={p.id}>
              <td>{p.nome}</td><td>{p.especie}</td><td>{p.raca}</td><td>{p.sexo}</td>
              <td>{nomeTutor(p.tutorId)}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setEditando(p)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(p.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editando !== null && (
        <Modal title={editando.id ? "Editar Paciente" : "Novo Paciente"} onClose={() => setEditando(null)} wide>
          <PacienteForm form={editando} tutores={tutores} onChange={setEditando} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  );
}

function PacienteForm({ form, tutores, onChange, onSalvar, onCancelar }) {
  const set = (k) => (e) => onChange((f) => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="form-grid">
        <label className="form-field"><span>Nome</span><input value={form.nome || ""} onChange={set("nome")} /></label>
        <label className="form-field"><span>Espécie</span><input value={form.especie || ""} onChange={set("especie")} placeholder="Canino, Felino..." /></label>
        <label className="form-field"><span>Raça</span><input value={form.raca || ""} onChange={set("raca")} /></label>
        <label className="form-field"><span>Idade</span><input value={form.idade || ""} onChange={set("idade")} /></label>
        <label className="form-field">
          <span>Sexo</span>
          <select value={form.sexo || ""} onChange={set("sexo")}>
            <option value="">—</option>
            <option value="Macho">Macho</option>
            <option value="Fêmea">Fêmea</option>
          </select>
        </label>
        <label className="form-field"><span>Pelagem</span><input value={form.pelagem || ""} onChange={set("pelagem")} /></label>
        <label className="form-field"><span>Peso</span><input value={form.peso || ""} onChange={set("peso")} placeholder="Ex: 12 kg" /></label>
        <label className="form-field">
          <span>Tutor</span>
          <select value={form.tutorId || ""} onChange={set("tutorId")}>
            <option value="">— selecione —</option>
            {tutores.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
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
