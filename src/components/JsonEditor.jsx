import { useEffect, useState } from "react";

export default function JsonEditor({ cfg, actions }) {
  const [text, setText] = useState(() => JSON.stringify(cfg, null, 2));
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setText(JSON.stringify(cfg, null, 2)); }, [cfg]);

  const apply = (txt) => setErr(actions.applyText(txt) ?? "");
  const copy = () => navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  const onFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setText(r.result); apply(r.result); };
    r.readAsText(f);
  };

  return (
    <section className="panel editor" aria-labelledby="h-json">
      <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
        <h2 id="h-json">Configuración (JSON)</h2>
        <label className="sr" htmlFor="json">JSON de la instalación</label>
        <textarea id="json" spellCheck={false} value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} />
        <div className="err" aria-live="polite">{err}</div>
        <div className="row">
          <button onClick={() => apply(text)}>Aplicar cambios</button>
          <button onClick={copy}>{copied ? "Copiado" : "Copiar JSON"}</button>
          <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input type="file" accept=".json,application/json" style={{ maxWidth: 190, fontSize: 12 }} onChange={onFile} />
          </label>
          <button onClick={() => { setErr(""); actions.restoreSample(); }}>Restaurar ejemplo</button>
        </div>
      </div>
      <div className="help">
        <h3 style={{ fontSize: 16, color: "var(--ink)" }}>Cómo se modela</h3>
        <p>Cada artefacto consume <code>I = P ÷ (V × fp)</code>. Los motores (heladera, aire, bomba) usan factor de potencia menor a 1.</p>
        <p>Las termomagnéticas tienen dos disparos. El térmico acumula calor cuando la corriente pasa 1,13 × In y tarda menos cuanto mayor es la sobrecarga. El magnético es instantáneo ante un cortocircuito (curva B: 4 × In, C: 8 × In, D: 15 × In).</p>
        <p>El diferencial no mira la corriente total, sino la diferencia entre fase y neutro. Corta cuando la fuga supera el 75 % de su sensibilidad. Sin jabalina, la fuga no tiene camino a tierra y la carcasa queda con tensión.</p>
        <p>La temperatura del cable sube con el cuadrado de I ÷ Iz. Si la térmica es más grande que lo que soporta el cable, el cable pasa los 70 °C del PVC antes de que la protección actúe.</p>
        <p className="small">Capacidades de cable aproximadas (PVC en cañería). Es una herramienta didáctica: el proyecto real lo firma un electricista matriculado según AEA 90364.</p>
      </div>
    </section>
  );
}
