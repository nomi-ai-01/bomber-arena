(()=>{
const W=13,H=11,T=48,CW=W*T,CH=H*T;
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
const COLS=['#3da5ff','#ff5d73','#44d17a','#ffc83d'];
const SP=[[1,1],[W-2,1],[1,H-2],[W-2,H-2]];
/* 8 stages; th = theme index */
const STAGES=[{n:'Warm-up',bots:1,spd:2.8,dens:.6,shr:55,th:0},{n:'Brick yard',bots:2,spd:3.2,dens:.72,shr:45,th:0},{n:'Triple threat',bots:3,spd:3.4,dens:.74,shr:40,th:1},{n:'Fast bots',bots:3,spd:4,dens:.78,shr:32,th:1},{n:'Ice rush',bots:3,spd:4.2,dens:.7,shr:30,th:2},{n:'Dense maze',bots:3,spd:4.4,dens:.86,shr:28,th:2},{n:'Speed storm',bots:3,spd:4.8,dens:.78,shr:24,th:3},{n:'Elite arena',bots:3,spd:5,dens:.8,shr:20,th:3},{n:'Frost maze',bots:3,spd:5,dens:.84,shr:22,th:2},{n:'Jungle hunt',bots:3,spd:5.1,dens:.76,shr:20,th:1},{n:'Lava storm',bots:3,spd:5.3,dens:.8,shr:18,th:3},{n:'Boss: Champion',boss:1,bots:3,spd:5.6,dens:.82,shr:16,th:3}];
/* floor a, floor b, wall base, wall hi, brick */
const TH=[['#2b3654','#26304c','#5d6a8f','#7f8db5','#c4673a'],['#2f3a2c','#293425','#5f7a56','#86a77a','#b8803a'],['#26405a','#223a52','#5f8fb0','#9fd0ee','#8fb4c8'],['#40262f','#3a2229','#8f5a66','#c27f8d','#d2512f']];
const SKINS=['#3da5ff','#b46cff','#ff8fd1','#f2f4ff'];
const NS=STAGES.length;
let mode2=false,lives=3,held2=[],bombReq2=false,combo=0,lastK=-9,lvl=0,unlocked=1,base=0,rng=Math.random,daily=false,skin=0,prevLvl=0;
const $=id=>document.getElementById(id);
const cv=$('c'),ctx=cv.getContext('2d'),stage=$('stage');
let grid,items,bombs,flames,ps,parts=[],txts=[],shake=0,state='menu',time=0,an=0,score=0,best=0,endT=0,result='',shrinkList=[],shrinkIdx=0,shrinkT=0,held=[],muted=false,bombReq=false;
try{best=+localStorage.getItem('bomber-best')||0;unlocked=Math.min(NS,Math.max(1,+localStorage.getItem('bomber-unlocked')||1));skin=Math.min(3,+localStorage.getItem('bomber-skin')||0)}catch(e){}

/* ---------- audio ---------- */
let ac;
function snd(f,d,type,v,slide){
 if(muted)return;
 try{
  ac=ac||new(window.AudioContext||window.webkitAudioContext)();
  if(ac.state==='suspended')ac.resume();
  const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
  o.type=type||'square';o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
  g.gain.setValueAtTime(v||.05,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g);g.connect(ac.destination);o.start();o.stop(t+d);
 }catch(e){}
}

/* ---------- sizing ---------- */
function resize(){
 const r=stage.getBoundingClientRect();
 const s=Math.min((r.width-12)/CW,(r.height-12)/CH);
 const w=Math.max(160,Math.floor(CW*s)),h=Math.floor(w*CH/CW);
 const dpr=Math.min(window.devicePixelRatio||1,3);
 cv.style.width=w+'px';cv.style.height=h+'px';
 cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
}
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',()=>setTimeout(resize,200));

/* ---------- effects ---------- */
function spark(x,y,c,n,sp){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=(.4+Math.random())*(sp||90);parts.push({x:x*T+T/2,y:y*T+T/2,vx:Math.cos(a)*v,vy:Math.sin(a)*v-20,t:.5+Math.random()*.4,m:.9,c})}}
function note(x,y,s,c){txts.push({x:x*T+T/2,y:y*T+4,t:.9,s,c:c||'#fff'})}
function fx(dt){
 parts=parts.filter(p=>{p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;return p.t>0});
 txts=txts.filter(p=>{p.t-=dt;p.y-=30*dt;return p.t>0});
 shake=Math.max(0,shake-dt*30);
}

/* ---------- world ---------- */
const solid=g=>g===1||g===3;
const bombAt=(x,y)=>bombs.some(b=>b.x===x&&b.y===y);
const canEnter=(x,y)=>grid[y]&&grid[y][x]===0&&!bombAt(x,y);
const lc=p=>p.mv&&p.mv.t>.5?[p.mv.x,p.mv.y]:[p.cx,p.cy];
const ownCount=p=>bombs.filter(b=>b.o===p).length;

function spiral(){
 const o=[];let x0=1,y0=1,x1=W-2,y1=H-2;
 while(x0<=x1&&y0<=y1){
  for(let x=x0;x<=x1;x++)o.push([x,y0]);
  for(let y=y0+1;y<=y1;y++)o.push([x1,y]);
  if(y0<y1)for(let x=x1-1;x>=x0;x--)o.push([x,y1]);
  if(x0<x1)for(let y=y1-1;y>y0;y--)o.push([x0,y]);
  x0++;y0++;x1--;y1--;
 }
 return o;
}
function init(){
 grid=[];items=[];bombs=[];flames=[];parts=[];txts=[];shake=0;
 for(let y=0;y<H;y++){grid.push([]);items.push([]);
  for(let x=0;x<W;x++){
   const edge=x===0||y===0||x===W-1||y===H-1;
   grid[y].push(edge||(x%2===0&&y%2===0)?1:(rng()<STAGES[lvl].dens?2:0));
   items[y].push(null);
  }}
 SP.forEach(([sx,sy])=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const x=sx+dx,y=sy+dy;
  if(Math.abs(dx)+Math.abs(dy)<=1&&x>0&&y>0&&x<W-1&&y<H-1&&grid[y][x]===2)grid[y][x]=0;}});
 ps=SP.slice(0,Math.min(4,STAGES[lvl].bots+1+(mode2?1:0))).map((s,i)=>({i,ai:i>0&&!(mode2&&i===1),cx:s[0],cy:s[1],mv:null,dir:2,alive:true,maxB:1,range:2,spd:i&&!(mode2&&i===1)?STAGES[lvl].spd:4.2,col:i?COLS[i]:SKINS[skin],carry:0,sh:0,inv:0}));
 shrinkList=spiral();shrinkIdx=0;shrinkT=0;time=0;endT=0;result='';lastK=-9;combo=0;
 if(STAGES[lvl].boss){const b=ps[mode2?2:1];if(b){b.boss=true;b.sh=3;b.range=4;b.maxB=2;b.col='#ff2e63'}}
}

