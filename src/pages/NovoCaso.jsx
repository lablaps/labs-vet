import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import BodyDiagram from "../components/BodyDiagram";
import { statusLabels, TIPOS_EXAME, TECNICAS_COLETA, COLORACOES, CARACTERISTICAS_LESAO } from "../data";

const DRAFT_KEY = "lapave.draft.novocaso";
const STEPS = ["Tutor", "Paciente", "Amostra"];
const CONDICOES = ["adequada", "hemolisada", "insuficiente"];
const PRIORIDADES = ["normal", "alta", "urgente"];
const STATUS_FLOW = ["recebida", "em_analise", "laudo_redigido", "laudo_liberado", "entregue"];
const NEOPLASIA_CONSISTENCIA = ["FIRME", "MACIA", "MOLE", "FRIÁVEL"];

const DRAFT_INICIAL = {
  tutorMode: "skip",
  tutorId: null,
  tutorForm: { nome: "", cpf: "", telefone: "", email: "", cidade: "", endereco: "" },
  pacienteMode: "new",
  pacienteId: null,
  pacienteForm: { nome: "", especie: "", raca: "", idade: "", sexo: "", pelagem: "", peso: "" },
  amostraForm: {
    tipoExame: "citologico",
    material: "",
    tecnicaColeta: "",
    coloracao: "",
    responsavelColeta: "",
    historico: "",
    condicao: "adequada",
    prioridade: "normal",
    status: "recebida",
    dataColeta: "",
    dataRecebimento: "",
    dataEntrada: "",
    dataResultado: "",
    dataEntregue: "",
    observacoes: "",
    caracteristicasLesao: [],
    localizacaoLesao: [],
    neoplasia: {},
    terapiaRecente: "",
    enfermidadesIntercorrentes: "",
    suspeitaClinica: "",
    animalCastrado: false,
    intencaoCastracao: "",
  },
};

function carregarDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function draftTemDados(draft) {
  if (!draft) return false;
  if (draft.tutorMode !== "skip") return true;
  if (draft.pacienteMode === "select" && draft.pacienteId) return true;
  if (draft.pacienteForm?.nome) return true;
  if (draft.amostraForm?.material) return true;
  return false;
}

