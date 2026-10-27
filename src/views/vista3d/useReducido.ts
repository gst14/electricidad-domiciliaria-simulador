import { useEffect, useState } from "react";

const MQ = "(prefers-reduced-motion: reduce)";

export function useReducido(): boolean {
  const [r, setR] = useState(() => matchMedia(MQ).matches);
  useEffect(() => {
    const mq = matchMedia(MQ), upd = () => setR(mq.matches);
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  return r;
}
