const colors = {
  recebida: "#6B7280",
  em_analise: "#D97706",
  laudo_redigido: "#2563EB",
  laudo_liberado: "#059669",
  entregue: "#374151",
  urgente: "#DC2626",
  alta: "#D97706",
  normal: "#6B7280",
  adequada: "#059669",
  hemolisada: "#D97706",
  insuficiente: "#DC2626",
  aberto: "#6B7280",
  pago: "#059669",
  parcial: "#D97706",
  ativo: "#059669",
  inativo: "#6B7280",
};

export default function StatusBadge({ value, label }) {
  const color = colors[value] || "#6B7280";
  return (
    <span
      className="status-badge"
      style={{ background: color + "20", color, border: `1px solid ${color}40` }}
    >
      {label || value}
    </span>
  );
}
