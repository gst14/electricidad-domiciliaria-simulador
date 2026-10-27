import { useShallow } from "zustand/react/shallow";
import { hms } from "../../domain/simulacion";
import { useSimStore } from "../../store/simStore";

const VELOCIDADES = [1, 10, 60, 300];

/* Controles de simulación siempre visibles sobre el Canvas. */
export default function ControlesSim() {
  const actions = useSimStore((s) => s.actions);
  const { running, speed, simT } = useSimStore(useShallow((s) => ({ running: s.rt.running, speed: s.rt.speed, simT: Math.floor(s.rt.simT) })));
  return (
    <div className="v3d-sim" role="group" aria-label="Simulación">
      <button aria-pressed={running} onClick={actions.togglePlay}>{running ? "❚❚ Pausar" : "▶ Reanudar"}</button>
      <span className="seg" role="group" aria-label="Velocidad de simulación">
        {VELOCIDADES.map((v) => <button key={v} aria-pressed={speed === v} onClick={() => actions.setSpeed(v)}>×{v}</button>)}
      </span>
      <button onClick={actions.rearmAll}>Reiniciar estado</button>
      <span className="num small muted" aria-label="Tiempo simulado">{hms(simT)}</span>
    </div>
  );
}
