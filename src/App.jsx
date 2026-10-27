import { lazy, Suspense, useEffect } from "react";
import { useSimulation } from "./useSimulation";
import { useSimStore } from "./store/simStore";
import Board from "./components/Board.jsx";
import Unifilar from "./components/Unifilar.jsx";
import CircuitCard from "./components/CircuitCard.jsx";
import JsonEditor from "./components/JsonEditor.jsx";
import { EventLog, Header, Meter, Status, Validation } from "./components/Panels.jsx";

const Vista3D = lazy(() => import("./views/vista3d/Vista3D"));

const vistaDeHash = () => (location.hash === "#3d" ? "3d" : "tablero");

function Vistas({ vista }) {
  return (
    <nav className="vistas" aria-label="Vistas">
      <a href="#tablero" aria-current={vista === "tablero" ? "page" : undefined}>Tablero</a>
      <a href="#3d" aria-current={vista === "3d" ? "page" : undefined}>Vista 3D</a>
    </nav>
  );
}

export default function App() {
  const { cfg, rt, actions } = useSimulation();
  const vista = useSimStore((s) => s.ui.vista);

  useEffect(() => {
    const sync = () => actions.setVista(vistaDeHash());
    sync();
    addEventListener("hashchange", sync);
    return () => removeEventListener("hashchange", sync);
  }, [actions]);

  return (
    <div className="wrap">
      <Header rt={rt} actions={actions} />
      <Vistas vista={vista} />
      <Status cfg={cfg} rt={rt} />

      {vista === "3d" ? (
        <Suspense fallback={<div className="panel cargando" role="status">Cargando la vista 3D…</div>}>
          <Vista3D />
        </Suspense>
      ) : (
        <>
          <Meter rt={rt} />

          <div className="main">
            <div className="stack">
              <Board cfg={cfg} rt={rt} onLever={actions.lever} onTest={actions.testId} />
              <Unifilar cfg={cfg} rt={rt} />
            </div>
            <section className="stack" aria-labelledby="h-circ">
              <h2 id="h-circ">Circuitos</h2>
              <div className="stack" style={{ gap: 14 }}>
                {cfg.circuitos.map((k, ci) => <CircuitCard key={k.id} cfg={cfg} rt={rt} k={k} ci={ci} actions={actions} />)}
              </div>
            </section>
          </div>

          <div className="lower">
            <Validation cfg={cfg} />
            <EventLog rt={rt} onClear={actions.clearLog} />
          </div>

          <JsonEditor cfg={cfg} actions={actions} />
        </>
      )}
    </div>
  );
}
