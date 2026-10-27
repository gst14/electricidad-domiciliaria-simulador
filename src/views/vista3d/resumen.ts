import { fmt, loadP } from "../../domain/simulacion";
import type { Config, Runtime } from "../../domain/simulacion";
import type { Layout3D } from "../../domain/layout3d/tipos";
import type { Seleccion } from "../../store/simStore";
import { estadoVisualCircuito, hayTension } from "./mapeoVisual";

const TIPO_BOCA: Record<string, string> = { centro: "Centro", aplique: "Aplique", toma: "Toma", llave: "Llave", caja_paso: "Caja de paso" };

/* Datos que muestran el tooltip y el inspector para un elemento de la escena. */
export function resumenDe(sel: Seleccion, cfg: Config, rt: Runtime, layout: Layout3D): { titulo: string; filas: [string, string][] } {
  if (sel.tipo === "proteccion" && (sel.proteccion === "tg" || sel.proteccion === "id")) {
    const b = rt[sel.proteccion], tg = cfg.tablero.termica_general, di = cfg.tablero.diferencial;
    return sel.proteccion === "tg"
      ? { titulo: "Térmica general", filas: [["Protección", `${tg.polos}P ${tg.curva}${tg.amperes}`], ["Corriente", `${fmt(rt.I)} A`], ["Estado", b.tripped ? "DISPARADA" : b.on ? "Cerrada" : "Abierta"]] }
      : { titulo: "Diferencial", filas: [["Protección", `${di.polos}P ${di.amperes} A · ${di.sensibilidad_ma} mA`], ["Fuga", `${fmt(rt.leak, 0)} mA`], ["Estado", b.tripped ? "DISPARADO" : b.on ? "Cerrado" : "Abierto"]] };
  }
  const k = cfg.circuitos.find((c) => c.id === sel.circuitoId);
  if (!k) return { titulo: "", filas: [] };
  const e = estadoVisualCircuito(cfg, rt, k);
  const filas: [string, string][] = [
    ["Corriente", `${fmt(e.I)} A · ${e.etiqueta}`],
    ["Potencia", `${fmt(hayTension(rt, k.id) ? loadP(k) : 0, 0)} W`],
    ["Protección", `${k.curva}${k.amperes}`],
    ["Sección", `${fmt(k.seccion_mm2)} mm² (Iz ≈ ${e.iz} A)${e.subdimensionado ? " ⚠" : ""}`],
  ];
  let titulo = `${k.id} ${k.descripcion}`;
  const boca = layout.bocas.find((b) => b.id === sel.bocaId);
  if (sel.tipo === "artefacto" && sel.cargaIndex !== undefined && k.cargas[sel.cargaIndex]) {
    const a = k.cargas[sel.cargaIndex];
    titulo = `${a.nombre} · ${k.id}`;
    filas.unshift(["Artefacto", `${fmt(a.potencia_w, 0)} W · ${a.encendida ? (e.conTension ? "encendido" : "sin tensión") : "apagado"}`]);
  } else if (boca) {
    const amb = layout.ambientes.find((a) => a.id === boca.ambienteId)?.nombre ?? "";
    titulo = `${TIPO_BOCA[boca.tipo]} ${boca.id}`;
    filas.unshift(["Ubicación", `${amb} · circuito ${k.id}`]);
  } else if (sel.tipo === "proteccion") {
    titulo = `Térmica ${k.id}`;
  }
  return { titulo, filas };
}
