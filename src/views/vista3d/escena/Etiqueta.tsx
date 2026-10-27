import { Html } from "@react-three/drei";
import type { ComponentProps } from "react";
import { useEscena } from "../contexto";

/*
 * <Html> con un contenedor fijo. Sin `portal`, drei cambia de contenedor cuando se conectan
 * los eventos del Canvas y las etiquetas montadas antes quedan vacías.
 */
export default function Etiqueta(props: ComponentProps<typeof Html>) {
  const { capaHtml } = useEscena();
  return <Html center zIndexRange={[20, 0]} portal={capaHtml} {...props} />;
}
