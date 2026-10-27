import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useShallow } from "zustand/react/shallow";
import type { Vec3 } from "../../../domain/layout3d/tipos";
import { simStore, useSimStore } from "../../../store/simStore";
import { useEscena } from "../contexto";
import { estadoTierra } from "../mapeoVisual";
import Etiqueta from "./Etiqueta";

export const MODULO = 0.036; // ancho de un módulo DIN, 18 mm × 2 de escala
const ALTO_MOD = 0.09;

/* La jabalina queda afuera, frente al tablero. */
export const posJabalina = (t: Vec3): Vec3 => [t[0] - 0.4, 0, t[2] - 0.7];

interface ModuloProps { clave: string; x: number; modulos: number; rotulo: string; color: string }

function Modulo({ clave, x, modulos, rotulo, color }: ModuloProps) {
  const { paleta, reducido } = useEscena();
  const palanca = useRef<Group>(null);
  const seleccionar = () => simStore.getState().actions.setUi3d({ seleccion: { tipo: "proteccion", proteccion: clave, circuitoId: clave === "tg" || clave === "id" ? undefined : clave }, pestana: clave === "tg" || clave === "id" ? "tablero" : "circuitos" });
  const w = modulos * MODULO;
  const estado = useSimStore((s) => {
    const b = clave === "tg" ? s.rt.tg : clave === "id" ? s.rt.id : s.rt.c[clave];
    return !b ? "on" : b.tripped ? "disparada" : b.on ? "on" : "abierta";
  });

  // La palanca gira hacia arriba (cerrada) o hacia abajo (abierta o disparada).
  useFrame((state, dt) => {
    const rt = simStore.getState().rt;
    const b = clave === "tg" ? rt.tg : clave === "id" ? rt.id : rt.c[clave];
    if (!b || !palanca.current) return;
    const objetivo = b.on ? -0.55 : 0.55, actual = palanca.current.rotation.x;
    if (reducido || Math.abs(objetivo - actual) < 0.005) palanca.current.rotation.x = objetivo;
    else { palanca.current.rotation.x += (objetivo - actual) * Math.min(1, dt * 14); state.invalidate(); }
  });

  return (
    <group position={[x + w / 2, 0, 0]}>
      <mesh castShadow userData={{ seleccion: { tipo: "proteccion", proteccion: clave } }}
        onClick={(e) => { e.stopPropagation(); seleccionar(); }}>
        <boxGeometry args={[w * 0.96, ALTO_MOD, 0.06]} />
        <meshStandardMaterial color={paleta.module} roughness={0.6} />
      </mesh>
      {/* Franja con el color del circuito, sin tone mapping para que el tono sea el del tema */}
      <mesh position={[0, ALTO_MOD * 0.36, 0.031]}>
        <boxGeometry args={[w * 0.92, 0.016, 0.002]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <group ref={palanca} position={[0, 0, 0.03]}>
        <mesh position={[0, 0, 0.014]} name={"palanca-" + clave}
          onClick={(e) => { e.stopPropagation(); simStore.getState().actions.lever(clave); seleccionar(); }}
          onPointerOver={(e) => {
            e.stopPropagation(); document.body.style.cursor = "pointer";
            simStore.getState().actions.setUi3d({ hover: { tipo: "proteccion", proteccion: clave, punto: e.point.toArray() as Vec3 } });
          }}
          onPointerOut={() => { document.body.style.cursor = ""; simStore.getState().actions.setUi3d({ hover: null }); }}>
          <boxGeometry args={[Math.min(0.018, w * 0.5), 0.03, 0.028]} />
          <meshStandardMaterial color={estado === "disparada" ? paleta.trip : paleta.ink} emissive={paleta.trip} emissiveIntensity={estado === "disparada" ? 0.6 : 0} roughness={0.5} />
        </mesh>
      </group>
      <Etiqueta position={[0, -ALTO_MOD / 2 - 0.012, 0.03]} className={"v3d-mod" + (estado === "disparada" ? " alerta" : "")} distanceFactor={1.2}>
        {rotulo}{estado === "on" ? "" : estado === "disparada" ? " · DISPARADA" : " · ABIERTA"}
      </Etiqueta>
    </group>
  );
}

export default function Tablero({ posicion }: { posicion: Vec3 }) {
  const { paleta, colores } = useEscena();
  const cfg = useSimStore((s) => s.cfg);
  const { capas } = useSimStore(useShallow((s) => ({ capas: s.ui3d.capas })));
  const alerta = useSimStore((s) => (s.rt.tg.tripped ? "Térmica general disparada: toda la casa sin tensión" : s.rt.id.tripped ? "Diferencial disparado: toda la casa sin tensión" : ""));
  const tg = cfg.tablero.termica_general, di = cfg.tablero.diferencial, pe = cfg.puesta_tierra;
  const mods = [
    // TG e ID en gris: el color queda reservado para identificar circuitos.
    { clave: "tg", modulos: 2, rotulo: `TG ${tg.curva}${tg.amperes}`, color: paleta.muted },
    { clave: "id", modulos: 2, rotulo: `ID ${di.sensibilidad_ma} mA`, color: paleta.muted },
    ...cfg.circuitos.map((k) => ({ clave: k.id, modulos: 1, rotulo: k.id, color: colores[k.id] })),
  ];
  const ancho = mods.reduce((s, m) => s + m.modulos * MODULO, 0) + 0.08;
  let x = -ancho / 2 + 0.04;
  const [tx, ty, tz] = posicion, j = posJabalina(posicion);

  return (
    <group>
      <group position={[tx, ty, tz]}>
        <mesh position={[0, 0, 0.01]} castShadow receiveShadow>
          <boxGeometry args={[ancho, 0.3, 0.08]} />
          <meshStandardMaterial color={paleta.rail} roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <boxGeometry args={[ancho - 0.02, 0.012, 0.004]} />
          <meshStandardMaterial color={paleta.muted} metalness={0.6} roughness={0.4} />
        </mesh>
        <group position={[0, 0, 0.085]}>
          {mods.map((m) => { const el = <Modulo key={m.clave} x={x} {...m} />; x += m.modulos * MODULO; return el; })}
        </group>
        {alerta
          ? <Etiqueta position={[0, 0.22, 0.05]} className="v3d-etq alerta">⚠ {alerta}</Etiqueta>
          : capas.etiquetas && <Etiqueta position={[0, 0.2, 0.05]} className="v3d-etq">Tablero</Etiqueta>}
      </group>
      {/* Conductor de protección hasta la jabalina */}
      <mesh position={[tx - ancho / 2 + 0.03, (ty - 0.15) / 2, tz]}>
        <cylinderGeometry args={[0.006, 0.006, ty - 0.15, 6]} />
        <meshStandardMaterial color={paleta.tierra} />
      </mesh>
      {pe.jabalina ? (
        <group position={j}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
            <meshStandardMaterial color={paleta.tierra} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
            <ringGeometry args={[0.05, 0.09, 24]} />
            <meshBasicMaterial color={paleta.tierra} />
          </mesh>
          {capas.etiquetas && <Etiqueta position={[0, 0.3, 0]} className={"v3d-etq" + (estadoTierra(cfg) === "ok" ? "" : " alerta")}>Jabalina{pe.resistencia_ohm ? ` · ${pe.resistencia_ohm} Ω` : ""}</Etiqueta>}
        </group>
      ) : (
        capas.etiquetas && <Etiqueta position={j} className="v3d-etq alerta">Sin puesta a tierra</Etiqueta>
      )}
    </group>
  );
}
