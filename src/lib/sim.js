export const IZ={1:12,1.5:15,2.5:21,4:28,6:36,10:50,16:66,25:84};
export const MAG={B:4,C:8,D:15};
export const CATALOGO=[
  {n:"Lámpara LED 9 W",w:9},{n:"Tubo LED 18 W",w:18},{n:"Heladera",w:150,fp:.8},{n:"Televisor",w:100},{n:"Notebook",w:65},
  {n:"Router y módem",w:20},{n:"Microondas",w:1200},{n:"Pava eléctrica",w:2000},{n:"Plancha",w:1200},{n:"Secador de pelo",w:1800},
  {n:"Estufa eléctrica",w:2000},{n:"Lavarropas",w:2200,fp:.9},{n:"Horno eléctrico",w:2500},{n:"Aire acondicionado 3000 fg",w:1150,fp:.9},
  {n:"Aire acondicionado 4500 fg",w:1750,fp:.9},{n:"Termotanque eléctrico",w:1500},{n:"Bomba de agua 1 HP",w:750,fp:.8}
];
export const EJEMPLO={
  vivienda:"Casa ejemplo 95 m2",superficie_m2:95,tension:"220 V monofásico",tension_v:220,grado_electrificacion:"medio",
  tablero:{termica_general:{polos:2,amperes:32,curva:"C"},diferencial:{polos:2,amperes:40,sensibilidad_ma:30}},
  puesta_tierra:{jabalina:true,resistencia_ohm:10},
  circuitos:[
    {id:"C1",tipo:"IUG",descripcion:"Luces",amperes:10,curva:"C",seccion_mm2:1.5,bocas:12,cargas:[
      {nombre:"Lámparas LED (12 × 9 W)",potencia_w:108,encendida:true}]},
    {id:"C2",tipo:"TUG",descripcion:"Tomas",amperes:16,curva:"C",seccion_mm2:2.5,bocas:14,cargas:[
      {nombre:"Heladera",potencia_w:150,fp:.8,encendida:true},{nombre:"Televisor",potencia_w:100,encendida:true},
      {nombre:"Pava eléctrica",potencia_w:2000,encendida:false},{nombre:"Microondas",potencia_w:1200,encendida:false},
      {nombre:"Estufa eléctrica",potencia_w:2000,encendida:false}]},
    {id:"C3",tipo:"TUE",descripcion:"Aire acond.",amperes:20,curva:"C",seccion_mm2:4,bocas:1,cargas:[
      {nombre:"Aire acondicionado 3000 fg",potencia_w:1150,fp:.9,encendida:false}]}
  ]};

export const fmt=(n,d=1)=>Number(n).toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d});
export const izOf=s=>IZ[s]??Math.round(9*Math.pow(s,0.62)*1.1);
export const hms=s=>{s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return [h,m,x].map(n=>String(n).padStart(2,"0")).join(":")};

export function normalize(c){
  if(!c||typeof c!=="object") throw new Error("El JSON tiene que ser un objeto.");
  if(!c.tablero||!c.tablero.termica_general||!c.tablero.diferencial) throw new Error("Falta tablero.termica_general o tablero.diferencial.");
  if(!Array.isArray(c.circuitos)||!c.circuitos.length) throw new Error("Falta la lista circuitos (al menos uno).");
  const v=Number(c.tension_v)||parseFloat(c.tension)||220;
  const tg=c.tablero.termica_general, di=c.tablero.diferencial;
  const out={...c,tension_v:v,superficie_m2:Number(c.superficie_m2)||0,
    tablero:{termica_general:{polos:Number(tg.polos)||2,amperes:Number(tg.amperes),curva:(tg.curva||"C").toUpperCase()},
             diferencial:{polos:Number(di.polos)||2,amperes:Number(di.amperes),sensibilidad_ma:Number(di.sensibilidad_ma)||30}},
    puesta_tierra:{jabalina:c.puesta_tierra?c.puesta_tierra.jabalina!==false:true,resistencia_ohm:Number(c.puesta_tierra?.resistencia_ohm)||0},
    circuitos:[]};
  if(!(out.tablero.termica_general.amperes>0)) throw new Error("termica_general.amperes tiene que ser un número mayor a 0.");
  if(!(out.tablero.diferencial.amperes>0)) throw new Error("diferencial.amperes tiene que ser un número mayor a 0.");
  const seen=new Set();
  c.circuitos.forEach((k,i)=>{
    let id=String(k.id||"C"+(i+1)); while(seen.has(id)) id+="'"; seen.add(id);
    if(!(Number(k.amperes)>0)) throw new Error(`Circuito ${id}: amperes tiene que ser un número mayor a 0.`);
    out.circuitos.push({id,tipo:String(k.tipo||"TUG").toUpperCase(),descripcion:k.descripcion||"",amperes:Number(k.amperes),
      curva:(k.curva||"C").toUpperCase(),seccion_mm2:Number(k.seccion_mm2)||2.5,bocas:Number(k.bocas)||0,
      cargas:(Array.isArray(k.cargas)?k.cargas:[]).map(a=>({nombre:a.nombre||"Carga",potencia_w:Number(a.potencia_w)||0,
        ...(a.fp&&Number(a.fp)!==1?{fp:Number(a.fp)}:{}),encendida:!!a.encendida}))});
  });
  return out;
}
export function freshRuntime(cfg,old){
  const r={tg:{on:true,tripped:false,heat:0},id:{on:true,tripped:false,heat:0},c:{},simT:old?.simT||0,kwh:old?.kwh||0,
    running:old?old.running:true,speed:old?.speed||60,log:old?.log||[],I:0,P:0,leak:0};
  cfg.circuitos.forEach(k=>r.c[k.id]={on:true,tripped:false,heat:0,temp:30,leak:0,I:0});
  return r;
}
export function logEv(rt,type,msg){rt.log.unshift({t:rt.simT,type,msg}); rt.log=rt.log.slice(0,60)}

