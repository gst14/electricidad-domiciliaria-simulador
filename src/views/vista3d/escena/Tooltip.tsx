import { selectLayout3d, simStore, useSimStore } from "../../../store/simStore";
import { resumenDe } from "../resumen";
import Etiqueta from "./Etiqueta";

/* Tooltip sobre el elemento bajo el cursor, con valores en vivo. */
export default function Tooltip() {
  const hover = useSimStore((s) => s.ui3d.hover);
  useSimStore((s) => (hover ? s.version : 0));
  if (!hover) return null;
  const s = simStore.getState(), r = resumenDe(hover, s.cfg, s.rt, selectLayout3d(s));
  if (!r.titulo) return null;
  return (
    <Etiqueta position={hover.punto} className="v3d-tip" center={false} zIndexRange={[40, 30]}>
      <b>{r.titulo}</b>
      <dl>{r.filas.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </Etiqueta>
  );
}
