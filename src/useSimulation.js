import { useSimStore } from "./store/simStore";

// cfg y rt viven en el store compartido; version cambia en cada tick o acción
// y fuerza el render de quien use este hook (rt es mutable).
export function useSimulation() {
  const cfg = useSimStore((s) => s.cfg);
  const rt = useSimStore((s) => s.rt);
  const actions = useSimStore((s) => s.actions);
  useSimStore((s) => s.version);
  return { cfg, rt, actions };
}