/* ---------- bombs and blasts ---------- */
function cellsOf(x,y,r){
 const o=[[x,y]];
 for(const [dx,dy] of DIRS)for(let k=1;k<=r;k++){
  const nx=x+dx*k,ny=y+dy*k,g=grid[ny][nx];
  if(solid(g))break;
  o.push([nx,ny]);
  if(g===2)break;
 }
 return o;
}
function placeBomb(p){
 const [x,y]=lc(p);
 if(!p.alive||ownCount(p)>=p.maxB||bombAt(x,y))return false;
 bombs.push({x,y,t:2.3,r:p.range,o:p});
 snd(220,.12,'square',.05,-90);
 return true;
}
function explode(b){
 const i=bombs.indexOf(b);if(i<0)return;
 bombs.splice(i,1);
 snd(130,.4,'sawtooth',.09,-90);shake=Math.max(shake,5);
 for(const [x,y] of cellsOf(b.x,b.y,b.r)){
  flames.push({x,y,t:.45,o:b.o});
  items[y][x]=null;spark(x,y,'#ffb43d',5,110);
  if(grid[y][x]===2){
   grid[y][x]=0;spark(x,y,TH[STAGES[lvl].th][4],8,120);
   if(!b.o.ai){score+=10;note(x,y,'+10','#ffd23d')}
   /* seeded rng so the daily challenge is identical for everyone */
   const r=rng();
   if(r<.42)items[y][x]=r<.11?'B':r<.22?'F':r<.31?'S':r<.37?'H':'K';
  }
  const o=bombs.find(q=>q.x===x&&q.y===y);
  if(o)explode(o);
 }
}
function kill(p,by){
 if(!p.alive)return;
 p.alive=false;snd(300,.5,'sawtooth',.07,-220);shake=8;
 spark(p.cx,p.cy,p.col,22,150);
 if(by&&by!==p&&!by.ai){if(p.boss){score+=500;note(p.cx,p.cy,'BOSS +500','#ffd23d')}const c=time-lastK<4?++combo:(combo=1);lastK=time;const v=100*c;score+=v;note(p.cx,p.cy,'+'+v+(c>1?' combo x'+c:''),'#ff8f8f')}
}

