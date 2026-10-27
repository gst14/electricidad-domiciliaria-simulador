import { useId } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Capa, PresetCamara } from "../../store/simStore";
import { selectLayout3d, useSimStore } from "../../store/simStore";

const CAPAS: [Capa, string][] = [
  ["casa", "Casa"], ["canerias", "Cañerías"], ["bocas", "Bocas"], ["artefactos", "Artefactos"], ["luminarias", "Luminarias"], ["etiquetas", "Etiquetas"],
];
const CAMARAS: [PresetCamara, string][] = [["iso", "Isométrica"], ["planta", "Planta"], ["tablero", "Tablero"]];

/* Barra flotante: modos de vista, capas y cámaras. */
export default function BarraVista() {
  const id = useId();
  const setUi3d = useSimStore((s) => s.actions.setUi3d);
  const u = useSimStore(useShallow((s) => ({
    rayosX: s.ui3d.rayosX, corte: s.ui3d.corte, techo: s.ui3d.techo, solo: s.ui3d.soloSeleccion, capas: s.ui3d.capas,
    camara: s.ui3d.camara, haySel: !!s.ui3d.seleccion?.circuitoId,
  })));
  const ambientes = useSimStore((s) => selectLayout3d(s).ambientes);
  const pedir = (preset: PresetCamara, ambienteId?: string) => setUi3d((x) => ({ camara: { preset, ambienteId, n: x.camara.n + 1 } }));

  return (
    <div className="v3d-barra" role="toolbar" aria-label="Opciones de vista 3D">
      <span className="seg" role="group" aria-label="Modo de vista">
        <button aria-pressed={u.rayosX} onClick={() => setUi3d({ rayosX: !u.rayosX })} title="Muros semitransparentes: las cañerías se ven a través">Rayos X</button>
        <button aria-pressed={u.corte} onClick={() => setUi3d({ corte: !u.corte })} title="Corta los muros a 1,20 m, como un plano">Corte 1,20 m</button>
        <button aria-pressed={u.techo} onClick={() => setUi3d({ techo: !u.techo })}>Techo</button>
        <button aria-pressed={u.solo} disabled={!u.haySel && !u.solo} onClick={() => setUi3d({ soloSeleccion: !u.solo })}
          title="Muestra solo el circuito seleccionado">Solo selección</button>
      </span>
      <details className="v3d-menu">
        <summary>Capas</summary>
        <div className="v3d-menu-cuerpo">
          {CAPAS.map(([c, t]) => (
            <label key={c} className="campo check">
              <input type="checkbox" className="sw" checked={u.capas[c]} onChange={(e) => setUi3d((x) => ({ capas: { ...x.capas, [c]: e.target.checked } }))} />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </details>
      <span className="seg" role="group" aria-label="Cámara">
        {CAMARAS.map(([p, t]) => <button key={p} aria-pressed={u.camara.preset === p} onClick={() => pedir(p)}>{t}</button>)}
      </span>
      <label className="sr" htmlFor={id}>Ir al ambiente</label>
      <select id={id} value={u.camara.preset === "ambiente" ? u.camara.ambienteId ?? "" : ""} onChange={(e) => e.target.value && pedir("ambiente", e.target.value)}>
        <option value="">Ir al ambiente…</option>
        {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
      </select>
    </div>
  );
}
