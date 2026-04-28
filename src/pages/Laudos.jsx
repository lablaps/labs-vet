import { useState, useMemo } from "react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { statusLabels } from "../data";

const NOTA_PADRAO = "O resultado citológico tem valor preditivo devendo ser associado aos achados clínicos e histórico. Os diagnósticos não são excludentes, podendo haver mais de um processo patológico na mesma lesão. Para confirmação complementar do resultado recomenda-se a realização de exame histopatológico e/ou imunohistoquímico.";

const REFERENCIAS_PADRAO = `RASKIN E. Rose; MEYER J. Denny. Citologia clínica de cães e gatos. 2 ed. Elsevier Editora Ltda, 2012.
COWELL, Rick L. Diagnóstico citológico e hematologia de cães e gatos. 3. ed. São Paulo: Medvet, 2009.`;

export default function Laudos({ data, setData, currentUser, acesso, makeId, registrarAuditoria }) {
  const [amostraSelecionada, setAmostraSelecionada] = useState(null);
  const [visualizando, setVisualizando] = useState(null);

  const { amostras, laudos, pacientes, solicitantes, tutores } = data;

  const nomePaciente = (id) => pacientes.find((p) => p.id === id)?.nome || "—";
  const getPaciente = (id) => pacientes.find((p) => p.id === id);
  const nomeSolicitante = (id) => solicitantes.find((s) => s.id === id)?.nome || "—";
  const nomeTutor = (pacienteId) => {
    const pac = pacientes.find((p) => p.id === pacienteId);
    return tutores.find((t) => t.id === pac?.tutorId)?.nome || "—";
  };
  const laudoDe = (amostraId) => laudos.find((l) => l.amostraId === amostraId);

  const amostrasCom = useMemo(
    () => amostras.map((a) => ({ ...a, laudo: laudoDe(a.id) })),
    [amostras, laudos],
  );

  function salvarLaudo(amostra, form) {
    setData((cur) => {
      const existente = cur.laudos.find((l) => l.amostraId === amostra.id);
      const novoLaudo = existente
        ? { ...existente, ...form, atualizadoEm: new Date().toISOString() }
        : { id: makeId("lau"), amostraId: amostra.id, ...form, criadoEm: new Date().toISOString() };

      const novosLaudos = existente
        ? cur.laudos.map((l) => (l.amostraId === amostra.id ? novoLaudo : l))
        : [...cur.laudos, novoLaudo];

      const novasAmostras = cur.amostras.map((a) =>
        a.id === amostra.id
          ? { ...a, status: "laudo_redigido", atualizadoEm: new Date().toISOString() }
          : a,
      );

      return registrarAuditoria(
        { ...cur, amostras: novasAmostras, laudos: novosLaudos },
        "Laudos",
        `Laudo redigido: ${amostra.rc || amostra.protocolo}`,
      );
    });
    setAmostraSelecionada(null);
  }

  function liberarLaudo(amostra) {
    if (!acesso.podeLiberar) return alert("Sem permissão para liberar laudos.");
    if (!confirm(`Liberar laudo da amostra ${amostra.rc || amostra.protocolo}?`)) return;
    setData((cur) => {
      const novosLaudos = cur.laudos.map((l) =>
        l.amostraId === amostra.id
          ? {
              ...l,
              liberadoPor: currentUser?.nome || "",
              liberadoEm: new Date().toLocaleDateString("sv-SE"),
              atualizadoEm: new Date().toISOString(),
            }
          : l,
      );
      const novasAmostras = cur.amostras.map((a) =>
        a.id === amostra.id
          ? { ...a, status: "laudo_liberado", atualizadoEm: new Date().toISOString() }
          : a,
      );
      return registrarAuditoria(
        { ...cur, amostras: novasAmostras, laudos: novosLaudos },
        "Laudos",
        `Laudo liberado: ${amostra.rc || amostra.protocolo} por ${currentUser?.nome}`,
      );
    });
  }

  function imprimirLaudo(amostra) {
    const laudo = laudoDe(amostra.id);
    if (!laudo) return;
    const pac = getPaciente(amostra.pacienteId);
    const win = window.open("", "_blank");
    win.document.write(gerarHtmlLaudo(amostra, laudo, pac, nomeSolicitante(amostra.solicitanteId), nomeTutor(amostra.pacienteId)));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Laudos</h1>
      </div>

      <table className="table">
        <thead>
          <tr><th>RC</th><th>Paciente</th><th>Tipo</th><th>Status</th><th>Laudo</th><th></th></tr>
        </thead>
        <tbody>
          {amostrasCom.map((a) => (
            <tr key={a.id}>
              <td className="mono">{a.rc || a.protocolo}</td>
              <td>{nomePaciente(a.pacienteId)}</td>
              <td>{statusLabels[a.tipoExame] || a.tipoExame}</td>
              <td><StatusBadge value={a.status} label={statusLabels[a.status]} /></td>
              <td>
                {a.laudo
                  ? a.laudo.liberadoEm
                    ? <span style={{ color: "#059669", fontWeight: 600 }}>Liberado</span>
                    : <span style={{ color: "#2563EB" }}>Redigido</span>
                  : <span style={{ color: "#9CA3AF" }}>Sem laudo</span>}
              </td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => setAmostraSelecionada(a)}>
                  {a.laudo ? "Editar laudo" : "Redigir laudo"}
                </button>
                {a.laudo && !a.laudo.liberadoEm && acesso.podeLiberar && (
                  <button className="btn-sm btn-success" onClick={() => liberarLaudo(a)}>Liberar</button>
                )}
                {a.laudo?.liberadoEm && (
                  <>
                    <button className="btn-sm" onClick={() => setVisualizando(a)}>Visualizar</button>
                    <button className="btn-sm" onClick={() => imprimirLaudo(a)}>Imprimir</button>
                  </>
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

      {visualizando && (
        <Modal title={`Laudo — ${visualizando.rc || visualizando.protocolo}`} onClose={() => setVisualizando(null)} wide>
          <LaudoPreview
            amostra={visualizando}
            laudo={laudoDe(visualizando.id)}
            paciente={getPaciente(visualizando.pacienteId)}
            nomeSolicitante={nomeSolicitante(visualizando.solicitanteId)}
            nomeTutor={nomeTutor(visualizando.pacienteId)}
          />
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setVisualizando(null)}>Fechar</button>
            <button className="btn-primary" onClick={() => imprimirLaudo(visualizando)}>Imprimir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LaudoModal({ amostra, laudo, currentUser, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    materialEnviado: laudo?.materialEnviado || amostra.material || "",
    macro: laudo?.macro || "",
    micro: laudo?.micro || "",
    diagnostico: laudo?.diagnostico || "",
    comentarios: laudo?.comentarios || "",
    responsavel: laudo?.responsavel || currentUser?.nome || "",
    liberadoPor: laudo?.liberadoPor || "",
    liberadoEm: laudo?.liberadoEm || "",
  });
  const set = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));

  return (
    <Modal title={`Laudo — ${amostra.rc || amostra.protocolo}`} onClose={onFechar} wide>
      <div className="form-section">
        <h3 className="form-section-title">Material</h3>
        <label className="form-field form-field--full">
          Material enviado
          <textarea value={form.materialEnviado} onChange={set("materialEnviado")} rows={2} />
        </label>
      </div>
      <div className="form-section">
        <h3 className="form-section-title">Resultado</h3>
        <div className="form-grid">
          <label className="form-field form-field--full">
            Descrição macroscópica
            <textarea value={form.macro} onChange={set("macro")} rows={3} />
          </label>
          <label className="form-field form-field--full">
            Descrição microscópica / Observações
            <textarea value={form.micro} onChange={set("micro")} rows={4} />
          </label>
          <label className="form-field form-field--full">
            Conclusão / Diagnóstico
            <textarea value={form.diagnostico} onChange={set("diagnostico")} rows={3} />
          </label>
          <label className="form-field form-field--full">
            Comentários e recomendações
            <textarea value={form.comentarios} onChange={set("comentarios")} rows={2} />
          </label>
          <label className="form-field">
            Responsável pelo laudo
            <input value={form.responsavel} onChange={set("responsavel")} />
          </label>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar laudo</button>
      </div>
    </Modal>
  );
}

function LaudoPreview({ amostra, laudo, paciente, nomeSolicitante, nomeTutor }) {
  if (!laudo) return <p>Laudo não encontrado.</p>;
  return (
    <div className="laudo-preview">
      <div className="laudo-header">
        <div className="laudo-logo-area">
          <div className="laudo-logo-placeholder">LaPaVe</div>
        </div>
        <div className="laudo-header-text">
          <div className="laudo-instituicao">Universidade Estadual do Maranhão — UEMA</div>
          <div className="laudo-centro">Centro de Ciências Agrárias · Curso de Medicina Veterinária</div>
          <div className="laudo-lab">Laboratório de Patologia Veterinária</div>
        </div>
      </div>
      <div className="laudo-titulo">Resultado de Exame Citopatológico</div>

      <table className="laudo-info-table">
        <tbody>
          <tr>
            <td><strong>Requisitante:</strong> {nomeSolicitante}</td>
            <td><strong>RC:</strong> {amostra.rc || amostra.protocolo}</td>
          </tr>
          <tr>
            <td><strong>Nome do Proprietário:</strong> {nomeTutor}</td>
            <td><strong>Data recebimento:</strong> {amostra.dataRecebimento}</td>
          </tr>
          <tr>
            <td><strong>Nome do Animal:</strong> {paciente?.nome}</td>
            <td><strong>Espécie:</strong> {paciente?.especie}</td>
          </tr>
          <tr>
            <td><strong>Raça:</strong> {paciente?.raca}</td>
            <td><strong>Sexo:</strong> {paciente?.sexo} · <strong>Idade:</strong> {paciente?.idade}</td>
          </tr>
        </tbody>
      </table>

      <div className="laudo-field"><strong>Material enviado:</strong> {laudo.materialEnviado}</div>
      {amostra.coloracao && <div className="laudo-field"><strong>Colorações empregadas:</strong> {amostra.coloracao}</div>}
      {laudo.macro && <div className="laudo-field"><strong>Descrição macroscópica:</strong> {laudo.macro}</div>}
      <div className="laudo-field"><strong>Observações:</strong> {laudo.micro}</div>
      <div className="laudo-field"><strong>Conclusão:</strong> {laudo.diagnostico}</div>
      {laudo.comentarios && <div className="laudo-field"><strong>Comentários:</strong> {laudo.comentarios}</div>}

      <div className="laudo-nota"><strong>Nota:</strong> {NOTA_PADRAO}</div>
      <div className="laudo-referencias"><strong>Referências:</strong><br />{REFERENCIAS_PADRAO}</div>

      <div className="laudo-footer">
        <span>Resultado emitido em: {laudo.liberadoEm}</span>
        <span>Responsável: {laudo.responsavel}</span>
      </div>
    </div>
  );
}

function gerarHtmlLaudo(amostra, laudo, pac, nomeSolicitante, nomeTutor) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Laudo ${amostra.rc || amostra.protocolo}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; font-size: 13px; color: #000; }
  .header { display: flex; align-items: center; border-bottom: 2px solid #1A3D2B; padding-bottom: 12px; margin-bottom: 16px; }
  .logo-box { width: 80px; height: 60px; border: 2px solid #1A3D2B; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; color: #1A3D2B; margin-right: 16px; border-radius: 4px; }
  .inst { flex: 1; }
  .inst-nome { font-weight: 700; font-size: 14px; }
  .inst-sub { font-size: 12px; color: #444; }
  .titulo { text-align: center; font-size: 16px; font-weight: 700; margin: 16px 0; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  td { padding: 4px 8px; border: 1px solid #ccc; font-size: 12px; }
  .field { margin: 10px 0; }
  .field-label { font-weight: 700; }
  .nota { margin-top: 20px; font-size: 11px; color: #444; border-top: 1px solid #ccc; padding-top: 8px; }
  .refs { font-size: 11px; color: #444; margin-top: 8px; }
  .footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 12px; display: flex; justify-content: space-between; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo-box">LaPaVe</div>
  <div class="inst">
    <div class="inst-nome">Universidade Estadual do Maranhão — UEMA</div>
    <div class="inst-sub">Centro de Ciências Agrárias · Curso de Medicina Veterinária · Departamento de Patologia</div>
    <div class="inst-sub"><strong>Laboratório de Patologia Veterinária</strong></div>
  </div>
</div>
<div class="titulo">Resultado de Exame Citopatológico</div>
<table>
  <tr><td><strong>Requisitante:</strong> ${nomeSolicitante}</td><td><strong>RC:</strong> ${amostra.rc || amostra.protocolo}</td></tr>
  <tr><td><strong>Nome do Proprietário:</strong> ${nomeTutor}</td><td><strong>Data recebimento:</strong> ${amostra.dataRecebimento}</td></tr>
  <tr><td><strong>Nome do Animal:</strong> ${pac?.nome || "—"}</td><td><strong>Espécie:</strong> ${pac?.especie || "—"}</td></tr>
  <tr><td><strong>Raça:</strong> ${pac?.raca || "—"}</td><td><strong>Sexo:</strong> ${pac?.sexo || "—"} &nbsp; <strong>Idade:</strong> ${pac?.idade || "—"}</td></tr>
</table>
<div class="field"><span class="field-label">Material enviado:</span> ${laudo.materialEnviado || "—"}</div>
${amostra.coloracao ? `<div class="field"><span class="field-label">Colorações empregadas:</span> ${amostra.coloracao}</div>` : ""}
${laudo.macro ? `<div class="field"><span class="field-label">Descrição macroscópica:</span> ${laudo.macro}</div>` : ""}
<div class="field"><span class="field-label">Observações:</span> ${laudo.micro || "—"}</div>
<div class="field"><span class="field-label">Conclusão:</span> ${laudo.diagnostico || "—"}</div>
${laudo.comentarios ? `<div class="field"><span class="field-label">Comentários:</span> ${laudo.comentarios}</div>` : ""}
<div class="nota"><strong>Nota:</strong> ${NOTA_PADRAO}</div>
<div class="refs"><strong>Referências:</strong><br>${REFERENCIAS_PADRAO.replace(/\n/g, "<br>")}</div>
<div class="footer">
  <span>Resultado emitido em: ${laudo.liberadoEm || "—"}</span>
  <span>Responsável: ${laudo.responsavel || "—"}</span>
</div>
</body></html>`;
}