/* ---------- bots ---------- */
function hazard(){
 const m=new Map();
 bombs.forEach(b=>cellsOf(b.x,b.y,b.r).forEach(c=>{const k=c[1]*W+c[0],o=m.get(k);if(o===undefined||b.t<o)m.set(k,b.t)}));
 flames.forEach(f=>m.set(f.y*W+f.x,-1));
 return m;
}
function bfs(sx,sy,hz,flee,goal,spd){
 const q=[[sx,sy,-1,0]],seen=new Set([sy*W+sx]);
 for(let i=0;i<q.length;i++){
  const [x,y,f,n]=q[i];
  if(i>0&&goal(x,y))return f;
  for(let d=0;d<4;d++){
   const nx=x+DIRS[d][0],ny=y+DIRS[d][1],k=ny*W+nx;
   if(seen.has(k)||!canEnter(nx,ny))continue;
   const h=hz.get(k);
   if(h!==undefined){
    if(!flee)continue;
    if(h<0||(n+1)/spd>h-.4)continue;
   }
   seen.add(k);q.push([nx,ny,f<0?d:f,n+1]);
  }
 }
 return -2;
}
function enemyAt(p,x,y){return ps.some(q=>q!==p&&q.alive&&lc(q)[0]===x&&lc(q)[1]===y)}
function decide(p){
 const hz=hazard(),here=p.cy*W+p.cx;
 const safe=(x,y)=>!hz.has(y*W+x);
 if(hz.has(here)){
  const d=bfs(p.cx,p.cy,hz,true,safe,p.spd);
  return d>=0?d:-1;
 }
 if(ownCount(p)<p.maxB&&!bombAt(p.cx,p.cy)&&Math.random()<.7){
  const cells=cellsOf(p.cx,p.cy,p.range);
  if(cells.some(([x,y])=>(x!==p.cx||y!==p.cy)&&(grid[y][x]===2||enemyAt(p,x,y)))){
   const h2=new Map(hz);
   cells.forEach(([x,y])=>{const k=y*W+x,o=h2.get(k);h2.set(k,o===undefined?2.3:Math.min(o,2.3))});
   if(bfs(p.cx,p.cy,h2,true,(x,y)=>!h2.has(y*W+x),p.spd)>=0){placeBomb(p);return -1}
  }
 }
 const want=(x,y)=>DIRS.some(([dx,dy])=>grid[y+dy][x+dx]===2||enemyAt(p,x+dx,y+dy));
 let d=bfs(p.cx,p.cy,hz,false,want,p.spd);
 if(d>=0)return d;
 const opts=[0,1,2,3].filter(k=>canEnter(p.cx+DIRS[k][0],p.cy+DIRS[k][1])&&safe(p.cx+DIRS[k][0],p.cy+DIRS[k][1]));
 return opts.length?opts[Math.random()*opts.length|0]:-1;
}

