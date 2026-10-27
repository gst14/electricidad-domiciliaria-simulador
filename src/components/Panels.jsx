import { useMemo } from "react";
import { fmt, hms, statusOf, validate } from "../lib/sim";

const SPEEDS = [1, 10, 60, 300];

export function Header({ rt, actions }) {
  return (
    <header className="top">
      <div>
        <div className="wires" aria-hidden="true"><span style={{ background: "var(--fase)" }} /><span style={{ background: "var(--neutro)" }} /><span style={{ background: "var(--tierra)" }} /></div>
        <h1>Tablerista</h1>
        <p>Simulador de instalación eléctrica monofásica 220 V: medidor, térmica general, diferencial y circuitos IUG, TUG y TUE. Encendé artefactos, provocá fallas y mirá qué protección actúa.</p>
      </div>
      <div className="row">
        <button aria-pressed={rt.running} onClick={actions.togglePlay}>{rt.running ? "Pausar" : "Reanudar"}</button>
        <span className="seg" role="group" aria-label="Velocidad de simulación">
          {SPEEDS.map((s) => <button key={s} aria-pressed={rt.speed === s} onClick={() => actions.setSpeed(s)}>×{s}</button>)}
        </span>
        <button onClick={actions.rearmAll}>Rearmar todo</button>
      </div>
    </header>
  );
}

export function Status({ cfg, rt }) {
  const { cl, msg } = statusOf(cfg, rt);
  return <div className={"status " + cl} role="status"><span className="dot" /><span className="msg">{msg}</span></div>;
}

export function Meter({ rt }) {
  return (
    <section className="meter" aria-label="Medidor">
      <div><span className="lab">Corriente</span><span className="val">{fmt(rt.I)} <small>A</small></span></div>
      <div><span className="lab">Potencia</span><span className="val">{fmt(rt.P / 1000, 2)} <small>kW</small></span></div>
      <div><span className="lab">Energía</span><span className="val">{fmt(rt.kwh, 3)} <small>kWh</small></span></div>
      <div><span className="lab">Fuga a tierra</span><span className="val">{fmt(rt.leak, 0)} <small>mA</small></span></div>
      <div><span className="lab">Tiempo simulado</span><span className="val">{hms(rt.simT)}</span></div>
    </section>
  );
}

export function Validation({ cfg }) {
  const { checks, gr, maxI } = useMemo(() => validate(cfg), [cfg]);
  return (
    <section className="panel" aria-labelledby="h-val">
      <h2 id="h-val">Verificación del proyecto</h2>
      <ul className="checks">
        {checks.map(([s, m], i) => <li key={i}><span className={`sev ${s}`}>{s === "error" ? "Error" : s === "warn" ? "Aviso" : "OK"}</span><span>{m}</span></li>)}
      </ul>
      <div className="grado">
        <span><span className="muted">Superficie</span> <b className="num">{cfg.superficie_m2 || "—"} m²</b></span>
        <span><span className="muted">Grado</span> <b>{gr ? gr.g : "—"}</b></span>
        <span><span className="muted">Circuitos mín.</span> <b className="num">{gr ? gr.min : "—"}</b></span>
        <span><span className="muted">Todo encendido</span> <b className="num">{fmt(maxI)} A</b></span>
      </div>
    </section>
  );
}

export function EventLog({ rt, onClear }) {
  return (
    <section className="panel" aria-labelledby="h-log">
      <div className="row" style={{ justifyContent: "space-between" }}><h2 id="h-log">Registro de eventos</h2><button onClick={onClear}>Limpiar</button></div>
      <ul className="log">
        {rt.log.length
          ? rt.log.map((e, i) => <li key={rt.log.length - i}><time>{hms(e.t)}</time><span className={`t-${e.type}`}>{e.msg}</span></li>)
          : <li className="empty">Todavía no pasó nada. Probá encender la pava, el microondas y la estufa en Tomas.</li>}
      </ul>
    </section>
  );
}
