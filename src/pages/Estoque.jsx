import { useState } from "react";
import Modal from "../components/Modal";

export default function Estoque({ data, setData, makeId, registrarAuditoria }) {
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const filtrados = data.estoque.filter((e) =>
    !busca || e.nome.toLowerCase().includes(busca.toLowerCase()) || e.categoria.toLowerCase().includes(busca.toLowerCase()),
  );

  function salvar(form) {
    setData((cur) => {
      const isNovo = !form.id;
      const reg = {
        ...form,
        quantidade: Number(form.quantidade || 0),
        qtdMinima: Number(form.qtdMinima || 0),
        qtdMaxima: Number(form.qtdMaxima || 0),
        restrito: Boolean(form.restrito),
      };
      const novos = isNovo
        ? [...cur.estoque, { ...reg, id: makeId("est"), criadoEm: new Date().toISOString() }]
        : cur.estoque.map((e) => e.id === reg.id ? { ...e, ...reg, atualizadoEm: new Date().toISOString() } : e);
      return registrarAuditoria({ ...cur, estoque: novos }, "Estoque", `${isNovo ? "Novo item" : "Item atualizado"}: ${reg.nome}`);
    });
    setEditando(null);
  }

  function remover(id) {
    const e = data.estoque.find((e) => e.id === id);
    if (!confirm(`Remover ${e?.nome}?`)) return;
    setData((cur) => registrarAuditoria(
      { ...cur, estoque: cur.estoque.filter((e) => e.id !== id) },
      "Estoque", `Item removido: ${e?.nome}`,
    ));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Estoque</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Novo item</button>
      </div>
      <input className="search-input" placeholder="Buscar por nome ou categoria..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <table className="table">
        <thead>
          <tr><th>Nome</th><th>Categoria</th><th>Qtd</th><th>Mín.</th><th>Validade</th><th>Restrito</th><th></th></tr>
        </thead>
        <tbody>
          {filtrados.map((e) => {
            const critico = e.quantidade < e.qtdMinima;
            return (
              <tr key={e.id} className={critico ? "row-alert" : ""}>
                <td>{e.nome}</td>
                <td>{e.categoria}</td>
                <td className={critico ? "text-danger" : ""}>{e.quantidade}</td>
                <td>{e.qtdMinima}</td>
                <td>{e.validade || "—"}</td>
                <td>{e.restrito ? "Sim" : "Não"}</td>
                <td className="row-actions">
                  <button className="btn-sm" onClick={() => setEditando(e)}>Editar</button>
                  <button className="btn-sm btn-danger" onClick={() => remover(e.id)}>Rem.</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editando !== null && (
        <Modal title={editando.id ? "Editar Item" : "Novo Item"} onClose={() => setEditando(null)} wide>
          <EstoqueForm form={editando} onChange={setEditando} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
    </div>
  );
}

function EstoqueForm({ form, onChange, onSalvar, onCancelar }) {
  const set = (k) => (e) => onChange((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  return (
    <>
      <div className="form-grid">
        <label className="form-field"><span>Nome</span><input value={form.nome || ""} onChange={set("nome")} /></label>
        <label className="form-field"><span>Categoria</span><input value={form.categoria || ""} onChange={set("categoria")} placeholder="Fixador, Reagente..." /></label>
        <label className="form-field"><span>Quantidade</span><input type="number" min="0" value={form.quantidade ?? ""} onChange={set("quantidade")} /></label>
        <label className="form-field"><span>Qtd. mínima</span><input type="number" min="0" value={form.qtdMinima ?? ""} onChange={set("qtdMinima")} /></label>
        <label className="form-field"><span>Qtd. máxima</span><input type="number" min="0" value={form.qtdMaxima ?? ""} onChange={set("qtdMaxima")} /></label>
        <label className="form-field"><span>Validade</span><input type="date" value={form.validade || ""} onChange={set("validade")} /></label>
        <label className="form-field form-field--checkbox">
          <input type="checkbox" checked={Boolean(form.restrito)} onChange={set("restrito")} />
          <span>Produto restrito</span>
        </label>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </>
  );
}
