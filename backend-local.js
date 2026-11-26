/* Lumen – backend local (démo).
   Les messages sont stockés dans le navigateur (localStorage) et synchronisés
   entre les onglets de CET appareil. Pour un vrai chat en ligne entre plusieurs
   personnes, remplacez ce fichier par un backend réel (voir README.md). */
(function(){
  if(window.claude)return;
  const KEY="lumen:",subs=[];
  const bc="BroadcastChannel" in window?new BroadcastChannel("lumen-msg"):null;
  const load=p=>{try{return JSON.parse(localStorage.getItem(KEY+p)||"[]")}catch(e){return[]}};
  const save=(p,a)=>{try{localStorage.setItem(KEY+p,JSON.stringify(a.slice(-500)))}catch(e){}};
  const fire=p=>subs.filter(s=>s.path===p).forEach(s=>s.fire());
  const db={collection(path){
    let desc=false,lim=80;
    const q={
      orderBy(f,dir){desc=dir==="desc";return q},
      limit(n){lim=n;return q},
      onSnapshot(next){
        const s={path,fire(){
          let a=load(path).sort((x,y)=>x.t-y.t);if(desc)a=a.reverse();
          next({docs:a.slice(0,lim).map(d=>({id:d.id,data:()=>d}))});
        }};
        subs.push(s);s.fire();
        return()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1)};
      },
      async add(d){
        const a=load(path),id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
        a.push(Object.assign({},d,{id}));save(path,a);fire(path);
        if(bc)bc.postMessage({path});return{id};
      }
    };
    return q;
  }};
  if(bc)bc.onmessage=e=>fire(e.data.path);
  addEventListener("storage",e=>{if(e.key&&e.key.indexOf(KEY)===0)fire(e.key.slice(KEY.length))});

  let uid=null;try{uid=localStorage.getItem("lumen-uid")}catch(e){}
  if(!uid){uid="u"+Math.random().toString(36).slice(2,10);try{localStorage.setItem("lumen-uid",uid)}catch(e){}}
  const user={me:async()=>({id:uid,name:""})};

  const peerId=Math.random().toString(36).slice(2),handlers=[],others=new Map();
  const me={peer:peerId,isMe:true,presence:{}};
  const pc="BroadcastChannel" in window?new BroadcastChannel("lumen-presence"):null;
  const list=()=>[me].concat([...others.values()]);
  const emit=()=>handlers.forEach(h=>h({peers:list()}));
  const ping=()=>{if(pc)pc.postMessage({peer:peerId,presence:me.presence})};
  if(pc){
    pc.onmessage=e=>{const m=e.data;if(m.bye)others.delete(m.peer);else others.set(m.peer,{peer:m.peer,isMe:false,presence:m.presence,t:Date.now()});emit()};
    setInterval(()=>{const now=Date.now();let ch=false;others.forEach((v,k)=>{if(now-v.t>9000){others.delete(k);ch=true}});if(ch)emit();ping()},3000);
    addEventListener("pagehide",()=>pc.postMessage({bye:1,peer:peerId}));
  }
  const room={
    presence:async p=>{me.presence=Object.assign({},p);ping();emit()},
    peers:()=>list(),
    onPeers:h=>{handlers.push(h);return()=>{const i=handlers.indexOf(h);if(i>=0)handlers.splice(i,1)}}
  };
  const map={user,db,room};
  window.claude={use:async n=>map[n]||null};
})();