export default function NovoCaso({ data, setData, onClose, makeId, makeProtocolo, makeRC, registrarAuditoria }) {
  const today = new Date().toLocaleDateString("sv-SE");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => carregarDraft() || DRAFT_INICIAL);
  const [buscaTutor, setBuscaTutor] = useState("");
  const [buscaPaciente, setBuscaPaciente] = useState("");

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  function handleClose() {
    if (draftTemDados(draft)) {
      if (!confirm("O progresso do caso em andamento será perdido. Deseja sair mesmo assim?")) return;
    }
    localStorage.removeItem(DRAFT_KEY);
    onClose();
  }

  const upDraft = (field, value) => setDraft((d) => ({ ...d, [field]: value }));
  const upTutor = (field, value) => setDraft((d) => ({ ...d, tutorForm: { ...d.tutorForm, [field]: value } }));
  const upPaciente = (field, value) => setDraft((d) => ({ ...d, pacienteForm: { ...d.pacienteForm, [field]: value } }));
  const upAmostra = (field, value) => setDraft((d) => ({ ...d, amostraForm: { ...d.amostraForm, [field]: value } }));

  function podeAvancar() {
    if (step === 0) {
      if (draft.tutorMode === "new" && !draft.tutorForm.nome) return false;
      if (draft.tutorMode === "select" && !draft.tutorId) return false;
    }
    if (step === 1) {
      if (draft.pacienteMode === "select") return !!draft.pacienteId;
      return !!draft.pacienteForm.nome;
    }
    return true;
  }

  function concluir() {
    setData((cur) => {
      let next = { ...cur };
      let tutorId = null;

      if (draft.tutorMode === "new" && draft.tutorForm.nome) {
        tutorId = makeId("tut");
        next = { ...next, tutores: [...next.tutores, { id: tutorId, ...draft.tutorForm, criadoEm: new Date().toISOString() }] };
      } else if (draft.tutorMode === "select") {
        tutorId = draft.tutorId;
      }

      let pacienteId = null;
      if (draft.pacienteMode === "new") {
        pacienteId = makeId("pac");
        next = { ...next, pacientes: [...next.pacientes, { id: pacienteId, ...draft.pacienteForm, tutorId: tutorId || null, criadoEm: new Date().toISOString() }] };
      } else {
        pacienteId = draft.pacienteId;
      }

      const novaAmostra = {
        id: makeId("amo"),
        protocolo: makeProtocolo(),
        rc: makeRC(next.amostras),
        pacienteId,
        solicitanteId: null,
        ...draft.amostraForm,
        dataEntrada: draft.amostraForm.dataEntrada || today,
        dataRecebimento: draft.amostraForm.dataRecebimento || today,
        dataColeta: draft.amostraForm.dataColeta || today,
        criadoEm: new Date().toISOString(),
      };

      next = { ...next, amostras: [novaAmostra, ...next.amostras] };
      next = registrarAuditoria(next, "Amostras", `Novo caso registrado: ${novaAmostra.rc}`);
      return next;
    });

    localStorage.removeItem(DRAFT_KEY);
    onClose();
  }

  const tutoresFiltrados = data.tutores.filter((t) =>
    !buscaTutor || t.nome.toLowerCase().includes(buscaTutor.toLowerCase()) || t.cpf?.includes(buscaTutor),
  );

  const pacientesFiltrados = data.pacientes.filter((p) => {
    const matchBusca = !buscaPaciente || p.nome.toLowerCase().includes(buscaPaciente.toLowerCase());
    const matchTutor = draft.tutorMode === "skip" || !draft.tutorId || p.tutorId === draft.tutorId;
    return matchBusca && matchTutor;
  });

  return (
    <Modal title="Novo Caso" onClose={handleClose} wide>
      {/* Indicador de passos */}
      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`wizard-step ${i === step ? "wizard-step--active" : ""} ${i < step ? "wizard-step--done" : ""}`}>
            <span className="wizard-step-num">{i < step ? "✓" : i + 1}</span>
            <span className="wizard-step-label">{s}</span>
            {i < STEPS.length - 1 && <span className="wizard-step-line" />}
          </div>
        ))}
      </div>

      <div className="wizard-body">
        {/* PASSO 0: TUTOR */}
        {step === 0 && (
          <>
            <h3 className="wizard-section-title">Tutor / Proprietário <span className="wizard-optional">(opcional)</span></h3>
            <div className="wizard-mode-tabs">
              {[["skip","Sem tutor"],["select","Buscar existente"],["new","Novo tutor"]].map(([mode, label]) => (
                <button key={mode} type="button" className={`wizard-tab ${draft.tutorMode === mode ? "active" : ""}`} onClick={() => upDraft("tutorMode", mode)}>{label}</button>
              ))}
            </div>
            {draft.tutorMode === "skip" && (
              <p className="wizard-hint">O paciente não tem tutor identificado, ou você adicionará depois.</p>
            )}
            {draft.tutorMode === "select" && (
              <>
                <input className="search-input" placeholder="Buscar por nome ou CPF..." value={buscaTutor} onChange={(e) => setBuscaTutor(e.target.value)} />
                <div className="wizard-list">
                  {tutoresFiltrados.length === 0 && <p className="empty-text">Nenhum tutor encontrado.</p>}
                  {tutoresFiltrados.map((t) => (
                    <button key={t.id} type="button" className={`wizard-list-item ${draft.tutorId === t.id ? "selected" : ""}`} onClick={() => upDraft("tutorId", t.id)}>
                      <strong>{t.nome}</strong>
                      <span>{t.cpf}{t.cidade ? ` · ${t.cidade}` : ""}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {draft.tutorMode === "new" && (
              <div className="form-grid">
                {[["nome","Nome completo *"],["cpf","CPF"],["telefone","Telefone"],["email","E-mail"],["cidade","Cidade"],["endereco","Endereço"]].map(([k, label]) => (
                  <label key={k} className="form-field">
                    {label}
                    <input value={draft.tutorForm[k]} onChange={(e) => upTutor(k, e.target.value)} />
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {/* PASSO 1: PACIENTE */}
        {step === 1 && (
          <>
            <h3 className="wizard-section-title">Paciente / Animal</h3>
            <div className="wizard-mode-tabs">
              {[["select","Buscar existente"],["new","Novo paciente"]].map(([mode, label]) => (
                <button key={mode} type="button" className={`wizard-tab ${draft.pacienteMode === mode ? "active" : ""}`} onClick={() => upDraft("pacienteMode", mode)}>{label}</button>
              ))}
            </div>
            {draft.pacienteMode === "select" && (
              <>
                <input className="search-input" placeholder="Buscar por nome do animal..." value={buscaPaciente} onChange={(e) => setBuscaPaciente(e.target.value)} />
                <div className="wizard-list">
                  {pacientesFiltrados.length === 0 && <p className="empty-text">Nenhum paciente encontrado. Crie um novo.</p>}
                  {pacientesFiltrados.map((p) => {
                    const tutor = data.tutores.find((t) => t.id === p.tutorId);
                    return (
                      <button key={p.id} type="button" className={`wizard-list-item ${draft.pacienteId === p.id ? "selected" : ""}`} onClick={() => upDraft("pacienteId", p.id)}>
                        <strong>{p.nome}</strong>
                        <span>{p.especie}{p.raca ? ` · ${p.raca}` : ""}{tutor ? ` · ${tutor.nome}` : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {draft.pacienteMode === "new" && (
              <div className="form-grid">
                <label className="form-field"><span>Nome *</span><input value={draft.pacienteForm.nome} onChange={(e) => upPaciente("nome", e.target.value)} /></label>
                <label className="form-field"><span>Espécie</span><input value={draft.pacienteForm.especie} onChange={(e) => upPaciente("especie", e.target.value)} placeholder="Canino, Felino..." /></label>
                <label className="form-field"><span>Raça</span><input value={draft.pacienteForm.raca} onChange={(e) => upPaciente("raca", e.target.value)} /></label>
                <label className="form-field"><span>Idade</span><input value={draft.pacienteForm.idade} onChange={(e) => upPaciente("idade", e.target.value)} /></label>
                <label className="form-field">
                  <span>Sexo</span>
                  <select value={draft.pacienteForm.sexo} onChange={(e) => upPaciente("sexo", e.target.value)}>
                    <option value="">—</option>
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                  </select>
                </label>
                <label className="form-field"><span>Peso</span><input value={draft.pacienteForm.peso} onChange={(e) => upPaciente("peso", e.target.value)} placeholder="Ex: 12 kg" /></label>
                <label className="form-field form-field--full"><span>Pelagem</span><input value={draft.pacienteForm.pelagem} onChange={(e) => upPaciente("pelagem", e.target.value)} /></label>
              </div>
            )}
          </>
        )}

        {/* PASSO 2: AMOSTRA */}
        {step === 2 && (
          <StepAmostra form={draft.amostraForm} update={upAmostra} today={today} />
        )}
      </div>

      {/* Rodapé do wizard */}
      <div className="wizard-footer">
        <button type="button" className="btn-secondary" onClick={step === 0 ? handleClose : () => setStep((s) => s - 1)}>
          {step === 0 ? "Cancelar" : "← Voltar"}
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!podeAvancar()}>
            Próximo →
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={concluir}>
            Salvar caso
          </button>
        )}
      </div>
    </Modal>
  );
}

function StepAmostra({ form, update, today }) {
  const showNeoplasia = (form.caracteristicasLesao || []).some((c) => ["NÓDULO", "CISTO"].includes(c));
  const set = (field) => (e) => update(field, e.target.value);
  const setVal = (field, value) => update(field, value);
  const setNeoplasia = (field, value) => setVal("neoplasia", { ...(form.neoplasia || {}), [field]: value });
  const toggleCarac = (c) => {
    const arr = form.caracteristicasLesao || [];
    setVal("caracteristicasLesao", arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]);
  };

  return (
    <>
      <div className="form-section">
        <h3 className="form-section-title">Registro</h3>
        <div className="form-grid form-grid-4">
          <label className="form-field">
            Tipo de exame
            <select value={form.tipoExame} onChange={set("tipoExame")}>
              {TIPOS_EXAME.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="form-field">Data de entrada<input type="date" value={form.dataEntrada || today} onChange={set("dataEntrada")} /></label>
          <label className="form-field">Data de coleta<input type="date" value={form.dataColeta || today} onChange={set("dataColeta")} /></label>
          <label className="form-field">Data de recebimento<input type="date" value={form.dataRecebimento || today} onChange={set("dataRecebimento")} /></label>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Material</h3>
        <label className="form-field form-field--full">
          Material enviado / descrição
          <input value={form.material} onChange={set("material")} placeholder="Ex: Punção aspirativa de nódulo subcutâneo..." />
        </label>
        <div className="form-group-label" style={{ marginTop: 12 }}>Técnica de coleta</div>
        <div className="checkbox-group">
          {TECNICAS_COLETA.map((t) => (
            <label key={t} className="checkbox-item">
              <input type="radio" name="wiz_tecnica" value={t} checked={form.tecnicaColeta === t} onChange={() => setVal("tecnicaColeta", t)} />
              {t}
            </label>
          ))}
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <label className="form-field">Responsável pela coleta<input value={form.responsavelColeta} onChange={set("responsavelColeta")} /></label>
          <label className="form-field">
            Prioridade
            <select value={form.prioridade} onChange={set("prioridade")}>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{statusLabels[p]}</option>)}
            </select>
          </label>
        </div>
        <div className="form-group-label" style={{ marginTop: 12 }}>Coloração empregada</div>
        <div className="checkbox-group">
          {COLORACOES.map((c) => (
            <label key={c} className="checkbox-item">
              <input type="radio" name="wiz_coloracao" value={c} checked={form.coloracao === c} onChange={() => setVal("coloracao", c)} />
              {c}
            </label>
          ))}
        </div>
        <label className="form-field form-field--full" style={{ marginTop: 12 }}>
          Histórico clínico
          <textarea value={form.historico} onChange={set("historico")} rows={2} />
        </label>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Localização da Lesão</h3>
        <BodyDiagram value={form.localizacaoLesao || []} onChange={(v) => setVal("localizacaoLesao", v)} />
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Características da Lesão</h3>
        <div className="checkbox-group checkbox-group--wrap">
          {CARACTERISTICAS_LESAO.map((c) => (
            <label key={c} className="checkbox-item">
              <input type="checkbox" checked={(form.caracteristicasLesao || []).includes(c)} onChange={() => toggleCarac(c)} />
              {c}
            </label>
          ))}
        </div>
      </div>

      {showNeoplasia && (
        <div className="form-section form-section--highlight">
          <h3 className="form-section-title">Em caso de neoplasia</h3>
          <div className="form-group-label">Consistência</div>
          <div className="checkbox-group">
            {NEOPLASIA_CONSISTENCIA.map((c) => (
              <label key={c} className="checkbox-item">
                <input type="radio" name="wiz_consist" checked={form.neoplasia?.consistencia === c} onChange={() => setNeoplasia("consistencia", c)} />
                {c}
              </label>
            ))}
          </div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <label className="form-field">
              Massa ulcerada
              <select value={form.neoplasia?.massaUlcerada ? "sim" : "nao"} onChange={(e) => setNeoplasia("massaUlcerada", e.target.value === "sim")}>
                <option value="nao">Não</option><option value="sim">Sim</option>
              </select>
            </label>
            <label className="form-field">
              Secreção
              <select value={form.neoplasia?.secrecao ? "sim" : "nao"} onChange={(e) => setNeoplasia("secrecao", e.target.value === "sim")}>
                <option value="nao">Não</option><option value="sim">Sim</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="form-section">
        <h3 className="form-section-title">Dados Complementares</h3>
        <div className="form-grid">
          <label className="form-field form-field--full"><span>Suspeita clínica</span><input value={form.suspeitaClinica} onChange={set("suspeitaClinica")} /></label>
          <label className="form-field form-field--full"><span>Terapia recente</span><input value={form.terapiaRecente} onChange={set("terapiaRecente")} /></label>
          <label className="form-field form-field--full"><span>Enfermidades intercorrentes</span><input value={form.enfermidadesIntercorrentes} onChange={set("enfermidadesIntercorrentes")} /></label>
          <label className="form-field">
            Animal castrado
            <select value={form.animalCastrado ? "sim" : "nao"} onChange={(e) => setVal("animalCastrado", e.target.value === "sim")}>
              <option value="nao">Não</option><option value="sim">Sim</option>
            </select>
          </label>
          <label className="form-field">
            Condição da amostra
            <select value={form.condicao} onChange={set("condicao")}>
              {CONDICOES.map((c) => <option key={c} value={c}>{statusLabels[c]}</option>)}
            </select>
          </label>
          <label className="form-field">
            Status inicial
            <select value={form.status} onChange={set("status")}>
              {["recebida","em_analise"].map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </label>
        </div>
        <label className="form-field form-field--full" style={{ marginTop: 12 }}>
          Observações
          <textarea value={form.observacoes} onChange={set("observacoes")} rows={2} />
        </label>
      </div>
    </>
  );
}
