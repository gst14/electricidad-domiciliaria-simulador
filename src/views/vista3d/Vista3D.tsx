import { Bvh, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Outline, Selection } from "@react-three/postprocessing";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Color } from "three";
import { selectLayout3d, simStore, useSimStore } from "../../store/simStore";
import { coloresCircuitos, usePaleta } from "./colores";
import { EscenaCtx, useEscena } from "./contexto";
import Artefactos from "./escena/Artefactos";
import Bocas from "./escena/Bocas";
import Camaras from "./escena/Camaras";
import Canerias from "./escena/Canerias";
import Casa from "./escena/Casa";
import Fallas from "./escena/Fallas";
import Luminarias from "./escena/Luminarias";
import Tablero from "./escena/Tablero";
import Tooltip from "./escena/Tooltip";
import BarraVista from "./BarraVista";
import ControlesSim from "./ControlesSim";
import PanelParametros from "./panel/PanelParametros";
import { hayAnimacion } from "./mapeoVisual";
import { useReducido } from "./useReducido";

/*
 * Con frameloop="demand" solo se dibuja cuando algo cambia: cada cambio del store invalida,
 * y mientras haya animación (flujo, pulsos) se pide el frame siguiente. En pausa: 0 frames.
 */
function Animador() {
  const invalidate = useThree((s) => s.invalidate);
  const { reducido } = useEscena();
  useEffect(() => simStore.subscribe(() => invalidate()), [invalidate]);
  useFrame(() => {
    const { cfg, rt } = simStore.getState();
    if (hayAnimacion(cfg, rt, reducido)) invalidate();
  });
  return null;
}

const Debug3D = import.meta.env.DEV ? lazy(() => import("./Debug3D")) : null;
const conDebug = () => import.meta.env.DEV && new URLSearchParams(location.search).has("debug");

function Escena({ efectos }: { efectos: boolean }) {
  const layout = useSimStore(selectLayout3d);
  const capas = useSimStore((s) => s.ui3d.capas);
  const W = Math.max(...layout.ambientes.map((a) => a.x + a.ancho)), L = Math.max(...layout.ambientes.map((a) => a.z + a.largo));
  const { paleta } = useEscena();
  const haySeleccion = useSimStore((s) => !!s.ui3d.seleccion?.circuitoId);
  return (
    <Selection>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#8a8f8c", 0.6]} />
      <directionalLight position={[W / 2 + 5, 14, L + 7]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]}
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
        <Fallas layout={layout} />
      </Bvh>
      <Tooltip />
      <Camaras layout={layout} />
      <Animador />
      {efectos && (
        <EffectComposer multisampling={4} autoClear={false}>
          {/* El pase de Outline cuesta un render extra: solo con algo seleccionado. */}
          {haySeleccion ? <Outline visibleEdgeColor={new Color(paleta.ink).getHex()} hiddenEdgeColor={new Color(paleta.muted).getHex()} edgeStrength={4} width={1200} xRay /> : <></>}
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} mipmapBlur />
        </EffectComposer>
      )}
    </Selection>
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
  const [efectos, setEfectos] = useState(true);
  const debugCambio = useMemo(() => (v: { efectos: boolean; dpr: number }) => { setEfectos(v.efectos); setDpr(v.dpr); }, []);

  return (
    <section className="v3d" aria-label="Vista 3D de la instalación">
      <div className="v3d-lienzo" ref={capaHtml}>
        <EscenaCtx.Provider value={ctx}>
          <Canvas frameloop="demand" shadows dpr={[1, dpr]} camera={{ fov: 45, near: 0.05, far: 200, position: [10, 10, -10] }}
            onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
            onPointerMissed={() => simStore.getState().actions.setUi3d({ seleccion: null })}>
            <color attach="background" args={[paleta.bg]} />
            {/* En equipos lentos baja la resolución y apaga el Bloom. */}
            <PerformanceMonitor onDecline={() => { setDpr(1); setEfectos(false); }} onIncline={() => setDpr(2)} />
            <Escena efectos={efectos} />
          </Canvas>
        </EscenaCtx.Provider>
        <ControlesSim />
        <BarraVista />
      </div>
      {Debug3D && conDebug() && <Suspense fallback={null}><Debug3D onCambio={debugCambio} /></Suspense>}
      <PanelParametros />
    </section>
  );
}
