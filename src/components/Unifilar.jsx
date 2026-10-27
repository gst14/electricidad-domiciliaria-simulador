import { fmt } from "../domain/simulacion/sim.js";

function T({ x, y, t, a = "start", c = "var(--ink)", w = 400, s = 12 }) {
  return <text x={x} y={y} textAnchor={a} fill={c} fontFamily="IBM Plex Mono, monospace" fontSize={s} fontWeight={w}>{t}</text>;
}
function Wire({ x1, y1, x2, y2, on, color }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color ?? (on ? "var(--live)" : "var(--line)")} strokeWidth="2.5" className={on ? "flow" : undefined} />;
}
function Breaker({ x, y, color, children }) {
  return (
    <g>
      <line x1={x} y1={y - 20} x2={x} y2={y} stroke={color} strokeWidth="2.5" />
      <circle cx={x} cy={y + 4} r="4" fill="var(--surface)" stroke={color} strokeWidth="2" />
      <circle cx={x} cy={y + 30} r="4" fill="var(--surface)" stroke={color} strokeWidth="2" />
      <path d={`M${x + 3} ${y + 1} Q ${x + 18} ${y + 17} ${x + 3} ${y + 33}`} fill="none" stroke={color} strokeWidth="2" />
      <line x1={x} y1={y + 34} x2={x} y2={y + 54} stroke={color} strokeWidth="2.5" />
      {children}
    </g>
  );
}

export default function Unifilar({ cfg, rt }) {
  const n = cfg.circuitos.length, gap = 128, x0 = 150, bx = x0 + 110, W = Math.max(400, bx + (n - 1) * gap + 120), H = 470;
  const live = rt.tg.on && rt.id.on, col = (on) => (on ? "var(--live)" : "var(--line)");
  const tg = cfg.tablero.termica_general, di = cfg.tablero.diferencial, pe = cfg.puesta_tierra;
  const tgc = rt.tg.tripped ? "var(--trip)" : col(rt.tg.on);
  const idc = rt.id.tripped ? "var(--trip)" : col(live);
  return (
    <section className="panel" aria-labelledby="h-uni">
      <h2 id="h-uni">Esquema unifilar en vivo</h2>
      <div className="svgbox" style={{ marginTop: 10 }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Esquema unifilar del tablero">
          <rect x={x0 - 14} y="20" width="28" height="22" rx="3" fill="var(--module)" stroke="var(--muted)" />
          <T x={x0} y={35} t="kWh" a="middle" c="var(--muted)" w={500} s={10} />
          <T x={x0 + 24} y={30} t="Medidor" w={500} />
          <T x={x0 + 24} y={45} t={cfg.tension_v + " V · 1~"} c="var(--muted)" />
          <Wire x1={x0} y1={42} x2={x0} y2={62} on />

          <Breaker x={x0} y={82} color={tgc}>
            <T x={x0 - 14} y={105} t={`TG ${tg.polos}×${tg.amperes} A`} a="end" w={500} />
            <T x={x0 - 14} y={120} t={`curva ${tg.curva}`} a="end" c="var(--muted)" />
          </Breaker>

          <Wire x1={x0} y1={136} x2={x0} y2={160} on={rt.tg.on} />
          <rect x={x0 - 22} y="160" width="44" height="40" rx="4" fill="var(--surface)" stroke={idc} strokeWidth="2" />
          <T x={x0} y={185} t="IΔ" a="middle" c={idc} w={500} s={13} />
          <T x={x0 - 30} y={176} t={`ID ${di.polos}×${di.amperes} A`} a="end" w={500} />
          <T x={x0 - 30} y={191} t={`${di.sensibilidad_ma} mA`} a="end" c="var(--muted)" />
          <Wire x1={x0} y1={200} x2={x0} y2={236} on={live} />
          <Wire x1={x0} y1={236} x2={bx + (n - 1) * gap} y2={236} on={live} />
          <circle cx={x0} cy="236" r="4" fill={col(live)} />

          {cfg.circuitos.map((k, i) => {
            const s = rt.c[k.id], x = bx + i * gap, on = live && s.on, c = s.tripped ? "var(--trip)" : col(on), flow = on && s.I > 0.01;
            return (
              <g key={k.id}>
                <Wire x1={x} y1={236} x2={x} y2={262} on={live} />
                <Breaker x={x} y={282} color={c}>
                  <T x={x + 22} y={300} t={`${k.tipo} ${k.curva}${k.amperes}`} w={500} />
                  <T x={x + 22} y={315} t={`${fmt(k.seccion_mm2)} mm²`} c="var(--muted)" />
                </Breaker>
                <Wire x1={x} y1={336} x2={x} y2={392} on={flow} />
                <circle cx={x} cy="398" r="5" fill="var(--surface)" stroke="var(--muted)" strokeWidth="2" />
                <T x={x} y={420} t={k.id} a="middle" w={500} />
                <T x={x} y={436} t={k.descripcion.slice(0, 16)} a="middle" c="var(--muted)" />
                <T x={x} y={452} t={fmt(s.I) + " A"} a="middle" c={flow ? "var(--live)" : "var(--muted)"} w={500} />
              </g>
            );
          })}

          <path d={`M${x0 - 50} 236 L${x0 - 50} 400`} stroke="var(--tierra)" strokeWidth="2.5" fill="none" strokeDasharray={pe.jabalina ? "0" : "5 5"} />
          <path d={`M${x0 - 62} 400 L${x0 - 38} 400 M${x0 - 58} 406 L${x0 - 42} 406 M${x0 - 54} 412 L${x0 - 46} 412`} stroke="var(--tierra)" strokeWidth="2" />
          <T x={x0 - 50} y={430} t="PE" a="middle" c="var(--tierra)" w={500} />
          <T x={x0 - 50} y={446} t={pe.jabalina ? (pe.resistencia_ohm ? pe.resistencia_ohm + " Ω" : "jabalina") : "sin tierra"} a="middle" c={pe.jabalina ? "var(--muted)" : "var(--trip)"} />
        </svg>
      </div>
    </section>
  );
}
