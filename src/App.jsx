import { useSimulation } from "./useSimulation";
import Board from "./components/Board.jsx";
import Unifilar from "./components/Unifilar.jsx";
import CircuitCard from "./components/CircuitCard.jsx";
import JsonEditor from "./components/JsonEditor.jsx";
import { EventLog, Header, Meter, Status, Validation } from "./components/Panels.jsx";

export default function App() {
  const { cfg, rt, actions } = useSimulation();
  return (
    <div className="wrap">
      <Header rt={rt} actions={actions} />
      <Status cfg={cfg} rt={rt} />
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
    </div>
  );
}