function bossAttack(b){
 const t=ps.find(q=>!q.ai&&q.alive);if(!t)return;
 const [tx,ty]=lc(t),c=[];
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(grid[y][x]===0&&!bombAt(x,y)&&Math.abs(x-tx)+Math.abs(y-ty)<=3)c.push([x,y]);
 c.sort(()=>Math.random()-.5);
 c.slice(0,3+(b.sh<2?1:0)).forEach(([x,y])=>{bombs.push({x,y,t:1.6,r:2,o:b});spark(x,y,'#ff2e63',6,60)});
 snd(80,.5,'sawtooth',.1,-40);shake=10;note(b.cx,b.cy,'BOSS ATTACK!','#ff5d73');
}
/* ---------- update ---------- */
function tryMove(p,d,carry){
 p.dir=d;
 const nx=p.cx+DIRS[d][0],ny=p.cy+DIRS[d][1];
 if(canEnter(nx,ny))p.mv={x:nx,y:ny,t:carry||0};
 else if(p.kick){const b=bombs.find(q=>q.x===nx&&q.y===ny);if(b&&b.sl===undefined&&canEnter(nx+DIRS[d][0],ny+DIRS[d][1])){b.sl=d;b.st=0;snd(260,.08,'square',.04)}}
}
function closeNext(){
 while(shrinkIdx<shrinkList.length){
  const [x,y]=shrinkList[shrinkIdx++];
  if(solid(grid[y][x]))continue;
  grid[y][x]=3;items[y][x]=null;shake=Math.max(shake,3);spark(x,y,'#c27f8d',6,80);
  bombs=bombs.filter(b=>!(b.x===x&&b.y===y));
  ps.forEach(p=>{if(p.alive&&((p.cx===x&&p.cy===y)||(p.mv&&p.mv.x===x&&p.mv.y===y)))kill(p)});
  snd(90,.2,'square',.05,-30);
  break;
 }
}
function update(dt){
 time+=dt;
 for(const p of ps){
  if(!p.alive)continue;
  if(p.inv>0)p.inv-=dt;
  if(p.boss&&p.alive){p.bt=(p.bt||0)+dt;if(p.bt>5.5-(3-Math.max(0,p.sh))*1.2){p.bt=0;bossAttack(p)}}
  if(p.mv){
   p.mv.t+=dt*p.spd;
   if(p.mv.t>=1){p.carry=p.mv.t-1;p.cx=p.mv.x;p.cy=p.mv.y;p.mv=null}
  }
  if(!p.mv){
   const hh=p.i===1?held2:held,d=p.ai?decide(p):(hh.length?hh[hh.length-1]:-1);
   if(d>=0)tryMove(p,d,p.ai?0:p.carry);
   p.carry=0;
  }
 }
 if(bombReq){bombReq=false;if(ps[0].alive)placeBomb(ps[0])}
 if(bombReq2){bombReq2=false;if(ps[1]&&!ps[1].ai&&ps[1].alive)placeBomb(ps[1])}
 for(const b of bombs){if(b.sl===undefined)continue;b.st+=dt;if(b.st>=.07){b.st=0;const nx=b.x+DIRS[b.sl][0],ny=b.y+DIRS[b.sl][1];if(canEnter(nx,ny)&&!ps.some(q=>q.alive&&lc(q)[0]===nx&&lc(q)[1]===ny)){b.x=nx;b.y=ny}else b.sl=undefined}}
 for(const b of bombs.slice()){b.t-=dt;b.tk=(b.tk||0)-dt;if(b.t<1&&b.tk<=0){b.tk=.2;snd(1000,.04,'square',.02)}if(b.t<=0)explode(b)}
 flames=flames.filter(f=>(f.t-=dt)>0);
 for(const p of ps){
  if(!p.alive)continue;
  const [x,y]=lc(p);
  const f=flames.find(f=>f.x===x&&f.y===y);
  if(f){
   if(p.inv>0)continue;
   if(p.sh>0){p.sh--;p.inv=1.5;snd(700,.2,'triangle',.06,-300);spark(x,y,'#b46cff',12,120);if(!p.ai)note(x,y,'Shield!','#d9b3ff')}
   else kill(p,f.o);
   continue;
  }
  const it=items[y][x];
  if(it){
   items[y][x]=null;
   if(it==='B')p.maxB=Math.min(5,p.maxB+1);
   if(it==='F')p.range=Math.min(7,p.range+1);
   if(it==='S')p.spd=Math.min(p.ai?5.2:6.4,p.spd+.5);
   if(it==='H')p.sh=Math.min(2,p.sh+1);
   if(it==='K')p.kick=true;
   if(!p.ai){score+=20;snd({B:500,F:420,S:700,H:880,K:360}[it]||600,.15,'triangle',.06,500);note(x,y,'+20','#7dffb0');spark(x,y,'#fff',8,70)}
  }
 }
 if(time>STAGES[lvl].shr){shrinkT-=dt;if(shrinkT<=0){closeNext();shrinkT=.6}}
 const left=ps.filter(p=>p.ai&&p.alive).length,hum=ps.filter(p=>!p.ai&&p.alive).length;
 if(!endT){
  if(!hum){endT=1.3;result=left?'lose':'draw'}
  else if(!left){endT=1.3;result='win';score+=500+Math.max(0,Math.round(150-time));snd(520,.4,'triangle',.07,400)}
 }else if((endT-=dt)<=0)finish();
}

