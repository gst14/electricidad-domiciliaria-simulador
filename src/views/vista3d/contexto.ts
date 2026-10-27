import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type { Paleta } from "./colores";

export interface ContextoEscena {
  paleta: Paleta;
  colores: Record<string, string>; // color por circuito
  reducido: boolean; // prefers-reduced-motion
  capaHtml: RefObject<HTMLDivElement>; // contenedor de las etiquetas <Html>
}

export const EscenaCtx = createContext<ContextoEscena | null>(null);

export function useEscena(): ContextoEscena {
  const c = useContext(EscenaCtx);
  if (!c) throw new Error("useEscena fuera de <EscenaCtx.Provider>");
  return c;
}
