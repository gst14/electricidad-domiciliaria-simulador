import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Matrix4, Vector3 } from "three";
import type { InstancedMesh } from "three";
import type { Boca, Layout3D, TipoBoca } from "../../../domain/layout3d/tipos";
import { simStore } from "../../../store/simStore";
import { useEscena } from "../contexto";
import { rotacionDesdeNormal } from "../geometria";
import { colorNivel, estadoVisualCircuito } from "../mapeoVisual";
import { opacidadSeleccion } from "./Canerias";
import type { Vec3 } from "../../../domain/layout3d/tipos";

// Tamaño de cada tipo de boca (caja orientada con la normal: ancho, alto, espesor).
const FORMA: Record<TipoBoca, [number, number, number]> = {
  centro: [0.1, 0.1, 0.025],
  aplique: [0.08, 0.08, 0.03],
  toma: [0.07, 0.07, 0.015],
  llave: [0.07, 0.11, 0.015],
  caja_paso: [0.1, 0.1, 0.03],
};
const TIPOS = Object.keys(FORMA) as TipoBoca[];

const m4 = new Matrix4(), uno = new Vector3(1, 1, 1), color = new Color(), fondo = new Color();

export function seleccionarBoca(b: Boca) {
  simStore.getState().actions.setUi3d({ seleccion: { tipo: "boca", circuitoId: b.circuitoId, bocaId: b.id }, pestana: "circuitos" });
}

/* Tooltip sobre una instancia: identifica la boca por instanceId. */
export function hoverBocas(bocas: Boca[]) {
  return {
    onPointerMove: (ev: ThreeEvent<PointerEvent>) => {
      ev.stopPropagation();
      if (ev.instanceId === undefined) return;
      const b = bocas[ev.instanceId], h = simStore.getState().ui3d.hover;
      document.body.style.cursor = "pointer";
      if (h?.bocaId !== b.id) simStore.getState().actions.setUi3d({ hover: { tipo: "boca", circuitoId: b.circuitoId, bocaId: b.id, punto: b.posicion as Vec3 } });
    },
    onPointerOut: () => { document.body.style.cursor = ""; simStore.getState().actions.setUi3d({ hover: null }); },
  };
}

function BocasTipo({ tipo, bocas }: { tipo: TipoBoca; bocas: Boca[] }) {
  const { colores, paleta } = useEscena();
  const ref = useRef<InstancedMesh>(null);
  const visto = useRef<{ version: number; ui: unknown }>({ version: -1, ui: null });
  const [w, h, e] = FORMA[tipo];

  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    bocas.forEach((b, i) => {
      const q = rotacionDesdeNormal(b.normal);
      const p = new Vector3(...b.posicion).addScaledVector(new Vector3(...b.normal), e / 2);
      im.setMatrixAt(i, m4.compose(p, q, uno));
    });
    visto.current.version = -1; // fuerza recolorear
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
  }, [bocas, e]);

  // Color según el estado del circuito; solo se recalcula cuando cambia la simulación o la selección.
  useFrame(() => {
    const im = ref.current, { cfg, rt, version, ui3d } = simStore.getState();
    if (!im || (visto.current.version === version && visto.current.ui === ui3d)) return;
    visto.current = { version, ui: ui3d };
    const estados = new Map(cfg.circuitos.map((k) => [k.id, estadoVisualCircuito(cfg, rt, k)]));
    bocas.forEach((b, i) => {
      const e = estados.get(b.circuitoId);
      color.set(e ? colorNivel(e.nivel, colores[b.circuitoId] ?? "#888", paleta) : paleta.line);
      const op = opacidadSeleccion(ui3d.seleccion, b.circuitoId);
      if (op < 1) color.lerp(fondo.set(paleta.bg), ui3d.soloSeleccion ? 1 : 0.75);
      im.setColorAt(i, color);
    });
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  const click = (ev: ThreeEvent<MouseEvent>) => {
    ev.stopPropagation();
    if (ev.instanceId !== undefined) seleccionarBoca(bocas[ev.instanceId]);
  };

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bocas.length]} key={bocas.length} castShadow onClick={click}
      userData={{ bocas }} name={"bocas-" + tipo}
      {...hoverBocas(bocas)}>
      <boxGeometry args={[w, h, e]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

export default function Bocas({ layout }: { layout: Layout3D }) {
  const porTipo = useMemo(() => TIPOS.map((t) => [t, layout.bocas.filter((b) => b.tipo === t)] as const).filter(([, b]) => b.length), [layout]);
  return <group>{porTipo.map(([t, b]) => <BocasTipo key={t} tipo={t} bocas={b} />)}</group>;
}
