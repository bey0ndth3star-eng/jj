const ROOMS=[{id:"general",n:"Général",i:"chat"},{id:"idees",n:"Idées",i:"bulb"},{id:"detente",n:"Détente",i:"cup"}];
const IC={chat:"M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",bulb:"M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",cup:"M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2",sun:"M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",moon:"M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"};
function ico(n){const N="http://www.w3.org/2000/svg",s=document.createElementNS(N,"svg"),p=document.createElementNS(N,"path");
  [["viewBox","0 0 24 24"],["fill","none"],["stroke","currentColor"],["stroke-width","1.8"],["stroke-linecap","round"],["stroke-linejoin","round"]].forEach(a=>s.setAttribute(a[0],a[1]));
  p.setAttribute("d",IC[n]);s.append(p);return s}
const $=i=>document.getElementById(i);
const log=$("log"),text=$("text"),send=$("send"),nameIn=$("name"),jump=$("jump");
let db=null,roomApi=null,uid=null,room="general",unsub=null,peers=[],pending=0,shown=new Set();
const seen={},pres={name:"",room:"general",typing:false};
try{nameIn.value=localStorage.getItem("pseudo")||""}catch(e){}
const dn=()=>nameIn.value.trim()||"Anonyme";
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};
function av(name,cls){
  const d=document.createElement("div"),h=330+hue(name||"?")%85;
  d.className="av"+(cls?" "+cls:"");d.title=name||"";
  d.style.background="linear-gradient(135deg,hsl("+h+" 80% 64%),hsl("+((h+45)%360)+" 82% 50%))";
  d.textContent=(name||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
  return d;
}
function sp(p){Object.assign(pres,p);if(roomApi){try{roomApi.presence(pres).catch(()=>{})}catch(e){}}}
function meAv(){$("meav").replaceChildren(av(dn()))}

/* parallaxe 3D : gyroscope ou doigt */
const RS=document.documentElement.style;
function par(x,y){RS.setProperty("--px",x.toFixed(3));RS.setProperty("--py",y.toFixed(3))}
addEventListener("pointermove",e=>par(e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1));
addEventListener("deviceorientation",e=>{if(e.gamma==null)return;par(Math.max(-1,Math.min(1,e.gamma/30)),Math.max(-1,Math.min(1,(e.beta-45)/30)))});
addEventListener("pointerdown",()=>{try{if(window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission)DeviceOrientationEvent.requestPermission().catch(()=>{})}catch(e){}},{once:true});


/* salons + présence */
function here(id){const m=new Map();peers.forEach(p=>{if(p.presence&&p.presence.room===id)m.set(p.peer,p)});return [...m.values()]}
function lens(){const b=document.querySelector(".room.on"),l=$("lens");if(!b)return;l.style.width=b.offsetWidth+"px";l.style.transform="translateX("+b.offsetLeft+"px)"}
function renderRooms(){
  const nav=$("rooms");nav.querySelectorAll(".room").forEach(x=>x.remove());
  ROOMS.forEach(r=>{
    const b=document.createElement("button");b.className="room"+(r.id===room?" on":"");
    b.append(ico(r.i),r.n);
    const n=here(r.id).length;
    if(n){const g=document.createElement("span");g.className="badge";g.textContent=n;b.append(g)}
    b.onclick=()=>{if(r.id===room)return;room=r.id;sp({room:r.id,typing:false});shown=new Set();pending=0;jump.classList.remove("show");renderRooms();head();listen();typingUI()};
    nav.append(b);
  });
  requestAnimationFrame(lens);
}
addEventListener("resize",lens);
function head(){
  const list=here(room),st=$("stack");st.replaceChildren();
  list.slice(0,3).forEach(p=>{const a=av(p.presence.name||"Anonyme",shown.has(p.peer)?"":"pop");shown.add(p.peer);st.append(a)});
  if(list.length>3){const m=av("+");m.textContent="+"+(list.length-3);st.append(m)}
}
function typingUI(){
  const names=peers.filter(p=>!p.isMe&&p.presence&&p.presence.room===room&&p.presence.typing).map(p=>p.presence.name||"Quelqu’un");
  const el=$("typing");
  if(names.length){$("tt").textContent=names.slice(0,2).join(" et ")+(names.length>1?" écrivent…":" écrit…");el.classList.add("on")}
  else el.classList.remove("on");
}
function onPeers(){renderRooms();head();typingUI()}

/* messages */
const near=()=>log.scrollHeight-log.scrollTop-log.clientHeight<80;
function bottom(smooth){log.scrollTo({top:log.scrollHeight,behavior:smooth?"smooth":"auto"})}
log.addEventListener("scroll",()=>{if(near()){pending=0;jump.classList.remove("show")}});
jump.onclick=()=>bottom(true);
function note(t){log.replaceChildren();const d=document.createElement("div");d.className="note";d.textContent=t;log.append(d)}

function dayEl(t){
  const d=new Date(t).toDateString(),el=document.createElement("div");el.className="day";
  el.textContent=d===new Date().toDateString()?"Aujourd’hui":d===new Date(Date.now()-864e5).toDateString()?"Hier":new Date(t).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  return el;
}
function render(docs){
  const init=!seen[room],set=seen[room]||(seen[room]=new Set()),stick=near();
  let mine=false,others=0,prev=null,pd="";
  log.replaceChildren();
  if(init){log.classList.remove("swap");void log.offsetWidth;log.classList.add("swap")}
  if(!docs.length){
    const e=document.createElement("div");e.className="empty";
    const i=ico("chat");i.classList.add("e");
    const h=document.createElement("h3");h.textContent="Le salon est calme";
    const p=document.createElement("div");p.textContent="Envoyez le premier message pour lancer la conversation.";
    e.append(i,h,p);log.append(e);return;
  }
  docs.forEach(s=>{
    const m=s.data(),isNew=!init&&!set.has(s.id);set.add(s.id);const dk=m.t?new Date(m.t).toDateString():"";if(dk!==pd){pd=dk;prev=null;if(dk)log.append(dayEl(m.t))}
    const me=m.uid===uid,same=prev&&prev.uid===m.uid&&prev.name===m.name&&(m.t-prev.t)<300000;
    const row=document.createElement("div");row.className="row"+(me?" me":"")+(same?"":" first")+(isNew?" in":"");
    row.append(same?Object.assign(document.createElement("div"),{className:"sp"}):av(m.name));
    const col=document.createElement("div");col.className="col";
    if(!same){
      const h=document.createElement("div");h.className="head";
      const b=document.createElement("b");b.textContent=m.name||"Anonyme";
      const tm=m.t?new Date(m.t).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"";
      h.append(b," "+tm);col.append(h);
    }
    const b=document.createElement("div");b.className="b";b.textContent=m.text||"";
    col.append(b);row.append(col);log.append(row);
    if(isNew){me?mine=true:others++}
    prev=m;
  });
  if(init)bottom(false);
  else if(mine||stick)bottom(true);
  else if(others){pending+=others;jump.textContent="↓ "+pending+(pending>1?" nouveaux":" nouveau");jump.classList.add("show")}
}
function listen(){
  if(unsub){unsub();unsub=null}
  if(!db)return;
  note("Chargement…");
  const timer=setTimeout(()=>note("Chargement lent… vérifiez votre connexion."),10000);
  unsub=db.collection("rooms/"+room+"/messages").orderBy("t","desc").limit(80).onSnapshot(
    s=>{clearTimeout(timer);render(s.docs.slice().reverse())},
    e=>{clearTimeout(timer);note("Erreur : "+(e&&e.message||"inconnue"))});
}
async function post(){
  const v=text.value.trim();if(!v||!db)return;
  send.disabled=true;send.classList.remove("fly");void send.offsetWidth;send.classList.add("fly");
  text.value="";sp({typing:false});
  try{await db.collection("rooms/"+room+"/messages").add({text:v,name:dn(),uid:uid,t:Date.now()})}
  catch(e){text.value=v;note("Envoi impossible : "+(e&&e.message||"erreur"))}
  send.disabled=false;text.focus();
}
send.onclick=post;
text.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();post()}});
let tmr;text.addEventListener("input",()=>{sp({typing:!!text.value.trim()});clearTimeout(tmr);tmr=setTimeout(()=>sp({typing:false}),2500)});
nameIn.addEventListener("input",()=>{try{localStorage.setItem("pseudo",nameIn.value)}catch(e){}meAv();sp({name:dn()})});

/* démarrage */
meAv();renderRooms();head();
setTimeout(()=>{const s=$("splash");s.classList.add("gone");setTimeout(()=>s.remove(),900)},2100);
(async()=>{
  try{
    const user=await claude.use("user");
    db=await claude.use("db");
    if(!db){note("Le chat nécessite d’ouvrir cette page connecté à claude.ai.");return}
    if(user){const me=await user.me();uid=me.id;if(!nameIn.value&&me.name){nameIn.value=me.name;meAv()}}
    text.disabled=false;send.disabled=false;
    listen();
    try{
      roomApi=await claude.use("room");
      if(roomApi){sp({name:dn(),room:room});peers=roomApi.peers();roomApi.onPeers(c=>{peers=c.peers;onPeers()});onPeers()}
    }catch(e){}
  }catch(e){note("Chat indisponible pour le moment.")}
})();
