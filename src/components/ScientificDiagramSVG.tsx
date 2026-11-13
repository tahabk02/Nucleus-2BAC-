import { ChapterVisualKind } from '../types/lesson';

interface ScientificDiagramSVGProps {
  visualKind: ChapterVisualKind;
}

/**
 * Illustrations scientifiques vectorielles réalistes (chambre à brouillard / déviation
 * magnétique Rutherford, déplacements (N, Z) de Soddy et spectre d'émission).
 */
export function ScientificDiagramSVG({ visualKind }: ScientificDiagramSVGProps) {
  if (visualKind === 'nucleus-intro') {
    return (
      <div className="rounded-xl bg-[#07090f] border border-white/[0.08] p-3">
        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 mb-2">
          <span>Déviation magnétique (Champ B)</span>
          <span className="text-sky-300">α · β⁻ · β⁺ · γ</span>
        </div>
        <svg viewBox="0 0 320 110" className="w-full h-auto">
          {/* Source block */}
          <rect x="12" y="42" width="24" height="26" rx="3" fill="#111827" stroke="#38bdf8" strokeWidth="1.2" />
          <text x="24" y="59" textAnchor="middle" fill="#f1f5f9" fontSize="9" fontFamily="JetBrains Mono">
            Src
          </text>
          {/* Magnetic field zone */}
          <rect x="65" y="10" width="160" height="90" rx="6" fill="rgba(56,189,248,0.04)" stroke="rgba(148,163,184,0.22)" strokeDasharray="3 3" />
          <text x="145" y="23" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
            Champ B ⊗
          </text>

          {/* Gamma straight */}
          <line x1="36" y1="55" x2="292" y2="55" stroke="#f8fafc" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="298" y="58" fill="#f8fafc" fontSize="10" fontFamily="JetBrains Mono">γ</text>

          {/* Alpha upward slight curve */}
          <path d="M 36 55 Q 150 53 288 30" fill="none" stroke="#f5b041" strokeWidth="2.2" />
          <text x="296" y="32" fill="#f5b041" fontSize="10" fontFamily="JetBrains Mono">α</text>

          {/* Beta+ upward strong curve */}
          <path d="M 36 55 Q 130 48 245 14" fill="none" stroke="#e879f9" strokeWidth="1.8" />
          <text x="253" y="17" fill="#e879f9" fontSize="10" fontFamily="JetBrains Mono">β⁺</text>

          {/* Beta- downward strong curve */}
          <path d="M 36 55 Q 130 62 250 96" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
          <text x="258" y="99" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">β⁻</text>
        </svg>
      </div>
    );
  }

  if (visualKind.startsWith('emission-')) {
    const modeCfg =
      visualKind === 'emission-alpha'
        ? {
            title: 'Trajectoire (N, Z) · Mode α',
            label: 'ΔZ = −2, ΔN = −2',
            color: '#f5b041',
            x1: 215,
            y1: 28,
            x2: 110,
            y2: 82,
            parent: '²³⁸₉₂U',
            daughter: '²³⁴₉₀Th',
          }
        : visualKind === 'emission-beta-minus'
        ? {
            title: 'Trajectoire (N, Z) · Mode β⁻',
            label: 'ΔZ = +1, ΔN = −1',
            color: '#38bdf8',
            x1: 110,
            y1: 30,
            x2: 210,
            y2: 78,
            parent: '²³⁴₉₀Th',
            daughter: '²³⁴₉₁Pa',
          }
        : visualKind === 'emission-beta-plus'
        ? {
            title: 'Trajectoire (N, Z) · Mode β⁺',
            label: 'ΔZ = −1, ΔN = +1',
            color: '#e879f9',
            x1: 210,
            y1: 78,
            x2: 110,
            y2: 30,
            parent: '³⁰₁₅P',
            daughter: '³⁰₁₄Si',
          }
        : {
            title: 'Transition énergétique γ',
            label: 'ΔA = 0, ΔZ = 0',
            color: '#f8fafc',
            x1: 160,
            y1: 26,
            x2: 160,
            y2: 82,
            parent: 'X* (Excité)',
            daughter: 'X (Fondamental)',
          };

    return (
      <div className="rounded-xl bg-[#07090f] border border-white/[0.08] p-3">
        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 mb-2">
          <span>{modeCfg.title}</span>
          <span style={{ color: modeCfg.color }}>{modeCfg.label}</span>
        </div>
        <svg viewBox="0 0 320 105" className="w-full h-auto">
          <defs>
            <marker
              id={`arrow-${visualKind}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill={modeCfg.color} />
            </marker>
          </defs>

          {/* Axes */}
          <line x1="36" y1="12" x2="36" y2="92" stroke="#475569" strokeWidth="1.2" />
          <line x1="36" y1="92" x2="290" y2="92" stroke="#475569" strokeWidth="1.2" />
          <text x="26" y="18" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
            {visualKind === 'emission-gamma' ? 'E' : 'N'}
          </text>
          <text x="292" y="95" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
            {visualKind === 'emission-gamma' ? 't' : 'Z'}
          </text>

          {/* Transition arrow */}
          <line
            x1={modeCfg.x1}
            y1={modeCfg.y1}
            x2={modeCfg.x2}
            y2={modeCfg.y2}
            stroke={modeCfg.color}
            strokeWidth="2.2"
            markerEnd={`url(#arrow-${visualKind})`}
          />

          <circle cx={modeCfg.x1} cy={modeCfg.y1} r="4.5" fill="#f96449" />
          <text
            x={modeCfg.x1 + 8}
            y={modeCfg.y1 + 3}
            fill="#f1f5f9"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            {modeCfg.parent}
          </text>

          <circle cx={modeCfg.x2} cy={modeCfg.y2} r="4.5" fill="#34d399" />
          <text
            x={modeCfg.x2 + 8}
            y={modeCfg.y2 + 4}
            fill="#34d399"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            {modeCfg.daughter}
          </text>
        </svg>
      </div>
    );
  }

  return null;
}
