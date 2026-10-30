/**
 * Ilustração da página inicial: um chip central com trilhas de placa de
 * circuito levando às peças. Um "sinal" em cobre percorre as trilhas.
 */
const TRACES: { d: string; pad: [number, number]; label: string; anchor: "start" | "end" | "middle"; lx: number; ly: number }[] = [
  { d: "M150 130 H105 L75 100 H34", pad: [28, 100], label: "CPU", anchor: "start", lx: 22, ly: 86 },
  { d: "M150 160 H40", pad: [34, 160], label: "RAM", anchor: "start", lx: 22, ly: 146 },
  { d: "M150 190 H110 L80 220 H40", pad: [34, 220], label: "SSD", anchor: "start", lx: 22, ly: 240 },
  { d: "M250 130 H295 L325 100 H366", pad: [372, 100], label: "GPU", anchor: "end", lx: 378, ly: 86 },
  { d: "M250 160 H360", pad: [366, 160], label: "MB", anchor: "end", lx: 378, ly: 146 },
  { d: "M250 190 H290 L320 220 H366", pad: [372, 220], label: "PSU", anchor: "end", lx: 378, ly: 240 },
  { d: "M185 110 V60 L165 40 V22", pad: [165, 16], label: "", anchor: "middle", lx: 0, ly: 0 },
  { d: "M215 110 V60 L235 40 V22", pad: [235, 16], label: "", anchor: "middle", lx: 0, ly: 0 },
  { d: "M200 210 V292", pad: [200, 298], label: "", anchor: "middle", lx: 0, ly: 0 },
];

export function CircuitArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 320" className={className} role="img" aria-label="Ilustração de um chip conectado às peças do PC por trilhas de circuito">
      {/* Trilhas */}
      <g fill="none" strokeWidth="2" strokeLinejoin="round" className="stroke-brand/70">
        {TRACES.map((trace) => (
          <path key={trace.d} d={trace.d} />
        ))}
      </g>
      {/* Sinal percorrendo as trilhas */}
      <g fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-copper">
        {TRACES.map((trace, i) => (
          <path key={trace.d} d={trace.d} className="trace-signal" style={{ animationDelay: `${i * 0.45}s` }} />
        ))}
      </g>
      {/* Ilhas de solda */}
      {TRACES.map((trace) => (
        <g key={`pad-${trace.d}`}>
          <circle cx={trace.pad[0]} cy={trace.pad[1]} r="6" className="fill-canvas stroke-copper" strokeWidth="2" />
          <circle cx={trace.pad[0]} cy={trace.pad[1]} r="2" className="fill-copper" />
        </g>
      ))}
      {/* Rótulos */}
      <g className="fill-subtle font-mono" fontSize="10" letterSpacing="1">
        {TRACES.filter((trace) => trace.label).map((trace) => (
          <text key={trace.label} x={trace.lx} y={trace.ly} textAnchor={trace.anchor}>
            {trace.label}
          </text>
        ))}
      </g>
      {/* Chip */}
      <g className="stroke-ink" strokeWidth="2">
        {[165, 200, 235].map((x) => (
          <g key={`v${x}`}>
            <line x1={x} y1="104" x2={x} y2="110" />
            <line x1={x} y1="210" x2={x} y2="216" />
          </g>
        ))}
        {[130, 160, 190].map((y) => (
          <g key={`h${y}`}>
            <line x1="144" y1={y} x2="150" y2={y} />
            <line x1="250" y1={y} x2="256" y2={y} />
          </g>
        ))}
      </g>
      <rect x="150" y="110" width="100" height="100" className="fill-ink" />
      <rect x="162" y="122" width="76" height="76" fill="none" className="stroke-canvas/30" strokeWidth="1" />
      <text x="200" y="166" textAnchor="middle" className="fill-canvas font-mono" fontSize="22" fontWeight="600" letterSpacing="2">
        AI
      </text>
      <circle cx="160" cy="200" r="2.5" className="fill-copper" />
    </svg>
  );
}
