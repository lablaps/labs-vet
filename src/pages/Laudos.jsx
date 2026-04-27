import { useState, useMemo } from "react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { statusLabels } from "../data";

export default function Laudos({ data, setData, currentUser, acesso, makeId, registrarAuditoria }) {
  const [amostraSelecionada, setAmostraSelecionada] = useState(null);

  const { amostras, laudos, pacientes, solicitantes } = data;

  const nomePaciente = (id) => pacientes.find((p) => p.id === id)?.nome || "—";
  const nomeSolicitante = (id) => solicitantes.find((s) => s.id === id)?.nome || "—";
  const laudoDe = (amostraId) => laudos.find((l) => l.amostraId === amostraId);

  const amostrasCom = useMemo(() =>
    amostras.map((a) => ({ ...a, laudo: laudoDe(a.id) })),
    [amostras, laudos],
  );

  function salvarLaudo(amostra, form) {
    setData((cur) => {
      const laudoExistente = cur.laudos.find((l) => l.amostraId === amostra.id);
      const novoLaudo = laudoExistente
        ? { ...laudoExistente, ...form, atualizadoEm: new Date().toISOString() }
        : { id: makeId("lau"), amostraId: amostra.id, ...form, criadoEm: new Date().toISOString() };

      const novosLaudos = laudoExistente
        ? cur.laudos.map((l) => (l.amostraId === amostra.id ? novoLaudo : l))
        : [...cur.laudos, novoLaudo];

      const novasAmostras = cur.amostras.map((a) =>
        a.id === amostra.id ? { ...a, status: "laudo_redigido", atualizadoEm: new Date().toISOString() } : a,
      );

      return registrarAuditoria(
        { ...cur, amostras: novasAmostras, laudos: novosLaudos },
        "Laudos",
        `Laudo redigido: ${amostra.protocolo}`,
      );
    });
    setAmostraSelecionada(null);
  }

  function liberarLaudo(amostra) {
    if (!acesso.podeLiberar) return alert("Sem permissão para liberar laudos.");
    if (!confirm(`Liberar laudo da amostra ${amostra.protocolo}?`)) return;

    setData((cur) => {
      const novosLaudos = cur.laudos.map((l) =>
        l.amostraId === amostra.id
          ? { ...l, liberadoPor: currentUser.nome, liberadoEm: new Date().toLocaleDateString("sv-SE"), atualizadoEm: new Date().toISOString() }
          : l,
      );
      const novasAmostras = cur.amostras.map((a) =>
        a.id === amostra.id ? { ...a, status: "laudo_liberado", atualizadoEm: new Date().toISOString() } : a,
      );
      return registrarAuditoria(
        { ...cur, amostras: novasAmostras, laudos: novosLaudos },
        "Laudos",
        `Laudo liberado: ${amostra.protocolo} por ${currentUser.nome}`,
      );
    });
  }

  function imprimirLaudo(amostra) {
    const laudo = laudoDe(amostra.id);
    if (!laudo) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Laudo ${amostra.protocolo}</title>
      <style>body{font-family:Arial,sans-serif;margin:40px;} h1{font-size:18px;} .field{margin:12px 0;} label{font-weight:bold;display:block;} .footer{margin-top:40px;border-top:1px solid #ccc;padding-top:16px;}</style>
      </head><body>
      <h1>LAPMOL — Laboratório de Patologia Molecular / UEMA</h1>
      <div class="field"><label>Protocolo:</label>${amostra.protocolo}</div>
      <div class="field"><label>Paciente:</label>${nomePaciente(amostra.pacienteId)}</div>
      <div class="field"><label>Solicitante:</label>${nomeSolicitante(amostra.solicitanteId)}</div>
      <div class="field"><label>Tipo de exame:</label>${amostra.tipoExame}</div>
      <div class="field"><label>Material:</label>${amostra.material}</div>
      <div class="field"><label>Descrição macroscópica:</label>${laudo.macro}</div>
      <div class="field"><label>Descrição microscópica:</label>${laudo.micro}</div>
      <div class="field"><label>Diagnóstico:</label>${laudo.diagnostico}</div>
      <div class="field"><label>Comentários:</label>${laudo.comentarios}</div>
      <div class="footer"><label>Responsável:</label>${laudo.responsavel} — Liberado em: ${laudo.liberadoEm || "—"}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Laudos</h1>
      </div>

      <table className="table">
        <thead>
          <tr><th>Protocolo</th><th>Paciente</th><th>Tipo</th><th>Status</th><th>Laudo</th><th></th></tr>
        </thead>
        <tbody>
          {amostrasCom.map((a) => (
            <tr key={a.id}>
              <td className="mono">{a.protocolo}</td>
              <td>{nomePaciente(a.pacienteId)}</td>
              <td>{a.tipoExame}</td>
              <td><StatusBadge value={a.status} label={statusLabels[a.status]} /></td>
              <td>{a.laudo ? (a.laudo.liberadoEm ? "Liberado" : "Redigido") : "Sem laudo"}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setAmostraSelecionada(a)}>
                  {a.laudo ? "Editar laudo" : "Redigir laudo"}
                </button>
                {a.laudo && !a.laudo.liberadoEm && acesso.podeLiberar && (
                  <button className="btn-sm btn-success" onClick={() => liberarLaudo(a)}>Liberar</button>
                )}
                {a.laudo?.liberadoEm && (
                  <button className="btn-sm" onClick={() => imprimirLaudo(a)}>Imprimir</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {amostraSelecionada && (
        <LaudoModal
          amostra={amostraSelecionada}
          laudo={laudoDe(amostraSelecionada.id)}
          currentUser={currentUser}
          onSalvar={(form) => salvarLaudo(amostraSelecionada, form)}
          onFechar={() => setAmostraSelecionada(null)}
        />
      )}
    </div>
  );
}

function LaudoModal({ amostra, laudo, currentUser, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    macro: laudo?.macro || "",
    micro: laudo?.micro || "",
    diagnostico: laudo?.diagnostico || "",
    comentarios: laudo?.comentarios || "",
    responsavel: laudo?.responsavel || currentUser?.nome || "",
    liberadoPor: laudo?.liberadoPor || "",
    liberadoEm: laudo?.liberadoEm || "",
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Modal title={`Laudo — ${amostra.protocolo}`} onClose={onFechar} wide>
      <div className="form-grid">
        <label className="form-field form-field--full">
          Descrição macroscópica
          <textarea value={form.macro} onChange={set("macro")} rows={3} />
        </label>
        <label className="form-field form-field--full">
          Descrição microscópica
          <textarea value={form.micro} onChange={set("micro")} rows={3} />
        </label>
        <label className="form-field form-field--full">
          Diagnóstico conclusivo
          <textarea value={form.diagnostico} onChange={set("diagnostico")} rows={3} />
        </label>
        <label className="form-field form-field--full">
          Comentários / recomendações
          <textarea value={form.comentarios} onChange={set("comentarios")} rows={2} />
        </label>
        <label className="form-field">
          Responsável pelo laudo
          <input value={form.responsavel} onChange={set("responsavel")} />
        </label>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar laudo</button>
      </div>
    </Modal>
  );
}
