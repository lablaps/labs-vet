import { useState } from "react";

const SVG_W = 300;
const SVG_H = 180;
const MARKER_COLOR = "#DC2626";

const VIEWS = [
  { id: "lateral", label: "Vista Lateral" },
  { id: "dorsal", label: "Vista Dorsal" },
];

export default function BodyDiagram({ value = [], onChange }) {
  const [activeView, setActiveView] = useState("lateral");

  function handleSvgClick(e, viewId) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left) / rect.width * SVG_W).toFixed(1));
    const y = parseFloat(((e.clientY - rect.top) / rect.height * SVG_H).toFixed(1));
    onChange([...value, { id: Date.now(), view: viewId, x, y }]);
  }

  function removeMarker(id, e) {
    e.stopPropagation();
    onChange(value.filter((m) => m.id !== id));
  }

  const markersFor = (viewId) => value.filter((m) => m.view === viewId);

  return (
    <div className="body-diagram">
      <div className="body-diagram-tabs">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`body-diagram-tab ${activeView === v.id ? "body-diagram-tab--active" : ""}`}
            onClick={() => setActiveView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="body-diagram-canvas">
        {VIEWS.map((v) => (
          <svg
            key={v.id}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="body-diagram-svg"
            style={{ display: activeView === v.id ? "block" : "none", cursor: "crosshair" }}
            onClick={(e) => handleSvgClick(e, v.id)}
          >
            {v.id === "lateral" ? <DogLateral /> : <DogDorsal />}
            {markersFor(v.id).map((m, i) => (
              <g key={m.id} onClick={(e) => removeMarker(m.id, e)} style={{ cursor: "pointer" }}>
                <circle cx={m.x} cy={m.y} r={7} fill={MARKER_COLOR} opacity={0.85} />
                <text
                  x={m.x}
                  y={m.y + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="bold"
                  fill="#fff"
                >
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>
        ))}
        <p className="body-diagram-hint">Clique no diagrama para marcar a lesão · Clique no marcador para remover</p>
      </div>

      {value.length > 0 && (
        <ul className="body-diagram-list">
          {value.map((m, i) => (
            <li key={m.id} className="body-diagram-item">
              <span className="body-diagram-badge">{i + 1}</span>
              <span className="body-diagram-view-label">
                {VIEWS.find((v) => v.id === m.view)?.label}
              </span>
              <button
                type="button"
                className="body-diagram-remove"
                onClick={() => onChange(value.filter((x) => x.id !== m.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DogLateral() {
  return (
    <g stroke="#6B7280" strokeWidth="1.5" fill="#F9FAFB">
      {/* Corpo */}
      <ellipse cx="155" cy="105" rx="78" ry="38" />
      {/* Pescoço */}
      <path d="M100 80 Q94 63 107 57 L128 62 Q120 75 112 82 Z" />
      {/* Cabeça */}
      <ellipse cx="112" cy="52" rx="23" ry="19" />
      {/* Focinho */}
      <ellipse cx="97" cy="57" rx="15" ry="11" />
      {/* Orelha */}
      <ellipse cx="126" cy="39" rx="11" ry="15" fill="#E5E7EB" />
      {/* Olho */}
      <circle cx="105" cy="48" r="3" fill="#374151" />
      {/* Nariz */}
      <ellipse cx="84" cy="57" rx="4" ry="3" fill="#374151" />
      {/* Pata dianteira esquerda */}
      <rect x="107" y="138" width="13" height="30" rx="5" />
      {/* Pata dianteira direita */}
      <rect x="126" y="138" width="13" height="30" rx="5" />
      {/* Pata traseira esquerda */}
      <rect x="185" y="135" width="13" height="33" rx="5" />
      {/* Pata traseira direita */}
      <rect x="205" y="135" width="13" height="33" rx="5" />
      {/* Rabo */}
      <path d="M230 90 Q260 58 252 42" fill="none" strokeLinecap="round" strokeWidth="2" />
    </g>
  );
}

function DogDorsal() {
  return (
    <g stroke="#6B7280" strokeWidth="1.5" fill="#F9FAFB">
      {/* Corpo */}
      <ellipse cx="150" cy="103" rx="44" ry="68" />
      {/* Cabeça */}
      <ellipse cx="150" cy="30" rx="24" ry="20" />
      {/* Orelha esquerda */}
      <ellipse cx="130" cy="27" rx="11" ry="17" fill="#E5E7EB" />
      {/* Orelha direita */}
      <ellipse cx="170" cy="27" rx="11" ry="17" fill="#E5E7EB" />
      {/* Pata dianteira esquerda */}
      <rect x="90" y="52" width="13" height="38" rx="5" transform="rotate(-12 96 71)" />
      {/* Pata dianteira direita */}
      <rect x="197" y="52" width="13" height="38" rx="5" transform="rotate(12 203 71)" />
      {/* Pata traseira esquerda */}
      <rect x="90" y="130" width="13" height="38" rx="5" transform="rotate(12 96 149)" />
      {/* Pata traseira direita */}
      <rect x="197" y="130" width="13" height="38" rx="5" transform="rotate(-12 203 149)" />
      {/* Rabo */}
      <path d="M150 169 Q148 180 150 188" fill="none" strokeLinecap="round" strokeWidth="2" />
      {/* Linha da coluna (guia) */}
      <line x1="150" y1="48" x2="150" y2="168" stroke="#D1D5DB" strokeWidth="1" strokeDasharray="4 3" />
    </g>
  );
}
