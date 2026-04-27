import { useState, useMemo } from "react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { statusLabels } from "../data";
import { createQrSvg } from "../qr";

const STATUS_FLOW = ["recebida", "em_analise", "laudo_redigido", "laudo_liberado", "entregue"];
const CONDICOES = ["adequada", "hemolisada", "insuficiente"];
const PRIORIDADES = ["normal", "alta", "urgente"];

export default function Amostras({ data, setData, currentUser, makeId, makeProtocolo, registrarAuditoria }) {
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [qrAmostra, setQrAmostra] = useState(null);

  const { amostras, pacientes, solicitantes } = data;

  const nomePaciente = (id) => pacientes.find((p) => p.id === id)?.nome || "—";
  const nomeSolicitante = (id) => solicitantes.find((s) => s.id === id)?.nome || "—";

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase();
    if (!q) return amostras;
    return amostras.filter(
      (a) =>
        a.protocolo.toLowerCase().includes(q) ||
        nomePaciente(a.pacienteId).toLowerCase().includes(q) ||
        nomeSolicitante(a.solicitanteId).toLowerCase().includes(q) ||
        a.tipoExame.toLowerCase().includes(q),
    );
  }, [amostras, busca, pacientes, solicitantes]);

  function salvar(values) {
    setData((cur) => {
      const isNova = !values.id;
      const registro = isNova
        ? { ...values, id: makeId("amo"), protocolo: makeProtocolo(), criadoEm: new Date().toISOString() }
        : { ...cur.amostras.find((a) => a.id === values.id), ...values, atualizadoEm: new Date().toISOString() };

      const novas = isNova
        ? [registro, ...cur.amostras]
        : cur.amostras.map((a) => (a.id === registro.id ? registro : a));

      return registrarAuditoria(
        { ...cur, amostras: novas },
        "Amostras",
        `${isNova ? "Nova amostra" : "Amostra atualizada"}: ${registro.protocolo}`,
      );
    });
    setEditando(null);
  }

  function remover(id) {
    if (!confirm("Remover esta amostra?")) return;
    setData((cur) => {
      const amostra = cur.amostras.find((a) => a.id === id);
      return registrarAuditoria(
        {
          ...cur,
          amostras: cur.amostras.filter((a) => a.id !== id),
          laudos: cur.laudos.filter((l) => l.amostraId !== id),
          financeiro: cur.financeiro.filter((f) => f.amostraId !== id),
        },
        "Amostras",
        `Amostra removida: ${amostra?.protocolo}`,
      );
    });
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Amostras</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Nova amostra</button>
      </div>

      <input
        className="search-input"
        placeholder="Buscar por protocolo, paciente, solicitante ou tipo..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <table className="table">
        <thead>
          <tr>
            <th>Protocolo</th><th>Paciente</th><th>Solicitante</th>
            <th>Tipo</th><th>Prioridade</th><th>Status</th><th>Recebimento</th><th></th>
          </tr>
        </thead>
        <tbody>
          {filtradas.map((a) => (
            <tr key={a.id}>
              <td className="mono">{a.protocolo}</td>
              <td>{nomePaciente(a.pacienteId)}</td>
              <td>{nomeSolicitante(a.solicitanteId)}</td>
              <td>{a.tipoExame}</td>
              <td><StatusBadge value={a.prioridade} label={statusLabels[a.prioridade]} /></td>
              <td><StatusBadge value={a.status} label={statusLabels[a.status]} /></td>
              <td>{a.dataRecebimento}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setQrAmostra(a)}>QR</button>
                <button className="btn-sm" onClick={() => setEditando(a)}>Editar</button>
                <button className="btn-sm btn-danger" onClick={() => remover(a.id)}>Rem.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editando !== null && (
        <AmostraModal
          amostra={editando}
          pacientes={pacientes}
          solicitantes={solicitantes}
          onSalvar={salvar}
          onFechar={() => setEditando(null)}
        />
      )}

      {qrAmostra && (
        <Modal title={`Etiqueta — ${qrAmostra.protocolo}`} onClose={() => setQrAmostra(null)}>
          <div className="qr-container">
            <div
              className="qr-svg"
              dangerouslySetInnerHTML={{ __html: createQrSvg(qrAmostra.protocolo, 200) }}
            />
            <p className="qr-protocolo">{qrAmostra.protocolo}</p>
            <p className="qr-sub">{nomePaciente(qrAmostra.pacienteId)} · {qrAmostra.tipoExame}</p>
            <button className="btn-primary" onClick={() => window.print()}>Imprimir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AmostraModal({ amostra, pacientes, solicitantes, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    pacienteId: amostra.pacienteId || "",
    solicitanteId: amostra.solicitanteId || "",
    tipoExame: amostra.tipoExame || "",
    material: amostra.material || "",
    condicao: amostra.condicao || "adequada",
    prioridade: amostra.prioridade || "normal",
    status: amostra.status || "recebida",
    dataColeta: amostra.dataColeta || new Date().toLocaleDateString("sv-SE"),
    dataRecebimento: amostra.dataRecebimento || new Date().toLocaleDateString("sv-SE"),
    observacoes: amostra.observacoes || "",
    id: amostra.id,
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Modal title={amostra.id ? `Editar — ${amostra.protocolo}` : "Nova Amostra"} onClose={onFechar} wide>
      <div className="form-grid">
        <label className="form-field">
          Paciente
          <select value={form.pacienteId} onChange={set("pacienteId")}>
            <option value="">— selecione —</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.especie})</option>)}
          </select>
        </label>

        <label className="form-field">
          Solicitante
          <select value={form.solicitanteId} onChange={set("solicitanteId")}>
            <option value="">— selecione —</option>
            {solicitantes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>

        <label className="form-field">
          Tipo de exame
          <input value={form.tipoExame} onChange={set("tipoExame")} placeholder="PCR, Histopatológico..." />
        </label>

        <label className="form-field">
          Material
          <input value={form.material} onChange={set("material")} placeholder="Swab nasal, tecido..." />
        </label>

        <label className="form-field">
          Condição da amostra
          <select value={form.condicao} onChange={set("condicao")}>
            {CONDICOES.map((c) => <option key={c} value={c}>{statusLabels[c]}</option>)}
          </select>
        </label>

        <label className="form-field">
          Prioridade
          <select value={form.prioridade} onChange={set("prioridade")}>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{statusLabels[p]}</option>)}
          </select>
        </label>

        <label className="form-field">
          Status
          <select value={form.status} onChange={set("status")}>
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>
        </label>

        <label className="form-field">
          Data de coleta
          <input type="date" value={form.dataColeta} onChange={set("dataColeta")} />
        </label>

        <label className="form-field">
          Data de recebimento
          <input type="date" value={form.dataRecebimento} onChange={set("dataRecebimento")} />
        </label>

        <label className="form-field form-field--full">
          Observações
          <textarea value={form.observacoes} onChange={set("observacoes")} rows={3} />
        </label>
      </div>

      <div className="modal-footer">
        <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
      </div>
    </Modal>
  );
}