/* ---------- física ---------- */
export const loadI=(cfg,k)=>k.cargas.filter(a=>a.encendida).reduce((s,a)=>s+a.potencia_w/(cfg.tension_v*(a.fp||1)),0);
export const loadP=k=>k.cargas.filter(a=>a.encendida).reduce((s,a)=>s+a.potencia_w,0);
export const loadA=(cfg,a)=>a.potencia_w/(cfg.tension_v*(a.fp||1));
export function heatRate(I,In){const r=I/In;return r>1.13?(r*r-1.2769)/300:0}
export function trip(rt,b,label,why){b.on=false;b.tripped=true;logEv(rt,"trip",`${label}: ${why}`)}

export function step(cfg,rt,dt){
  const live=rt.tg.on&&rt.id.on, earth=cfg.puesta_tierra.jabalina;
  let I=0,P=0,leak=0;
  cfg.circuitos.forEach(k=>{const s=rt.c[k.id];const e=live&&s.on;s.I=e?loadI(cfg,k):0;I+=s.I;if(e){P+=loadP(k);if(earth)leak+=s.leak}});
  rt.I=I;rt.P=P;rt.leak=leak;
  const di=cfg.tablero.diferencial,tg=cfg.tablero.termica_general;
  if(live&&leak>=0.75*di.sensibilidad_ma){trip(rt,rt.id,"Diferencial",`fuga de ${fmt(leak,0)} mA a tierra supera el umbral de ${fmt(di.sensibilidad_ma*0.75,0)} mA. Corta toda la casa en milisegundos.`);return}
  if(rt.tg.on&&I>=MAG[tg.curva||"C"]*tg.amperes){trip(rt,rt.tg,"Térmica general",`disparo magnético con ${fmt(I)} A.`);return}
  cfg.circuitos.forEach(k=>{const s=rt.c[k.id];if(s.on&&s.I>=(MAG[k.curva]||8)*k.amperes)trip(rt,s,`Térmica ${k.id}`,`disparo magnético con ${fmt(s.I)} A.`)});
  if(dt<=0) return;
  rt.simT+=dt; rt.kwh+=P*dt/3.6e6;
  const thermal=(b,Iv,In,label)=>{const r=heatRate(Iv,In);if(b.on&&r>0){b.heat+=r*dt;if(b.heat>=1){b.heat=1;trip(rt,b,label,`sobrecarga de ${fmt(Iv)} A sobre ${In} A nominales (${fmt(Iv/In,2)} × In). Disparo térmico.`)}}else b.heat=Math.max(0,b.heat-dt/120)};
  thermal(rt.tg,I,tg.amperes,"Térmica general");
  cfg.circuitos.forEach(k=>{const s=rt.c[k.id];thermal(s,s.I,k.amperes,`Térmica ${k.id}`);
    const iz=izOf(k.seccion_mm2),target=30+40*Math.pow(s.I/iz,2),prev=s.temp;
    s.temp+= (target-s.temp)*(1-Math.exp(-dt/600));
    if(prev<70&&s.temp>=70) logEv(rt,"trip",`Cable de ${k.id} (${fmt(k.seccion_mm2)} mm²) superó 70 °C: la protección es más grande que lo que soporta el cable.`)});
}

export function statusOf(cfg,rt){
  const live=rt.tg.on&&rt.id.on;
  const noEarth=!cfg.puesta_tierra.jabalina&&cfg.circuitos.some(k=>rt.c[k.id].leak>0&&live&&rt.c[k.id].on);
  if(noEarth) return {cl:"bad",msg:"Falla de aislación sin puesta a tierra: la carcasa tiene tensión y nadie lo detecta hasta que alguien la toca."};
  if(rt.id.tripped) return {cl:"bad",msg:"Disparó el diferencial. Corregí la falla de aislación y rearmalo."};
  if(rt.tg.tripped) return {cl:"bad",msg:"Disparó la térmica general. Bajá el consumo total y rearmala."};
  if(!live) return {cl:"warn",msg:"Tablero abierto manualmente: la casa está sin tensión."};
  const down=cfg.circuitos.filter(k=>!rt.c[k.id].on);const hot=cfg.circuitos.filter(k=>rt.c[k.id].heat>0.01&&rt.c[k.id].on);
  if(down.length) return {cl:"warn",msg:`Sin tensión: ${down.map(k=>k.id+" "+k.descripcion).join(", ")}. El resto funciona.`};
  if(hot.length||rt.tg.heat>0.01) return {cl:"warn",msg:"Sobrecarga en curso: el bimetal se está calentando."};
  return {cl:"",msg:`Todo energizado · ${fmt(rt.I)} A de ${cfg.tablero.termica_general.amperes} A disponibles`};
}