/* ---------- drawing ---------- */
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function block(px,py,c,hi){
 const g=ctx.createLinearGradient(px,py,px+T,py+T);g.addColorStop(0,hi);g.addColorStop(1,c);
 ctx.fillStyle=g;rr(px+1,py+1,T-2,T-2,6);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(px+5,py+4,T-10,3);
 ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=2;rr(px+1,py+1,T-2,T-2,6);ctx.stroke();
}
function brick(px,py,col){
 const g=ctx.createLinearGradient(px,py,px,py+T);g.addColorStop(0,col);g.addColorStop(1,'rgba(60,25,10,1)');
 ctx.fillStyle=col;rr(px+2,py+2,T-4,T-4,5);ctx.fill();
 ctx.globalAlpha=.45;ctx.fillStyle=g;rr(px+2,py+2,T-4,T-4,5);ctx.fill();ctx.globalAlpha=1;
 ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=2;
 ctx.beginPath();
 for(let k=1;k<3;k++){ctx.moveTo(px+3,py+2+k*(T-4)/3);ctx.lineTo(px+T-3,py+2+k*(T-4)/3)}
 ctx.moveTo(px+T/2,py+3);ctx.lineTo(px+T/2,py+T/3+1);
 ctx.moveTo(px+T/3,py+T/3);ctx.lineTo(px+T/3,py+2*T/3);
 ctx.moveTo(px+2*T/3,py+T/3);ctx.lineTo(px+2*T/3,py+2*T/3);
 ctx.moveTo(px+T/2,py+2*T/3);ctx.lineTo(px+T/2,py+T-3);
 ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(px+4,py+4,T-8,3);
}
function drawP(p){
 let x=p.cx,y=p.cy;
 if(p.mv){x+=(p.mv.x-p.cx)*p.mv.t;y+=(p.mv.y-p.cy)*p.mv.t}
 if(p.inv>0&&Math.sin(an*40)>0)return;
 const px=x*T+T/2,py=y*T+T/2,bob=p.mv?Math.abs(Math.sin(an*14))*3:0;
 if(p.boss){ctx.save();ctx.translate(px,py);ctx.scale(1.35,1.35);ctx.translate(-px,-py)}
 ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(px,py+16,15,6,0,0,7);ctx.fill();
 const g=ctx.createRadialGradient(px-6,py-11-bob,2,px,py-3-bob,19);g.addColorStop(0,'#fff');g.addColorStop(.25,p.col);g.addColorStop(1,'rgba(0,0,0,.55)');
 ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(px,py-3-bob,17,0,7);ctx.fill();
 ctx.fillStyle=g;ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(px,py-3-bob,17,0,7);ctx.fill();ctx.globalAlpha=1;
 ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py-3-bob,17,0,7);ctx.stroke();
 const dx=DIRS[p.dir][0]*3,dy=DIRS[p.dir][1]*2;
 for(const s of[-6,6]){
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(px+s+dx,py-5-bob+dy,4.5,5.5,0,0,7);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(px+s+dx*1.6,py-5-bob+dy*1.4,2.2,0,7);ctx.fill();
 }
 if(!p.ai){
  const a=skin,ty=py-20-bob;ctx.fillStyle='#222';ctx.strokeStyle='#222';ctx.lineWidth=2;
  if(a===0){ctx.beginPath();ctx.moveTo(px,ty);ctx.lineTo(px,ty-9);ctx.stroke();ctx.fillStyle='#ff5a2e';ctx.beginPath();ctx.arc(px,ty-11,3.5,0,7);ctx.fill()}
  else if(a===1){ctx.fillStyle=p.col;for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(px+s*14,ty+3);ctx.lineTo(px+s*13,ty-9);ctx.lineTo(px+s*4,ty);ctx.closePath();ctx.fill();ctx.stroke()}}
  else if(a===2){ctx.fillStyle='#ffd23d';ctx.beginPath();ctx.moveTo(px-10,ty+2);ctx.lineTo(px-10,ty-8);ctx.lineTo(px-5,ty-3);ctx.lineTo(px,ty-10);ctx.lineTo(px+5,ty-3);ctx.lineTo(px+10,ty-8);ctx.lineTo(px+10,ty+2);ctx.closePath();ctx.fill();ctx.stroke()}
  else{ctx.fillRect(px-13,py-8-bob,26,6)}
  const b=Math.sin(an*6)*2;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(px-6,py-31-bob+b);ctx.lineTo(px+6,py-31-bob+b);ctx.lineTo(px,py-24-bob+b);ctx.closePath();ctx.fill();
 }
 if(p.sh>0){ctx.strokeStyle='rgba(190,130,255,'+(.6+.3*Math.sin(an*8))+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(px,py-3-bob,22,0,7);ctx.stroke()}
 if(p.boss)ctx.restore();
}
const IC={B:['#3d8bff','B'],F:['#ff5a3d','F'],S:['#2ecc71','S'],H:['#a45cff','H'],K:['#ffa31a','K']};
function draw(){
 const th=TH[STAGES[lvl].th];
 ctx.setTransform(cv.width/CW,0,0,cv.height/CH,0,0);
 ctx.clearRect(0,0,CW,CH);
 ctx.save();
 if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const px=x*T,py=y*T,g=grid[y][x];
  ctx.fillStyle=(x+y)%2?th[0]:th[1];ctx.fillRect(px,py,T,T);
  if(g===1){const e=x===0||y===0||x===W-1||y===H-1;block(px,py,e?'#434d6e':th[2],e?'#566285':th[3])}
  else if(g===3)block(px,py,'#8a4a5a','#c27f8d');
  else if(g===2)brick(px,py,th[4]);
  else if(y>0&&solid(grid[y-1][x])){ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(px,py,T,8)}
 }
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 18px Trebuchet MS, sans-serif';
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const it=items[y][x];if(!it)continue;
  const cx=x*T+T/2,cy=y*T+T/2+Math.sin(an*4+x)*2;
  const g=ctx.createRadialGradient(cx-5,cy-6,2,cx,cy,17);g.addColorStop(0,'#fff');g.addColorStop(.3,IC[it][0]);g.addColorStop(1,IC[it][0]);
  ctx.shadowColor=IC[it][0];ctx.shadowBlur=12;
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,16,0,7);ctx.fill();
  ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.fillText(IC[it][1],cx,cy+1);
 }
 for(const f of flames){
  const a=Math.min(1,f.t/.3),px=f.x*T,py=f.y*T;
  ctx.shadowColor='#ff8a2e';ctx.shadowBlur=14;
  ctx.fillStyle='rgba(255,110,30,'+a+')';rr(px+3,py+3,T-6,T-6,10);ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,220,90,'+a+')';rr(px+10,py+10,T-20,T-20,7);ctx.fill();
 }
 for(const b of bombs){
  const cx=b.x*T+T/2,cy=b.y*T+T/2+3,s=1+.08*Math.sin(an*12);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(cx,cy+13,14,5,0,0,7);ctx.fill();
  const hot=b.t<.7&&Math.sin(an*30)>0;
  const g=ctx.createRadialGradient(cx-5,cy-6,2,cx,cy,17*s);g.addColorStop(0,hot?'#ff7a6a':'#555a70');g.addColorStop(1,hot?'#c0392b':'#14141c');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,16*s,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(cx-5,cy-6,4,0,7);ctx.fill();
  ctx.strokeStyle='#caa46a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx+6,cy-12);ctx.quadraticCurveTo(cx+12,cy-20,cx+16,cy-17);ctx.stroke();
  ctx.fillStyle=Math.sin(an*25)>0?'#ffd23d':'#ff6a2e';ctx.beginPath();ctx.arc(cx+16,cy-17,3.5,0,7);ctx.fill();
 }
 ps.filter(p=>p.alive).sort((a,b)=>a.cy-b.cy).forEach(drawP);
 for(const p of parts){ctx.globalAlpha=Math.max(0,p.t/p.m);ctx.fillStyle=p.c;ctx.fillRect(p.x-2.5,p.y-2.5,5,5)}
 ctx.globalAlpha=1;
 ctx.font='bold 15px Trebuchet MS, sans-serif';
 for(const t of txts){ctx.globalAlpha=Math.min(1,t.t*2);ctx.fillStyle=t.c;ctx.fillText(t.s,t.x,t.y)}
 ctx.globalAlpha=1;
 ctx.restore();
 const v=ctx.createRadialGradient(CW/2,CH/2,CH*.35,CW/2,CH/2,CW*.65);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.35)');
 ctx.fillStyle=v;ctx.fillRect(0,0,CW,CH);
 if(time>STAGES[lvl].shr&&state==='play'&&shrinkIdx<shrinkList.length){
  ctx.font='bold 16px Trebuchet MS, sans-serif';ctx.fillStyle='rgba(255,255,255,'+(.55+.4*Math.sin(an*5))+')';
  ctx.fillText('Arena is shrinking!',CW/2,T/2);
 }
}

