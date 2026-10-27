import { useEffect, useRef, useState } from "react";
import type { PestanaPanel, UI3D } from "../../../store/simStore";
import { simStore, useSimStore } from "../../../store/simStore";
import InspectorSeleccion from "./InspectorSeleccion";
import PestanaCircuitos from "./PestanaCircuitos";
import PestanaFallas from "./PestanaFallas";
import PestanaTablero from "./PestanaTablero";

const PESTANAS: [PestanaPanel, string][] = [["circuitos", "Circuitos"], ["tablero", "Tablero"], ["fallas", "Fallas"]];
const HOJAS: UI3D["hoja"][] = ["cerrada", "media", "completa"];

export function useEscritorio(): boolean {
  const mq = "(min-width: 1024px)";
  const [v, setV] = useState(() => matchMedia(mq).matches);
  useEffect(() => {
    const m = matchMedia(mq), upd = () => setV(m.matches);
    m.addEventListener("change", upd);
    return () => m.removeEventListener("change", upd);
  }, []);
  return v;
}

/* Asa del bottom sheet: arrastrar elige la altura más cercana; tocar alterna cerrada/media. */
function Asa() {
  const hoja = useSimStore((s) => s.ui3d.hoja), setUi3d = useSimStore((s) => s.actions.setUi3d);
  const inicio = useRef<{ y: number; t: number } | null>(null);
  const fijar = (h: UI3D["hoja"]) => setUi3d({ hoja: h });
  return (
    <button className="asa" aria-label={`Panel de parámetros: ${hoja}. Cambiar altura`}
      onPointerDown={(e) => { inicio.current = { y: e.clientY, t: performance.now() }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerUp={(e) => {
        const i = inicio.current; inicio.current = null;
        if (!i) return;
        const dy = e.clientY - i.y, idx = HOJAS.indexOf(hoja);
        if (Math.abs(dy) < 8) fijar(hoja === "cerrada" ? "media" : "cerrada");
        else fijar(HOJAS[Math.max(0, Math.min(2, idx + (dy < 0 ? 1 : -1) * (Math.abs(dy) > 220 ? 2 : 1)))]);
      }}
      onKeyDown={(e) => {
        const idx = HOJAS.indexOf(hoja);
        if (e.key === "ArrowUp") { e.preventDefault(); fijar(HOJAS[Math.min(2, idx + 1)]); }
        if (e.key === "ArrowDown") { e.preventDefault(); fijar(HOJAS[Math.max(0, idx - 1)]); }
      }}
      onClick={(e) => { if (e.detail === 0) fijar(hoja === "cerrada" ? "media" : "cerrada"); }}>
      <span />
    </button>
  );
}

export default function PanelParametros() {
  const escritorio = useEscritorio();
  const pestana = useSimStore((s) => s.ui3d.pestana);
  const abierto = useSimStore((s) => s.ui3d.panelAbierto);
  const hoja = useSimStore((s) => s.ui3d.hoja);
  const setUi3d = useSimStore((s) => s.actions.setUi3d);

  // Seleccionar algo en 3D abre el panel si estaba cerrado.
  useEffect(() => simStore.subscribe((s) => s.ui3d.seleccion, (sel) => {
    if (!sel) return;
    const u = simStore.getState().ui3d;
    if (!u.panelAbierto) setUi3d({ panelAbierto: true });
    if (u.hoja === "cerrada") setUi3d({ hoja: "media" });
  }), [setUi3d]);

  const cls = escritorio ? "panel3d lateral" + (abierto ? "" : " colapsado") : "panel3d hoja " + hoja;
  return (
    <aside className={cls} aria-label="Parámetros de la instalación">
      {escritorio
        ? <button className="colapsar" aria-expanded={abierto} aria-controls="panel3d-cuerpo" onClick={() => setUi3d({ panelAbierto: !abierto })}
            title={abierto ? "Ocultar panel" : "Mostrar panel"}>{abierto ? "›" : "‹"}<span className="sr">{abierto ? "Ocultar panel" : "Mostrar panel"}</span></button>
        : <Asa />}
      <div id="panel3d-cuerpo" className="panel3d-cuerpo" hidden={escritorio && !abierto}>
        <InspectorSeleccion />
        <div className="seg pestanas" role="tablist" aria-label="Secciones del panel">
          {PESTANAS.map(([id, t]) => (
            <button key={id} role="tab" id={"tab-" + id} aria-selected={pestana === id} aria-controls={"tp-" + id} aria-pressed={pestana === id}
              onClick={() => setUi3d({ pestana: id })}>{t}</button>
          ))}
        </div>
        <div role="tabpanel" id={"tp-" + pestana} aria-labelledby={"tab-" + pestana} className="panel3d-scroll">
          {pestana === "circuitos" ? <PestanaCircuitos /> : pestana === "tablero" ? <PestanaTablero /> : <PestanaFallas />}
        </div>
      </div>
    </aside>
  );
}
