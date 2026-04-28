import { useState, useMemo } from "react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import BodyDiagram from "../components/BodyDiagram";
import { statusLabels, TIPOS_EXAME, TECNICAS_COLETA, COLORACOES, CARACTERISTICAS_LESAO } from "../data";
import { createQrSvg } from "../qr";

const STATUS_FLOW = ["recebida", "em_analise", "laudo_redigido", "laudo_liberado", "entregue"];
const CONDICOES = ["adequada", "hemolisada", "insuficiente"];
const PRIORIDADES = ["normal", "alta", "urgente"];

const NEOPLASIA_CONSISTENCIA = ["FIRME", "MACIA", "MOLE", "FRIÁVEL"];
const NEOPLASIA_TUMOR = ["ADERIDO À PELE", "À MUSCULATURA", "MÓVEL"];

export default function Amostras({ data, setData, currentUser, makeId, makeProtocolo, makeRC, registrarAuditoria }) {
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [qrAmostra, setQrAmostra] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("");

  const { amostras, pacientes, solicitantes } = data;

  const nomePaciente = (id) => pacientes.find((p) => p.id === id)?.nome || "—";
  const nomeSolicitante = (id) => solicitantes.find((s) => s.id === id)?.nome || "—";

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase();
    return amostras.filter((a) => {
      const matchTipo = !filtroTipo || a.tipoExame === filtroTipo;
      const matchBusca = !q ||
        a.rc.toLowerCase().includes(q) ||
        a.protocolo.toLowerCase().includes(q) ||
        nomePaciente(a.pacienteId).toLowerCase().includes(q) ||
        nomeSolicitante(a.solicitanteId).toLowerCase().includes(q) ||
        a.suspeitaClinica.toLowerCase().includes(q);
      return matchTipo && matchBusca;
    });
  }, [amostras, busca, filtroTipo, pacientes, solicitantes]);

  function salvar(values) {
    setData((cur) => {
      const isNova = !values.id;
      const base = isNova ? {} : (cur.amostras.find((a) => a.id === values.id) || {});
      const registro = {
        ...base,
        ...values,
        id: isNova ? makeId("amo") : values.id,
        protocolo: isNova ? makeProtocolo() : base.protocolo,
        rc: isNova ? makeRC(cur.amostras) : base.rc,
        criadoEm: isNova ? new Date().toISOString() : base.criadoEm,
        atualizadoEm: new Date().toISOString(),
      };
      const novas = isNova
        ? [registro, ...cur.amostras]
        : cur.amostras.map((a) => (a.id === registro.id ? registro : a));
      return registrarAuditoria(
        { ...cur, amostras: novas },
        "Amostras",
        `${isNova ? "Nova amostra" : "Amostra atualizada"}: ${registro.rc}`,
      );
    });
    setEditando(null);
  }

  function remover(id) {
    if (!confirm("Remover esta amostra e todos os dados vinculados?")) return;
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
        `Amostra removida: ${amostra?.rc || amostra?.protocolo}`,
      );
    });
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Amostras</h1>
        <button className="btn-primary" onClick={() => setEditando({})}>+ Nova amostra</button>
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Buscar por RC, paciente, solicitante, suspeita..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="filter-select"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {TIPOS_EXAME.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>RC</th><th>Paciente</th><th>Tipo</th><th>Técnica</th>
            <th>Prioridade</th><th>Status</th><th>Recebimento</th><th></th>
          </tr>
        </thead>
        <tbody>
          {filtradas.map((a) => (
            <tr key={a.id}>
              <td className="mono">{a.rc || a.protocolo}</td>
              <td>{nomePaciente(a.pacienteId)}</td>
              <td>{statusLabels[a.tipoExame] || a.tipoExame}</td>
              <td>{a.tecnicaColeta}</td>
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
          {filtradas.length === 0 && (
            <tr><td colSpan={8} className="empty-text" style={{ padding: "24px", textAlign: "center" }}>Nenhuma amostra encontrada.</td></tr>
          )}
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
        <Modal title={`Etiqueta — ${qrAmostra.rc || qrAmostra.protocolo}`} onClose={() => setQrAmostra(null)}>
          <div className="qr-container">
            <div className="qr-svg" dangerouslySetInnerHTML={{ __html: createQrSvg(qrAmostra.rc || qrAmostra.protocolo, 200) }} />
            <p className="qr-protocolo">{qrAmostra.rc || qrAmostra.protocolo}</p>
            <p className="qr-sub">{nomePaciente(qrAmostra.pacienteId)} · {statusLabels[qrAmostra.tipoExame] || qrAmostra.tipoExame}</p>
            <button className="btn-primary" onClick={() => window.print()}>Imprimir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AmostraModal({ amostra, pacientes, solicitantes, onSalvar, onFechar }) {
  const today = new Date().toLocaleDateString("sv-SE");
  const [form, setForm] = useState({
    id: amostra.id,
    pacienteId: amostra.pacienteId || "",
    solicitanteId: amostra.solicitanteId || "",
    tipoExame: amostra.tipoExame || "citologico",
    material: amostra.material || "",
    tecnicaColeta: amostra.tecnicaColeta || "",
    coloracao: amostra.coloracao || "",
    responsavelColeta: amostra.responsavelColeta || "",
    historico: amostra.historico || "",
    condicao: amostra.condicao || "adequada",
    prioridade: amostra.prioridade || "normal",
    status: amostra.status || "recebida",
    dataColeta: amostra.dataColeta || today,
    dataRecebimento: amostra.dataRecebimento || today,
    dataEntrada: amostra.dataEntrada || today,
    dataResultado: amostra.dataResultado || "",
    dataEntregue: amostra.dataEntregue || "",
    observacoes: amostra.observacoes || "",
    caracteristicasLesao: amostra.caracteristicasLesao || [],
    localizacaoLesao: amostra.localizacaoLesao || [],
    neoplasia: amostra.neoplasia || {},
    terapiaRecente: amostra.terapiaRecente || "",
    enfermidadesIntercorrentes: amostra.enfermidadesIntercorrentes || "",
    suspeitaClinica: amostra.suspeitaClinica || "",
    animalCastrado: amostra.animalCastrado || false,
    intencaoCastracao: amostra.intencaoCastracao || "",
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setVal = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleCaracteristica = (c) => {
    const arr = form.caracteristicasLesao;
    setVal("caracteristicasLesao", arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]);
  };

  const setNeoplasia = (field, value) => setVal("neoplasia", { ...form.neoplasia, [field]: value });

  const showNeoplasia = form.caracteristicasLesao.some((c) => ["NÓDULO", "CISTO"].includes(c));
  const isEmDesenvolvimento = form.tipoExame !== "citologico";

  return (
    <Modal
      title={amostra.id ? `Editar — ${amostra.rc || amostra.protocolo}` : "Nova Amostra"}
      onClose={onFechar}
      wide
    >
      {/* REGISTRO */}
      <div className="form-section">
        <h3 className="form-section-title">Registro</h3>
        <div className="form-grid form-grid-4">
          <label className="form-field">
            Tipo de exame
            <select value={form.tipoExame} onChange={set("tipoExame")}>
              {TIPOS_EXAME.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="form-field">
            Data de entrada
            <input type="date" value={form.dataEntrada} onChange={set("dataEntrada")} />
          </label>
          <label className="form-field">
            Data resultado
            <input type="date" value={form.dataResultado} onChange={set("dataResultado")} />
          </label>
          <label className="form-field">
            Data entregue
            <input type="date" value={form.dataEntregue} onChange={set("dataEntregue")} />
          </label>
        </div>
      </div>

      {isEmDesenvolvimento ? (
        <div className="em-desenvolvimento">
          <p>⚙️ Formulário para <strong>{TIPOS_EXAME.find(t => t.value === form.tipoExame)?.label}</strong> em desenvolvimento.</p>
          <p>Preencha as observações abaixo enquanto o formulário específico não está disponível.</p>
          <label className="form-field" style={{ marginTop: 12 }}>
            Observações
            <textarea value={form.observacoes} onChange={set("observacoes")} rows={5} />
          </label>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
            <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
          </div>
        </div>
      ) : (
        <>
          {/* IDENTIFICAÇÃO */}
          <div className="form-section">
            <h3 className="form-section-title">Identificação</h3>
            <div className="form-grid">
              <label className="form-field">
                Requisitante
                <select value={form.solicitanteId} onChange={set("solicitanteId")}>
                  <option value="">— selecione —</option>
                  {solicitantes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </label>
              <label className="form-field">
                Paciente (animal)
                <select value={form.pacienteId} onChange={set("pacienteId")}>
                  <option value="">— selecione —</option>
                  {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.especie}</option>)}
                </select>
              </label>
            </div>
          </div>

          {/* MATERIAL */}
          <div className="form-section">
            <h3 className="form-section-title">Informações sobre o Material</h3>
            <div className="form-grid">
              <label className="form-field form-field--full">
                Material enviado / descrição
                <input value={form.material} onChange={set("material")} placeholder="Ex: Punção aspirativa de nódulo subcutâneo..." />
              </label>
            </div>

            <div className="form-group-label">Técnica de coleta</div>
            <div className="checkbox-group">
              {TECNICAS_COLETA.map((t) => (
                <label key={t} className="checkbox-item">
                  <input
                    type="radio"
                    name="tecnicaColeta"
                    value={t}
                    checked={form.tecnicaColeta === t}
                    onChange={() => setVal("tecnicaColeta", t)}
                  />
                  {t}
                </label>
              ))}
            </div>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <label className="form-field">
                Responsável pela coleta
                <input value={form.responsavelColeta} onChange={set("responsavelColeta")} />
              </label>
              <label className="form-field">
                Exame com urgência
                <select value={form.prioridade} onChange={set("prioridade")}>
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{statusLabels[p]}</option>)}
                </select>
              </label>
            </div>

            <div className="form-group-label" style={{ marginTop: 12 }}>Coloração empregada</div>
            <div className="checkbox-group">
              {COLORACOES.map((c) => (
                <label key={c} className="checkbox-item">
                  <input
                    type="radio"
                    name="coloracao"
                    value={c}
                    checked={form.coloracao === c}
                    onChange={() => setVal("coloracao", c)}
                  />
                  {c}
                </label>
              ))}
            </div>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <label className="form-field form-field--full">
                Histórico clínico
                <textarea value={form.historico} onChange={set("historico")} rows={2} />
              </label>
            </div>
          </div>

          {/* DIAGRAMA CORPORAL */}
          <div className="form-section">
            <h3 className="form-section-title">Localização da Lesão</h3>
            <BodyDiagram
              value={form.localizacaoLesao}
              onChange={(v) => setVal("localizacaoLesao", v)}
            />
          </div>

          {/* CARACTERÍSTICAS DA LESÃO */}
          <div className="form-section">
            <h3 className="form-section-title">Características Clínicas da Lesão</h3>
            <div className="checkbox-group checkbox-group--wrap">
              {CARACTERISTICAS_LESAO.map((c) => (
                <label key={c} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.caracteristicasLesao.includes(c)}
                    onChange={() => toggleCaracteristica(c)}
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>

          {/* NEOPLASIA */}
          {showNeoplasia && (
            <div className="form-section form-section--highlight">
              <h3 className="form-section-title">Em caso de neoplasia</h3>
              <div className="form-group-label">Consistência</div>
              <div className="checkbox-group">
                {NEOPLASIA_CONSISTENCIA.map((c) => (
                  <label key={c} className="checkbox-item">
                    <input
                      type="radio"
                      name="neoplasia_consistencia"
                      checked={form.neoplasia.consistencia === c}
                      onChange={() => setNeoplasia("consistencia", c)}
                    />
                    {c}
                  </label>
                ))}
              </div>

              <div className="form-grid" style={{ marginTop: 12 }}>
                <label className="form-field">
                  Massa ulcerada
                  <select value={form.neoplasia.massaUlcerada ? "sim" : "nao"} onChange={(e) => setNeoplasia("massaUlcerada", e.target.value === "sim")}>
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </label>
                <label className="form-field">
                  Secreção
                  <select value={form.neoplasia.secrecao ? "sim" : "nao"} onChange={(e) => setNeoplasia("secrecao", e.target.value === "sim")}>
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </label>
              </div>

              <div className="form-group-label" style={{ marginTop: 12 }}>Tumor</div>
              <div className="checkbox-group">
                {NEOPLASIA_TUMOR.map((t) => (
                  <label key={t} className="checkbox-item">
                    <input
                      type="radio"
                      name="neoplasia_tumor"
                      checked={form.neoplasia.tumor === t}
                      onChange={() => setNeoplasia("tumor", t)}
                    />
                    {t}
                  </label>
                ))}
              </div>

              <div className="form-grid" style={{ marginTop: 12 }}>
                <label className="form-field">
                  Linfonodos afetados
                  <select value={form.neoplasia.linfonodos ? "sim" : "nao"} onChange={(e) => setNeoplasia("linfonodos", e.target.value === "sim")}>
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </label>
                {form.neoplasia.linfonodos && (
                  <label className="form-field">
                    Quais linfonodos
                    <input value={form.neoplasia.quaisLinfonodos || ""} onChange={(e) => setNeoplasia("quaisLinfonodos", e.target.value)} />
                  </label>
                )}
                <label className="form-field">
                  Coloração da lesão
                  <input value={form.neoplasia.coloracaoLesao || ""} onChange={(e) => setNeoplasia("coloracaoLesao", e.target.value)} />
                </label>
              </div>
            </div>
          )}

          {/* DADOS COMPLEMENTARES */}
          <div className="form-section">
            <h3 className="form-section-title">Dados Complementares</h3>
            <div className="form-grid">
              <label className="form-field form-field--full">
                Terapia recente
                <input value={form.terapiaRecente} onChange={set("terapiaRecente")} />
              </label>
              <label className="form-field form-field--full">
                Enfermidades intercorrentes
                <input value={form.enfermidadesIntercorrentes} onChange={set("enfermidadesIntercorrentes")} />
              </label>
              <label className="form-field form-field--full">
                Suspeita clínica
                <input value={form.suspeitaClinica} onChange={set("suspeitaClinica")} />
              </label>
            </div>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <label className="form-field">
                Animal castrado
                <select value={form.animalCastrado ? "sim" : "nao"} onChange={(e) => setVal("animalCastrado", e.target.value === "sim")}>
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </label>
              {!form.animalCastrado && (
                <label className="form-field">
                  Intenção da castração
                  <select value={form.intencaoCastracao} onChange={set("intencaoCastracao")}>
                    <option value="">—</option>
                    <option value="eletiva">Eletiva</option>
                    <option value="anormalidade">Anormalidade</option>
                  </select>
                </label>
              )}
              <label className="form-field">
                Condição da amostra
                <select value={form.condicao} onChange={set("condicao")}>
                  {CONDICOES.map((c) => <option key={c} value={c}>{statusLabels[c]}</option>)}
                </select>
              </label>
              <label className="form-field">
                Status
                <select value={form.status} onChange={set("status")}>
                  {STATUS_FLOW.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </label>
            </div>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <label className="form-field">
                Data de coleta
                <input type="date" value={form.dataColeta} onChange={set("dataColeta")} />
              </label>
              <label className="form-field">
                Data de recebimento
                <input type="date" value={form.dataRecebimento} onChange={set("dataRecebimento")} />
              </label>
            </div>

            <label className="form-field form-field--full" style={{ marginTop: 12 }}>
              Observações adicionais
              <textarea value={form.observacoes} onChange={set("observacoes")} rows={2} />
            </label>
          </div>

          <div className="modal-footer">
            <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
            <button className="btn-primary" onClick={() => onSalvar(form)}>Salvar amostra</button>
          </div>
        </>
      )}
    </Modal>
  );
}
