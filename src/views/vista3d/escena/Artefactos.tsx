import { useMemo } from "react";
import { Vector3 } from "three";
import { fmt } from "../../../domain/simulacion";
import type { Circuito } from "../../../domain/simulacion";
import { bocaDeCarga, claseDe } from "../../../domain/layout3d/generarLayout";
import type { Boca, Layout3D, Vec3 } from "../../../domain/layout3d/tipos";
import type { Seleccion } from "../../../store/simStore";
import { simStore, useSimStore } from "../../../store/simStore";
import { useEscena } from "../contexto";
import { hayTension } from "../mapeoVisual";
import { eventosHover, opacidadSeleccion } from "./Canerias";
import Etiqueta from "./Etiqueta";

type Forma = { tam: Vec3; cilindro?: boolean; enMuro?: boolean };

/* Primitiva aproximada según el nombre del artefacto. */
export function formaDe(nombre: string): Forma {
  const n = nombre.toLowerCase();
  if (n.includes("heladera")) return { tam: [0.6, 1.7, 0.65] };
  if (n.includes("aire")) return { tam: [0.85, 0.28, 0.22], enMuro: true };
  if (n.includes("termotanque")) return { tam: [0.45, 0.9, 0.45], cilindro: true, enMuro: true };
  if (n.includes("lavarropas")) return { tam: [0.6, 0.85, 0.6] };
  if (n.includes("televisor")) return { tam: [0.9, 0.55, 0.06] };
  if (n.includes("microondas")) return { tam: [0.5, 0.3, 0.38] };
  if (n.includes("horno")) return { tam: [0.55, 0.4, 0.45] };
  if (n.includes("estufa")) return { tam: [0.6, 0.55, 0.2] };
  if (n.includes("pava")) return { tam: [0.18, 0.24, 0.18], cilindro: true };
  if (n.includes("bomba")) return { tam: [0.3, 0.3, 0.4], cilindro: true };
  return { tam: [0.3, 0.25, 0.25] };
}

export interface Ubicacion { ci: number; ai: number; k: Circuito; boca: Boca; posicion: Vec3; forma: Forma; normal: Vec3 }

/* Dónde va cada artefacto: frente a su boca, apoyado en el piso (o colgado del muro). */
export function ubicarArtefactos(circuitos: Circuito[], layout: Layout3D): Ubicacion[] {
  const out: Ubicacion[] = [], usados = new Map<string, number>();
  circuitos.forEach((k, ci) => {
    if (claseDe(k.tipo) === "luz") return;
    k.cargas.forEach((a, ai) => {
      const boca = bocaDeCarga(layout, k, ai);
      if (!boca) return;
      const forma = formaDe(a.nombre), n = new Vector3(...boca.normal);
      const lateral = new Vector3(n.z, 0, -n.x), j = usados.get(boca.id) ?? 0;
      usados.set(boca.id, j + 1);
      const p = new Vector3(...boca.posicion).addScaledVector(n, forma.tam[2] / 2 + 0.03).addScaledVector(lateral, (j % 2 ? -1 : 1) * Math.ceil(j / 2) * 0.7);
      p.y = forma.enMuro ? boca.posicion[1] : forma.tam[1] / 2;
      out.push({ ci, ai, k, boca, posicion: [p.x, p.y, p.z], forma, normal: boca.normal });
    });
  });
  return out;
}

function Artefacto({ u }: { u: Ubicacion }) {
  const { paleta, colores } = useEscena();
  const etiquetas = useSimStore((s) => s.ui3d.capas.etiquetas);
  // Solo re-renderiza cuando cambia lo que se ve, no en cada tick.
  const estado = useSimStore((s) => {
    const a = s.cfg.circuitos[u.ci]?.cargas[u.ai];
    const on = !!a?.encendida && hayTension(s.rt, u.k.id);
    return `${on ? 1 : 0}|${a?.encendida ? 1 : 0}|${opacidadSeleccion(s.ui3d.seleccion, u.k.id)}|${s.ui3d.soloSeleccion ? 1 : 0}`;
  });
  const [on, enc, op, solo] = estado.split("|").map(Number);
  const a = u.k.cargas[u.ai];
  const rotY = Math.atan2(u.normal[0], u.normal[2]);
  const [w, h, d] = u.forma.tam;
  const sel: Seleccion = { tipo: "artefacto", circuitoId: u.k.id, cargaIndex: u.ai, bocaId: u.boca.id };
  if (solo && op < 1) return null;
  return (
    <group position={u.posicion} rotation-y={rotY}>
      <mesh castShadow receiveShadow name={`artefacto-${u.k.id}-${u.ai}`} userData={{ seleccion: sel }}
        onClick={(e) => { e.stopPropagation(); simStore.getState().actions.setUi3d({ seleccion: sel, pestana: "circuitos" }); }}
        {...eventosHover(sel)}>
        {u.forma.cilindro ? <cylinderGeometry args={[w / 2, w / 2, h, 20]} /> : <boxGeometry args={[w, h, d]} />}
        <meshStandardMaterial color={paleta.module} roughness={0.55} metalness={0.1} transparent opacity={op}
          emissive={colores[u.k.id]} emissiveIntensity={on ? 0.35 : 0} />
      </mesh>
      {etiquetas && op === 1 && (
        <Etiqueta position={[0, h / 2 + 0.12, 0]} className="v3d-etq">
          {a.nombre} · {on ? `${fmt(a.potencia_w, 0)} W` : enc ? "sin tensión" : "apagado"}
        </Etiqueta>
      )}
    </group>
  );
}

export default function Artefactos({ layout }: { layout: Layout3D }) {
  const cfg = useSimStore((s) => s.cfg);
  const lista = useMemo(() => ubicarArtefactos(cfg.circuitos, layout), [cfg.circuitos, layout]);
  return <group>{lista.map((u) => <Artefacto key={`${u.k.id}-${u.ai}`} u={u} />)}</group>;
}
