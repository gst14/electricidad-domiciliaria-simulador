import type { Layout3D } from "../layout3d/tipos";

export type Curva = "B" | "C" | "D";

export interface Carga {
  nombre: string;
  potencia_w: number;
  fp?: number;
  encendida: boolean;
}

export interface Circuito {
  id: string;
  tipo: string; // IUG | TUG | TUE | ...
  descripcion: string;
  amperes: number;
  curva: string;
  seccion_mm2: number;
  bocas: number;
  cargas: Carga[];
}

export interface Config {
  vivienda?: string;
  tension?: string;
  tension_v: number;
  superficie_m2: number;
  grado_electrificacion?: string;
  tablero: {
    termica_general: { polos: number; amperes: number; curva: string };
    diferencial: { polos: number; amperes: number; sensibilidad_ma: number };
  };
  puesta_tierra: { jabalina: boolean; resistencia_ohm: number };
  circuitos: Circuito[];
  layout3d?: Layout3D; // opcional: si falta, se genera con generarLayout
}

/* Estado mutable de una protección. */
export interface Proteccion {
  on: boolean;
  tripped: boolean;
  heat: number; // 0..1, calentamiento del bimetal
}

export interface EstadoCircuito extends Proteccion {
  temp: number; // °C del cable
  leak: number; // mA de fuga hacia la carcasa
  leakBoca?: string; // boca donde se ubica la fuga (solo visual)
  I: number;
}

export interface Evento {
  t: number;
  type: "info" | "ok" | "trip";
  msg: string;
}

export interface Runtime {
  tg: Proteccion;
  id: Proteccion;
  c: Record<string, EstadoCircuito>;
  simT: number;
  kwh: number;
  running: boolean;
  speed: number;
  log: Evento[];
  I: number;
  P: number;
  leak: number;
}

export type Severidad = "error" | "warn" | "ok";
