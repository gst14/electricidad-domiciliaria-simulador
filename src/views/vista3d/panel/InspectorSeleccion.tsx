import { selectLayout3d, simStore, useSimStore } from "../../../store/simStore";
import { resumenDe } from "../resumen";

export default function InspectorSeleccion() {
  const sel = useSimStore((s) => s.ui3d.seleccion);
  useSimStore((s) => (sel ? s.version : 0));
  const actions = useSimStore((s) => s.actions);
  if (!sel) return <p className="muted small inspector-vacio">Tocá una cañería, boca, artefacto o palanca para inspeccionarla.</p>;
  const s = simStore.getState(), r = resumenDe(sel, s.cfg, s.rt, selectLayout3d(s));
  const p = sel.tipo === "proteccion" ? sel.proteccion! : null;
  const b = p ? (p === "tg" ? s.rt.tg : p === "id" ? s.rt.id : s.rt.c[p]) : null;
  return (
    <section className="inspector" aria-label="Selección" aria-live="polite">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <b>{r.titulo}</b>
        <button className="x" aria-label="Quitar selección" onClick={() => actions.setUi3d({ seleccion: null })}>×</button>
      </div>
      <dl>{r.filas.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl>
      {p && b && (b.on
        ? <button onClick={() => actions.lever(p)}>Bajar palanca</button>
        : <button className="primario" onClick={() => actions.rearmar(p)}>Rearmar</button>)}
    </section>
  );
}
