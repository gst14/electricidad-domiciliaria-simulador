import { Bvh, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { selectLayout3d, simStore, useSimStore } from "../../store/simStore";
import { coloresCircuitos, usePaleta } from "./colores";
import { EscenaCtx } from "./contexto";
import Artefactos from "./escena/Artefactos";
import Bocas from "./escena/Bocas";
import Camaras from "./escena/Camaras";
import Canerias from "./escena/Canerias";
import Casa from "./escena/Casa";
import Luminarias from "./escena/Luminarias";
import Tablero from "./escena/Tablero";
import { useReducido } from "./useReducido";

function Escena() {
  const layout = useSimStore(selectLayout3d);
  const capas = useSimStore((s) => s.ui3d.capas);
  const W = Math.max(...layout.ambientes.map((a) => a.x + a.ancho)), L = Math.max(...layout.ambientes.map((a) => a.z + a.largo));
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#8a8f8c", 0.6]} />
      <directionalLight position={[W / 2 + 5, 14, L + 7]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-W} shadow-camera-right={W} shadow-camera-top={L} shadow-camera-bottom={-L} shadow-bias={-0.0004}>
        <object3D attach="target" position={[W / 2, 0, L / 2]} />
      </directionalLight>
      <Bvh firstHitOnly>
        <Casa ambientes={layout.ambientes} />
        <Tablero posicion={layout.tablero.posicion} />
        {capas.canerias && <Canerias layout={layout} />}
        {capas.bocas && <Bocas layout={layout} />}
        {capas.luminarias && <Luminarias layout={layout} />}
        {capas.artefactos && <Artefactos layout={layout} />}
      </Bvh>
      <Camaras layout={layout} />
    </>
  );
}

export default function Vista3D() {
  const paleta = usePaleta();
  const reducido = useReducido();
  const cfg = useSimStore((s) => s.cfg);
  const colores = useMemo(() => coloresCircuitos(cfg, paleta), [cfg, paleta]);
  const capaHtml = useRef<HTMLDivElement>(null!);
  const ctx = useMemo(() => ({ paleta, colores, reducido, capaHtml }), [paleta, colores, reducido]);
  const [dpr, setDpr] = useState(1.5);

  return (
    <section className="v3d" aria-label="Vista 3D de la instalación">
      <div className="v3d-lienzo" ref={capaHtml}>
        <EscenaCtx.Provider value={ctx}>
          <Canvas frameloop="demand" shadows dpr={[1, dpr]} camera={{ fov: 45, near: 0.05, far: 200, position: [10, 10, -10] }}
            onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
            onPointerMissed={() => simStore.getState().actions.setUi3d({ seleccion: null })}>
            <color attach="background" args={[paleta.bg]} />
            <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(2)} />
            <Escena />
          </Canvas>
        </EscenaCtx.Provider>
      </div>
    </section>
  );
}