/* ---------- validación ---------- */
export function gradoDe(m2){if(m2<=60)return{g:"mínimo",min:2};if(m2<=130)return{g:"medio",min:3};if(m2<=200)return{g:"elevado",min:5};return{g:"superior",min:6}}
export function validate(cfg){
  const out=[],tg=cfg.tablero.termica_general,di=cfg.tablero.diferencial,pe=cfg.puesta_tierra;
  if(di.sensibilidad_ma>30) out.push(["error",`El diferencial de ${di.sensibilidad_ma} mA no protege personas: tiene que ser de 30 mA o menos.`]);
  if(di.amperes<tg.amperes) out.push(["warn",`El diferencial (${di.amperes} A) es menor que la térmica general (${tg.amperes} A). Puede quedar sobrecargado sin que nada lo proteja.`]);
  if(!pe.jabalina) out.push(["error","No hay puesta a tierra. Una falla de aislación deja la carcasa con tensión y el diferencial recién actúa cuando alguien la toca."]);
  else if(pe.resistencia_ohm>40) out.push(["error",`La jabalina mide ${pe.resistencia_ohm} Ω: supera el máximo de 40 Ω.`]);
  else if(pe.resistencia_ohm>10) out.push(["warn",`La jabalina mide ${pe.resistencia_ohm} Ω. Funciona, pero lo recomendable es 10 Ω o menos.`]);
  cfg.circuitos.forEach(k=>{
    const iz=izOf(k.seccion_mm2);
    if(k.amperes>iz) out.push(["error",`${k.id}: térmica de ${k.amperes} A sobre cable de ${fmt(k.seccion_mm2)} mm² (Iz ≈ ${iz} A). El cable se sobrecalienta antes de que dispare.`]);
    if(k.tipo==="IUG"&&k.seccion_mm2<1.5) out.push(["error",`${k.id}: un circuito de iluminación necesita al menos 1,5 mm².`]);
    if((k.tipo==="TUG"||k.tipo==="TUE")&&k.seccion_mm2<2.5) out.push(["error",`${k.id}: un circuito de tomas necesita al menos 2,5 mm².`]);
    if((k.tipo==="IUG"||k.tipo==="TUG")&&k.bocas>15) out.push(["error",`${k.id}: ${k.bocas} bocas superan el máximo de 15 por circuito de uso general.`]);
    if(k.amperes>=tg.amperes) out.push(["warn",`${k.id}: su térmica (${k.amperes} A) iguala o supera a la general (${tg.amperes} A); se pierde selectividad.`]);
    const p=k.cargas.reduce((s,a)=>s+a.potencia_w/(a.fp||1),0)/cfg.tension_v;
    if(p>k.amperes) out.push(["warn",`${k.id}: con todo encendido consume ${fmt(p)} A y su térmica es de ${k.amperes} A. Va a disparar si se usan todos juntos.`]);
  });
  const types=cfg.circuitos.map(k=>k.tipo);
  if(!types.includes("IUG")) out.push(["error","Falta al menos un circuito de iluminación (IUG)."]);
  if(!types.includes("TUG")) out.push(["error","Falta al menos un circuito de tomas (TUG)."]);
  let gr=null;
  if(cfg.superficie_m2>0){gr=gradoDe(cfg.superficie_m2);
    if(cfg.circuitos.length<gr.min) out.push(["error",`Para ${cfg.superficie_m2} m² (grado ${gr.g}) se piden al menos ${gr.min} circuitos; hay ${cfg.circuitos.length}.`]);
    if(cfg.grado_electrificacion&&cfg.grado_electrificacion.toLowerCase()!==gr.g) out.push(["warn",`El JSON declara grado "${cfg.grado_electrificacion}", pero ${cfg.superficie_m2} m² corresponde a grado ${gr.g}.`]);}
  else out.push(["warn","Agregá superficie_m2 al JSON para verificar el grado de electrificación."]);
  if(!out.some(o=>o[0]!=="ok")) out.push(["ok","El proyecto cumple todas las reglas verificadas."]);
  const maxI=cfg.circuitos.reduce((s,k)=>s+k.cargas.reduce((a,b)=>a+b.potencia_w/(b.fp||1),0),0)/cfg.tension_v;
  return {checks:out,gr,maxI};
}
