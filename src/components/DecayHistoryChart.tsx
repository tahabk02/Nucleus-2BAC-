import { Pause, Play, RotateCcw, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DecayHistoryPoint, DecayMode, IsotopePreset } from '../types/lesson';

interface DecayHistoryChartProps {
  history: DecayHistoryPoint[];
  isotope: IsotopePreset;
  decayMode: DecayMode;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onEmitBurst?: () => void;
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  payload?: DecayHistoryPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function DecayHistoryTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="rounded-lg bg-[#07090f] border border-white/[0.14] px-3 py-2 text-[11px] font-mono-tabular shadow-xl space-y-1">
      <div className="text-slate-300 border-b border-white/[0.08] pb-1">
        t = {pt.tHalf.toFixed(2)} t₁/₂ · {pt.elapsedSec.toFixed(1)} s
      </div>
      <div className="flex items-center justify-between gap-4 text-sky-300">
        <span>Noyaux pères :</span>
        <span className="font-semibold">{pt.parentCount} ({pt.parentCount}%)</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-[#f96449]">
        <span>Noyaux fils :</span>
        <span className="font-semibold">{pt.daughterCount} ({pt.daughterCount}%)</span>
      </div>
    </div>
  );
}

export function DecayHistoryChart({
  history,
  isotope,
  decayMode,
  isPlaying,
  onTogglePlay,
  onReset,
  onEmitBurst,
}: DecayHistoryChartProps) {
  const latest = history[history.length - 1] ?? {
    step: 0,
    tHalf: 0,
    elapsedSec: 0,
    parentCount: 100,
    daughterCount: 0,
    theoryParent: 100,
    theoryDaughter: 0,
  };

  const parentLabel = `${isotope.A}${isotope.symbol}`;
  const daughterLabel =
    decayMode === 'gamma'
      ? `${isotope.A}${isotope.symbol} (fond.)`
      : isotope.daughterA && isotope.daughterSymbol
      ? `${isotope.daughterA}${isotope.daughterSymbol}`
      : 'Noyau fils';

  return (
    <div className="space-y-3 select-none">
      {/* Top Action & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[11px] font-mono-tabular">
          <span className="text-sky-300">■ Père ({parentLabel})</span>
          <span className="text-[#f96449]">■ Fils ({daughterLabel})</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onEmitBurst && (
            <button
              type="button"
              onClick={onEmitBurst}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-200 hover:text-white bg-amber-400/12 hover:bg-amber-400/20 border border-amber-400/35 rounded-md transition-colors whitespace-nowrap shrink-0"
              title="Déclencher une désintégration manuelle"
            >
              <Zap className="w-3 h-3" />
              <span>Émettre</span>
            </button>
          )}

          <button
            type="button"
            onClick={onTogglePlay}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#07090f] bg-slate-100 hover:bg-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Simuler</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="p-1.5 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md transition-colors shrink-0"
            title="Réinitialiser à t = 0 (N₀ = 100)"
            aria-label="Réinitialiser l'historique de décroissance"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Real-Time Recharts Dual Population Chart */}
      <div className="h-[196px] w-full rounded-xl bg-[#07090f] border border-white/[0.08] pt-3 pr-2.5 pb-1 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={history}
            margin={{ top: 6, right: 8, left: -16, bottom: 2 }}
          >
            <defs>
              <linearGradient id="parentPopGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.34} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="daughterPopGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f96449" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#f96449" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="rgba(148,163,184,0.12)"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="tHalf"
              type="number"
              domain={[0, (dataMax: number) => Math.max(2, Math.ceil(dataMax * 2) / 2)]}
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              stroke="#475569"
              tickCount={5}
            />

            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              stroke="#475569"
            />

            <ReferenceLine
              y={50}
              stroke="rgba(245,176,65,0.42)"
              strokeDasharray="4 3"
              label={{
                value: 'N₀/2 (t₁/₂)',
                position: 'insideTopRight',
                fill: '#f5b041',
                fontSize: 9,
                fontFamily: 'JetBrains Mono',
              }}
            />

            <Tooltip content={<DecayHistoryTooltip />} />

            <Area
              type="monotone"
              dataKey="parentCount"
              name={`Père (${parentLabel})`}
              stroke="#38bdf8"
              strokeWidth={2.2}
              fill="url(#parentPopGrad)"
              isAnimationActive={false}
            />

            <Area
              type="monotone"
              dataKey="daughterCount"
              name={`Fils (${daughterLabel})`}
              stroke="#f96449"
              strokeWidth={2.2}
              fill="url(#daughterPopGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Live Tabular Population Telemetry */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] font-mono-tabular">
        <div>
          <div className="text-[10px] text-slate-400">Noyaux pères</div>
          <div className="text-sm font-semibold text-sky-300 mt-0.5">
            {latest.parentCount} / 100
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">Noyaux fils</div>
          <div className="text-sm font-semibold text-[#f96449] mt-0.5">
            {latest.daughterCount} / 100
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400">Durée sim.</div>
          <div className="text-sm font-semibold text-slate-100 mt-0.5">
            {latest.tHalf.toFixed(2)} t₁/₂
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
        <span>Équilibre : N(t) + N_D(t) = N₀</span>
        <span>{latest.elapsedSec.toFixed(1)} s · {history.length} pts</span>
      </div>
    </div>
  );
}