/* ---------- ui and flow ---------- */
const ov=$('ov'),go=$('go'),sh=$('sh');
function setHud(){
 $('sc').textContent=score;
 const t=Math.floor(time);$('tm').textContent=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
 $('bt').textContent=ps.filter(p=>p.ai&&p.alive).length;
 $('st').textContent=(lvl+1)+'❤'+lives;
 $('pw').textContent=ps[0].maxB+'/'+ps[0].range+(ps[0].sh?' 🛡'+ps[0].sh:'')+(ps[0].kick?' 🦶':'');
}
function showOv(title,sub,btn,share){
 $('ot').textContent=title;$('os').textContent=sub;go.textContent=btn;sh.hidden=!share;sh.textContent='Share score';
 $('tp').hidden=state==='over';$('pk').hidden=state!=='menu';$('dl').hidden=state!=='menu';$('p2').hidden=state!=='menu';$('ins').hidden=state!=='menu'||isApp;$('mn').hidden=state==='menu';$('lb').textContent=lbText();ov.hidden=false;
 $('ov').querySelector('.card').scrollTop=0;
}
function mul(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function dayKey(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
function lbText(){let a=[],d=0;try{a=JSON.parse(localStorage.getItem('bomber-lb')||'[]');d=+localStorage.getItem('bomber-d'+dayKey())||0}catch(e){}const t=a.length?'Top scores: '+a.map(x=>x.s).join(', ')+'.':'';return t+(d?(t?' ':'')+'Daily best today: '+d+'.':'')}
function buildSkn(){const e=$('skn');e.innerHTML='';SKINS.forEach((s,i)=>{const b=document.createElement('button');b.style.background=s;b.className=i===skin?'sel':'';b.setAttribute('aria-label','Character '+(i+1));b.onclick=()=>{skin=i;try{localStorage.setItem('bomber-skin',String(i))}catch(x){}init();buildSkn()};e.appendChild(b)})}
let mt=null,mstep=0;const NOTES=[110,0,131,0,147,0,131,0,110,0,165,0,147,0,131,0];
function music(on){clearInterval(mt);mt=null;if(on&&!muted)mt=setInterval(()=>{const n=NOTES[mstep++%16];if(n)snd(n,.2,'triangle',.025)},230)}
function begin(newRun){if(newRun)score=0;base=score;rng=daily?mul(dayKey()*10+lvl):Math.random;init();held=[];held2=[];state='play';ov.hidden=true;go.blur();snd(440,.15,'triangle',.05,200);music(true)}
function desc(){const s=STAGES[lvl];return 'Stage '+(lvl+1)+': '+s.n+'. Beat '+s.bots+(s.bots>1?' bots':' bot')+' before the arena starts shrinking at '+s.shr+' seconds.'}
function buildStg(){const e=$('stg');e.innerHTML='';STAGES.forEach((s,i)=>{const b=document.createElement('button');b.textContent=i+1;b.disabled=i>=unlocked;b.title=s.n;b.className=i===lvl?'sel':'';b.onclick=()=>{lvl=i;buildStg();$('os').textContent=desc();init()};e.appendChild(b)})}
function pause(){if(state!=='play')return;state='pause';held=[];music(false);showOv('Paused','Take a break. Your game is waiting.','Resume',false)}
function resume(){if(state!=='pause')return;state='play';ov.hidden=true;go.blur();music(true)}
function finish(){
 state='over';music(false);
 try{if(score>0){const a=JSON.parse(localStorage.getItem('bomber-lb')||'[]');a.push({s:score});a.sort((x,y)=>y.s-x.s);localStorage.setItem('bomber-lb',JSON.stringify(a.slice(0,5)));if(daily){const k='bomber-d'+dayKey();if(score>(+localStorage.getItem(k)||0))localStorage.setItem(k,String(score))}}}catch(e){}
 if(score>best){best=score;try{localStorage.setItem('bomber-best',String(best))}catch(e){}}
 const last=lvl===NS-1,win=result==='win';
 if(!win&&!daily)lives--;
 jingle(win?[523,659,784,1047]:[330,262,196]);
 if(win&&!last&&!daily){unlocked=Math.max(unlocked,lvl+2);try{localStorage.setItem('bomber-unlocked',String(unlocked))}catch(e){}}
 const t=daily&&win?'Daily cleared!':win?(last?'All stages cleared!':'Stage '+(lvl+1)+' cleared!'):result==='draw'?'Draw':'You were blown up';
 const s=win?'Score: '+score+'.':'Score: '+score+'. Keep an escape route from every bomb.';
 const dead=!win&&!daily&&lives<=0;
 showOv(dead?'Game over':t,s+' Best: '+best+'.'+(!win&&!daily&&!dead?' Lives left: '+lives+'.':''),daily?'Play daily again':win?(last?'Play again':'Next stage'):dead?'New game':'Retry stage',true);
 onlineSubmit().then(onlineTop);
}
go.addEventListener('click',()=>{
 if(state==='pause')return resume();
 if(state==='over'&&daily)return begin(true);
 if(state==='over'&&result==='win'&&lvl<NS-1){lvl++;return begin(false)}
 if(state==='over'&&result==='win'){lvl=0;lives=3;return begin(true)}
 if(state==='over'){if(lives<=0){lives=3;lvl=0;return begin(true)}score=base;return begin(false)}
 daily=false;lives=3;lvl=Math.min(lvl,unlocked-1);begin(true);
});
$('dl').addEventListener('click',()=>{if(!daily)prevLvl=lvl;daily=true;lvl=4;begin(true)});
$('mn').addEventListener('click',()=>{if(daily){daily=false;lvl=Math.min(prevLvl,unlocked-1)}state='menu';held=[];music(false);init();buildStg();buildSkn();showOv('Bomber Arena',desc(),'Play',false)});
sh.addEventListener('click',async()=>{
 const text='I scored '+score+' in Bomber Arena! Can you beat me? '+location.href;
 try{
  if(navigator.share)await navigator.share({text});
  else{await navigator.clipboard.writeText(text);sh.textContent='Copied to clipboard'}
 }catch(e){}
});
$('pz').addEventListener('click',()=>state==='pause'?resume():pause());
$('mu').addEventListener('click',e=>{muted=!muted;e.currentTarget.textContent=muted?'🔇':'🔊';music(!muted&&state==='play')});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});

