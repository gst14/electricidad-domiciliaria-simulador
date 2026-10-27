import { CameraControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import type { Layout3D } from "../../../domain/layout3d/tipos";
import type { UI3D } from "../../../store/simStore";
import { simStore, useSimStore } from "../../../store/simStore";
import { useEscena } from "../contexto";

type Pose = [number, number, number, number, number, number]; // posición + objetivo

export function poseDe(c: UI3D["camara"], L: Layout3D): Pose {
  const W = Math.max(...L.ambientes.map((a) => a.x + a.ancho)), Lz = Math.max(...L.ambientes.map((a) => a.z + a.largo));
  const D = Math.hypot(W, Lz), cx = W / 2, cz = Lz / 2;
  switch (c.preset) {
    case "planta": return [cx, D * 1.25, cz + 0.01, cx, 0, cz];
    case "tablero": { const [x, y, z] = L.tablero.posicion; return [x, y + 0.05, z + 0.85, x, y, z]; }
    case "ambiente": {
      const a = L.ambientes.find((x) => x.id === c.ambienteId) ?? L.ambientes[0];
      const ax = a.x + a.ancho / 2, az = a.z + a.largo / 2, m = Math.max(a.ancho, a.largo);
      return [ax, a.alto + m * 1.1, az - m * 0.9, ax, 0.8, az];
    }
    default: return [cx + D * 0.5, D * 0.7, Lz + D * 0.55, cx, 0.4, cz];
  }
}

export default function Camaras({ layout }: { layout: Layout3D }) {
  const ref = useRef<CameraControls>(null);
  const { reducido } = useEscena();
  const pedido = useSimStore((s) => s.ui3d.camara);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Al montar: vuelve a la pose guardada (si se cambió de vista) o a la isométrica.
  useEffect(() => {
    const cc = ref.current;
    if (!cc) return;
    const guardada = simStore.getState().ui3d.pose;
    cc.setLookAt(...((guardada as Pose | null) ?? poseDe({ preset: "iso", n: 0 }, layoutRef.current)), false);
    return () => {
      const p = cc.getPosition(new Vector3()), t = cc.getTarget(new Vector3());
      simStore.getState().actions.setUi3d({ pose: [...p.toArray(), ...t.toArray()] });
    };
  }, []);

  // Cada pedido de cámara (n cambia) mueve la vista; editar parámetros no la toca.
  useEffect(() => {
    if (pedido.n === 0) return;
    ref.current?.setLookAt(...poseDe(pedido, layoutRef.current), !reducido);
  }, [pedido, reducido]);

  return <CameraControls ref={ref} makeDefault minDistance={0.3} maxDistance={60} maxPolarAngle={Math.PI * 0.495} smoothTime={reducido ? 0 : 0.35} />;
}
