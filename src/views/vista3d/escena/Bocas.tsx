import type { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Matrix4, Vector3 } from "three";
import type { InstancedMesh } from "three";
import type { Boca, Layout3D, TipoBoca } from "../../../domain/layout3d/tipos";
import { simStore } from "../../../store/simStore";
import { useEscena } from "../contexto";
import { rotacionDesdeNormal } from "../geometria";

// Tamaño de cada tipo de boca (caja orientada con la normal: ancho, alto, espesor).
const FORMA: Record<TipoBoca, [number, number, number]> = {
  centro: [0.1, 0.1, 0.025],
  aplique: [0.08, 0.08, 0.03],
  toma: [0.07, 0.07, 0.015],
  llave: [0.07, 0.11, 0.015],
  caja_paso: [0.1, 0.1, 0.03],
};
const TIPOS = Object.keys(FORMA) as TipoBoca[];

const m4 = new Matrix4(), uno = new Vector3(1, 1, 1), color = new Color();

export function seleccionarBoca(b: Boca) {
  simStore.getState().actions.setUi3d({ seleccion: { tipo: "boca", circuitoId: b.circuitoId, bocaId: b.id }, pestana: "circuitos" });
}

function BocasTipo({ tipo, bocas }: { tipo: TipoBoca; bocas: Boca[] }) {
  const { colores } = useEscena();
  const ref = useRef<InstancedMesh>(null);
  const [w, h, e] = FORMA[tipo];

  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    bocas.forEach((b, i) => {
      const q = rotacionDesdeNormal(b.normal);
      const p = new Vector3(...b.posicion).addScaledVector(new Vector3(...b.normal), e / 2);
      im.setMatrixAt(i, m4.compose(p, q, uno));
      im.setColorAt(i, color.set(colores[b.circuitoId] ?? "#888"));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
  }, [bocas, colores, e]);

  const click = (ev: ThreeEvent<MouseEvent>) => {
    ev.stopPropagation();
    if (ev.instanceId !== undefined) seleccionarBoca(bocas[ev.instanceId]);
  };

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bocas.length]} key={bocas.length} castShadow onClick={click}
      userData={{ bocas }}>
      <boxGeometry args={[w, h, e]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

export default function Bocas({ layout }: { layout: Layout3D }) {
  const porTipo = useMemo(() => TIPOS.map((t) => [t, layout.bocas.filter((b) => b.tipo === t)] as const).filter(([, b]) => b.length), [layout]);
  return <group>{porTipo.map(([t, b]) => <BocasTipo key={t} tipo={t} bocas={b} />)}</group>;
}