function jingle(a){a.forEach((f,i)=>setTimeout(()=>snd(f,.2,'triangle',.06),i*130))}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('button'))snd(520,.05,'square',.03)});
const fsb=$('fs');if(!document.documentElement.requestFullscreen)fsb.hidden=true;
fsb.addEventListener('click',()=>{try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen()}catch(e){}});
document.addEventListener('fullscreenchange',()=>setTimeout(resize,200));
const isApp=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone;
let dip=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e});
addEventListener('appinstalled',()=>{$('ins').hidden=true});
$('ins').addEventListener('click',async()=>{if(dip){dip.prompt();try{await dip.userChoice}catch(x){}dip=null}else alert('Install: Chrome menu (3 dots) > Install app / Add to Home screen. iPhone: Safari Share > Add to Home Screen.')});
if(isApp)$('ins').hidden=true;
/* 2 players (co-op) */
$('p2').addEventListener('click',()=>{mode2=!mode2;$('p2').textContent='2 Players: '+(mode2?'On':'Off');document.body.classList.toggle('m2',mode2);init()});
/* online leaderboard: paste your Firebase Realtime Database URL here (no slash at end), e.g. https://xxxx-default-rtdb.firebaseio.com */
const LB_URL='https://bomber-arena-default-rtdb.firebaseio.com';
async function onlineSubmit(){
 if(!LB_URL||score<=0||daily)return;
 let n='Player';
 try{n=localStorage.getItem('bomber-name')||'';if(!n){n=(prompt('Name for the leaderboard (max 12 letters)')||'Player').slice(0,12);localStorage.setItem('bomber-name',n)}}catch(e){n='Player'}
 try{await fetch(LB_URL+'/scores.json',{method:'POST',body:JSON.stringify({n,s:score})})}catch(e){}
}
async function onlineTop(){
 if(!LB_URL)return;
 try{const r=await fetch(LB_URL+'/scores.json?orderBy="$key"&limitToLast=60');const o=await r.json();const a=Object.values(o||{}).sort((x,y)=>y.s-x.s);if(a.length)$('lb').textContent='World top: '+a.slice(0,5).map(x=>String(x.n).slice(0,12)+' '+x.s).join(', ')}catch(e){}
}
/* keyboard */
const KEYS2={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3};
const KEYS={ArrowUp:0,w:0,W:0,ArrowRight:1,d:1,D:1,ArrowDown:2,s:2,S:2,ArrowLeft:3,a:3,A:3};
addEventListener('keydown',e=>{
 if(e.repeat&&(e.key===' '||e.key==='Enter'))return;
 if(e.key==='p'||e.key==='P'||e.key==='Escape'){e.preventDefault();state==='pause'?resume():pause();return}
 if(mode2&&state==='play'){if(e.key in KEYS2){e.preventDefault();const d=KEYS2[e.key];if(!held2.includes(d))held2.push(d);return}if(e.key==='Enter'){e.preventDefault();bombReq2=true;return}}
 if(e.key===' '||e.key==='Enter'){
  e.preventDefault();
  if(state==='menu'||state==='over')go.click();
  else if(state==='pause')resume();
  else bombReq=true;
  return;
 }
 if(e.key==='b'||e.key==='B'){bombReq=true;return}
 if(e.key in KEYS){e.preventDefault();const d=KEYS[e.key];if(!held.includes(d))held.push(d)}
});
addEventListener('keyup',e=>{if(e.key in KEYS2){const i=held2.indexOf(KEYS2[e.key]);if(i>=0)held2.splice(i,1)}if(e.key in KEYS){const i=held.indexOf(KEYS[e.key]);if(i>=0)held.splice(i,1)}});
addEventListener('blur',()=>{held=[];held2=[]});

