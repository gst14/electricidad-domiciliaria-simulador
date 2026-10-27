function Module({ id, tag, rate, name, b, live, wide, isId, onLever, onTest }) {
  const cls = ["mod", wide && "w2", isId && "id", !b.on && "off", b.tripped && "tripped", live && "live"].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <span className="tag">{tag}</span>
      <span className="flag">{b.on ? "I" : "O"}</span>
      <button className="lever" aria-label={`Palanca ${name}`} onClick={() => onLever(id)} />
      <span className="rate">{rate}</span>
      <div className="heat"><i style={{ width: Math.min(100, b.heat * 100) + "%" }} /></div>
      {isId && <button className="testbtn" title="Botón de prueba del diferencial" onClick={onTest}>T</button>}
      <span className="name">{name}</span>
    </div>
  );
}

export default function Board({ cfg, rt, onLever, onTest }) {
  const tg = cfg.tablero.termica_general, di = cfg.tablero.diferencial;
  const live = rt.tg.on && rt.id.on;
  return (
    <section className="panel" aria-labelledby="h-tab">
      <h2 id="h-tab">Tablero principal</h2>
      <p className="small muted" style={{ margin: "4px 0 12px" }}>Tocá una palanca para abrir o rearmar. La barra naranja es el calentamiento del bimetal: al llenarse, dispara.</p>
      <div className="enclosure">
        <div className="rail">
          <Module id="tg" tag={`${tg.polos}P`} rate={`${tg.curva}${tg.amperes}`} name="Térmica general" b={rt.tg} live={rt.tg.on && rt.I > 0} wide onLever={onLever} />
          <Module id="id" tag={`${di.polos}P`} rate={`${di.amperes} A`} name={`Diferencial ${di.sensibilidad_ma} mA`} b={rt.id} live={live && rt.I > 0} wide isId onLever={onLever} onTest={onTest} />
          {cfg.circuitos.map((k) => {
            const s = rt.c[k.id];
            return <Module key={k.id} id={k.id} tag={k.tipo} rate={`${k.curva}${k.amperes}`} name={`${k.id} ${k.descripcion}`} b={s} live={live && s.on && s.I > 0} onLever={onLever} />;
          })}
        </div>
      </div>
      <div className="legend">
        <span><b style={{ background: "var(--fase)" }} />Fase</span>
        <span><b style={{ background: "var(--neutro)" }} />Neutro</span>
        <span><b style={{ background: "var(--tierra)" }} />Tierra (PE)</span>
        <span><b style={{ background: "var(--live)" }} />Corriente circulando</span>
      </div>
    </section>
  );
}