/* touch */
document.querySelectorAll('#dp button,#dp2 button').forEach(b=>{
 const H=()=>b.parentElement.id==='dp2'?held2:held;
 const d=+b.dataset.d;
 const off=()=>{const i=H().indexOf(d);if(i>=0)H().splice(i,1);b.classList.remove('on')};
 b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(x){}if(!H().includes(d))H().push(d);b.classList.add('on')});
 b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);
});
const bm=$('bm');
bm.addEventListener('pointerdown',e=>{e.preventDefault();bombReq=true;bm.classList.add('on')});
['pointerup','pointercancel','pointerleave'].forEach(n=>bm.addEventListener(n,()=>bm.classList.remove('on')));
const bm2=$('bm2');
bm2.addEventListener('pointerdown',e=>{e.preventDefault();bombReq2=true;bm2.classList.add('on')});
['pointerup','pointercancel','pointerleave'].forEach(n=>bm2.addEventListener(n,()=>bm2.classList.remove('on')));
addEventListener('contextmenu',e=>e.preventDefault());

/* loop */
let last=performance.now();
function loop(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 try{
  an+=dt;
  if(state==='play')update(dt);
  else if(state==='over'){flames=flames.filter(f=>(f.t-=dt)>0)}
  if(state!=='pause')fx(dt);
  draw();setHud();
 }catch(e){if(!loop.er){loop.er=1;window.__err&&window.__err(e.message+' | '+String(e.stack).split('\n')[1])}}
 requestAnimationFrame(loop);
}
init();buildStg();buildSkn();$('os').textContent=desc();$('lb').textContent=lbText();resize();
requestAnimationFrame(loop);
new ResizeObserver(resize).observe(stage);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
onlineTop();
const qs=location.search||'';if(/mode=daily/.test(qs))setTimeout(()=>$('dl').click(),300);else if(/mode=coop/.test(qs))setTimeout(()=>$('p2').click(),300);
})();
