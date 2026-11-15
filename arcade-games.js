/* МОГУ Arcade Pack — eight replayable arcade games */
(()=>{
const G=[
{id:"2048",icon:"🔢",title:"2048",desc:"Складывай одинаковые числа. Игра без конца — до первого тупика.",tone:"yellow"},
{id:"frog",icon:"🐸",title:"Лягушка через дорогу",desc:"Помоги лягушке добраться домой. 30 уровней.",tone:"mint"},
{id:"snake",icon:"🐍",title:"Змейка",desc:"Собирай фрукты, расти и проходи 30 уровней.",tone:"pink"},
{id:"breakout",icon:"🧱",title:"Кирпичики",desc:"Отбивай мяч и разбивай всё больше блоков. 30 уровней.",tone:"blue"},
{id:"space",icon:"🚀",title:"Космический защитник",desc:"Защищай планету и сбивай волны пришельцев. 30 уровней.",tone:"pink"},
{id:"jumper",icon:"🦘",title:"Прыгун",desc:"Прыгай по платформам, собирай звёзды и не падай. 30 уровней.",tone:"yellow"},
{id:"fruit",icon:"🍎",title:"Ловец фруктов",desc:"Лови фрукты и уворачивайся от бомб. 30 уровней.",tone:"mint"},
{id:"racing",icon:"🏎️",title:"Весёлые гонки",desc:"Объезжай машины и препятствия на всё более быстрых трассах. 30 уровней.",tone:"blue"}
];
const $q=s=>document.querySelector(s);
let current=null,raf=0,last=0,game=null,keys={},touchStart=null;
const save=(id,level)=>{const p=JSON.parse(localStorage.getItem("mogu-arcade-progress")||"{}");p[id]=Math.max(p[id]||1,level);localStorage.setItem("mogu-arcade-progress",JSON.stringify(p))};
const progress=()=>{try{return JSON.parse(localStorage.getItem("mogu-arcade-progress")||"{}")}catch(e){return {}}};
const best=id=>{try{return Number(localStorage.getItem("mogu-arcade-best-"+id)||0)}catch(e){return 0}};
const t=(s)=>s;
function hub(){
 document.body.classList.remove("arcade-playing");
 cancelAnimationFrame(raf);current=null;
 const p=progress();
 document.getElementById("app-main").innerHTML='<section class="arcade-hub"><div class="arcade-welcome"><div class="arcade-mascot">🎮</div><div><h2>Большая игровая площадка!</h2><p>Выбирай аркаду, набирай очки и открывай новые уровни. Играй в своём темпе!</p></div></div><div class="arcade-grid">'+G.map(g=>'<button class="arcade-card arcade-'+g.tone+'" data-arcade-start="'+g.id+'"><span class="arcade-icon">'+g.icon+'</span><strong>'+g.title+'</strong><small>'+g.desc+'</small><span class="arcade-progress">'+(g.id==="2048"?"♾️ Без уровней":"⭐ Открыт уровень "+(p[g.id]||1)+" из 30")+'</span><span class="arcade-play">Играть →</span></button>').join("")+'</div></section>';
 if(typeof nav==="function")nav("home");
}
function shell(g,inner){
 document.body.classList.add("arcade-playing");
 document.getElementById("app-main").innerHTML='<section class="arcade-shell"><div class="arcade-top"><button class="soft-button" data-arcade-back>← Все игры</button><strong>'+g.icon+' '+g.title+'</strong><button class="arcade-restart" data-arcade-restart aria-label="Заново">↻</button></div>'+inner+'</section>';
 if(typeof nav==="function")nav("home");
}
function start(id,forcedLevel){
 const g=G.find(x=>x.id===id);if(!g)return;
 cancelAnimationFrame(raf);last=0;current=id;
 if(id==="2048"){init2048();return}
 const p=progress(),level=Math.min(30,Math.max(1,Number(forcedLevel)||p[id]||1));
 game={id,level,score:0,lives:3,done:false,over:false,entities:[],tick:0,elapsed:0,player:{x:0,y:0},target:Math.min(6+level,24),world:0};
 setupGame();drawFrame(0);
}
function init2048(){
 game={id:"2048",board:Array(16).fill(0),score:0,over:false};
 addTile();addTile();render2048();
}
function addTile(){const empty=game.board.map((v,i)=>v?null:i).filter(v=>v!==null);if(!empty.length)return;game.board[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4}
function slideLine(line){
 let a=line.filter(Boolean),gain=0;
 for(let i=0;i<a.length-1;i++)if(a[i]===a[i+1]){a[i]*=2;gain+=a[i];a.splice(i+1,1)}
 while(a.length<4)a.push(0);return {a,gain}
}
function move2048(dir){
 if(current!=="2048"||game.over)return;
 const old=game.board.slice(),b=game.board.slice(),vertical=dir==="up"||dir==="down",reverse=dir==="right"||dir==="down";let gain=0;
 for(let n=0;n<4;n++){let line=[];for(let k=0;k<4;k++)line.push(vertical?b[k*4+n]:b[n*4+k]);if(reverse)line.reverse();const r=slideLine(line);gain+=r.gain;if(reverse)r.a.reverse();for(let k=0;k<4;k++){if(vertical)b[k*4+n]=r.a[k];else b[n*4+k]=r.a[k]}}
 if(b.every((v,i)=>v===old[i]))return;
 game.board=b;game.score+=gain;addTile();
 if(!game.board.some(v=>!v)&&!["left","right","up","down"].some(d=>canMove(d)))game.over=true;
 render2048();
}
function canMove(d){const old=game.board.slice();const vertical=d==="up"||d==="down",reverse=d==="right"||d==="down";for(let n=0;n<4;n++){let line=[];for(let k=0;k<4;k++)line.push(vertical?old[k*4+n]:old[n*4+k]);if(reverse)line.reverse();const r=slideLine(line).a;if(reverse)r.reverse();for(let k=0;k<4;k++)if((vertical?old[k*4+n]:old[n*4+k])!==r[k])return true}return false}
function render2048(){
 const vals=game.board.map(v=>'<div class="tile tile-'+(v||0)+'">'+(v||"")+'</div>').join("");
 shell(G[0],'<div class="arcade-stats"><span>Очки: <b>'+game.score+'</b></span><span>Рекорд: <b>'+Math.max(best("2048"),game.score)+'</b></span></div><div class="board-2048">'+vals+'</div><p class="arcade-hint">'+(game.over?"Игра окончена — ходов больше нет. Твой результат: "+game.score:"Соединяй одинаковые числа. Управляй игрой свайпами по полю.")+'</p>'+(game.over?'<button class="arcade-main-btn" data-arcade-restart>Играть снова</button>':''));
 if(game.over){localStorage.setItem("mogu-arcade-best-2048",String(Math.max(best("2048"),game.score)))}
}
function setupGame(){
 const id=current,l=game.level;
 if(id==="frog"){game.player={x:4,y:9};game.entities=[];for(let y=1;y<=7;y+=2)for(let i=0;i<2+Math.floor(l/8);i++)game.entities.push({x:Math.random()*9,y,speed:(Math.random()<.5?-1:1)*(0.7+l*.055+Math.random()*.4),type:"car",w:1.1+Math.random()*.5})}
 if(id==="snake"){game.player={x:7,y:7,dir:"right"};game.snake=[{x:7,y:7},{x:6,y:7},{x:5,y:7}];game.started=false;game.moveClock=0;placeFood()}
 if(id==="breakout"){game.paddle=4;game.ball={x:4.5,y:7,dx:.08+l*.003,dy:-.12-l*.004};game.bricks=[];for(let y=0;y<Math.min(3+Math.ceil(l/5),6);y++)for(let x=0;x<8;x++)game.bricks.push({x:x+.08,y:y+.5,alive:true})}
 if(id==="space"){game.player={x:4,y:8};game.entities=[];game.bullets=[];game.wave=1;game.wavesTotal=game.level===1?1:game.level===2?2:Math.min(5,2+Math.floor((game.level-3)/2));game.hasBoss=game.level>=3&&game.level%3===0;game.spawnedInWave=0;game.spawn=0;game.stagePause=0;game.boss=null;game.bossSpawned=false;game.bossShots=[];game.kills=0}
 if(id==="jumper"){game.player={x:4,y:650,vy:-8};game.platforms=[];for(let i=0;i<9;i++)game.platforms.push({x:Math.random()*7.2,y:720-i*100,w:1.2+Math.random()*.6});game.stars=0}
 if(id==="fruit"){game.player={x:4,y:8};game.entities=[];game.spawn=0}
 if(id==="racing"){game.player={x:1,y:8};game.entities=[];game.spawn=0}
 const spaceHud=id==="space"?'<span>Волна: <b id="arcade-wave">1/'+game.wavesTotal+'</b></span>':"";
 const spaceFire=id==="space"?'<button class="space-fire-btn" data-game-action="fire">🔥 ОГОНЬ</button>':"";
 const canvas='<div class="arcade-stats"><span>Уровень: <b id="arcade-level">'+l+'/30</b></span>'+spaceHud+'<span>Очки: <b id="arcade-score">0</b></span><span>❤️ <b id="arcade-lives">3</b></span></div><canvas id="arcade-canvas" width="800" height="900" aria-label="Игровое поле"></canvas>'+spaceFire+'<p class="arcade-hint" id="arcade-hint">'+hint(id)+'</p><div id="arcade-message"></div>';
 shell(G.find(x=>x.id===id),canvas);
}
function hint(id){return ({frog:"Проведи лягушку через дорогу к домику. Касайся поля или проводи пальцем в нужную сторону.",snake:"Собирай фрукты. Не касайся стен и собственного хвоста.",breakout:"Веди пальцем по полю — платформа будет двигаться за ним.",space:"Веди пальцем, чтобы двигать корабль, и нажимай кнопку ОГОНЬ. В каждой волне 10 врагов.",jumper:"Касайся поля для прыжка и веди пальцем, чтобы двигаться.",fruit:"Перемещай корзинку пальцем по полю.",racing:"Свайпай влево и вправо, чтобы менять полосу."})[id]}
function placeFood(){
 let p;do{p={x:Math.floor(Math.random()*14)+1,y:Math.floor(Math.random()*12)+1}}while(game.snake&&game.snake.some(s=>s.x===p.x&&s.y===p.y));
 const roll=Math.random();game.food={...p,value:roll<.07?10:roll<.27?5:1};
}
function ctx(){const c=$q("#arcade-canvas");return c?c.getContext("2d"):null}
function rect(c,x,y,w,h,color,r=12){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function drawFrame(ts){
 if(!current||current==="2048"||!$q("#arcade-canvas"))return;
 const c=ctx(),W=800,H=900,dt=Math.min(32,ts-last||16)/16;last=ts;game.elapsed+=dt;game.tick+=dt;
 c.clearRect(0,0,W,H);rect(c,0,0,W,H,"#dff3ff",30);
 c.strokeStyle="#ffffffaa";c.lineWidth=5;for(let y=100;y<900;y+=100){c.beginPath();c.moveTo(0,y);c.lineTo(800,y);c.stroke()}
 const id=current,l=game.level;
 if(id==="frog")drawFrog(c,dt);
 if(id==="snake")drawSnake(c,dt);
 if(id==="breakout")drawBreakout(c,dt);
 if(id==="space")drawSpace(c,dt);
 if(id==="jumper")drawJumper(c,dt);
 if(id==="fruit")drawFruit(c,dt);
 if(id==="racing")drawRacing(c,dt);
 const sc=$q("#arcade-score"),lv=$q("#arcade-lives");if(sc)sc.textContent=game.score;if(lv)lv.textContent=game.lives;const wh=$q("#arcade-wave");if(wh&&game.id==="space")wh.textContent=game.wave+"/"+game.wavesTotal;
 if(!game.done&&!game.over)raf=requestAnimationFrame(drawFrame);
}
function drawTrafficCar(c,e){
 const x=e.x*80,y=e.y*100+12,w=Math.max(88,e.w*80),h=66;
 const colors=["#ff5268","#ffb52e","#4778f5","#8c58df","#27b98b"];
 const color=colors[Math.floor(e.y)%colors.length],right=e.speed>0;
 c.save();c.translate(x+w/2,y+h/2);if(!right)c.scale(-1,1);c.translate(-w/2,-h/2);
 // Wheels and tires
 rect(c,10,5,w*.2,15,"#263244",6);rect(c,w*.72,5,w*.2,15,"#263244",6);
 rect(c,10,h-20,w*.2,15,"#263244",6);rect(c,w*.72,h-20,w*.2,15,"#263244",6);
 // Main body, hood and roof
 rect(c,2,13,w-4,h-26,color,17);
 rect(c,w*.18,3,w*.58,h-8,color,18);
 // Windows
 rect(c,w*.25,8,w*.48,22,"#bcecff",8);
 rect(c,w*.48,9,5,20,"#ffffffa8",2);
 // Windshield and rear window highlights
 rect(c,w*.12,19,w*.13,17,"#e8f8ff",5);
 // Bumpers and lights
 rect(c,0,27,8,18,"#fff0a6",4);rect(c,w-8,27,8,18,"#ffeb9a",4);
 rect(c,8,h-24,w-16,5,"#ffffff70",3);
 // Decorative side stripe
 rect(c,w*.24,h-17,w*.48,4,"#ffffff9c",2);
 c.restore();
}
function drawFrog(c,dt){
 const bg=c.createLinearGradient(0,0,800,900);bg.addColorStop(0,"#b8f58b");bg.addColorStop(.5,"#72e0a0");bg.addColorStop(1,"#37c8b4");rect(c,0,0,800,900,bg,0);
 // Four clear road lanes with shoulders, lane markings and grass verges
 for(let y=100;y<=700;y+=200){
  rect(c,0,y-7,800,114,"#319c69",0);
  rect(c,0,y,800,100,"#465365",0);
  rect(c,0,y+3,800,5,"#f7d879",0);rect(c,0,y+92,800,5,"#f7d879",0);
  for(let x=18;x<800;x+=112)rect(c,x,y+47,58,6,"#ffffffb8",3);
 }
 // Small flowers and bushes on safe banks
 c.font="24px sans-serif";for(let x=35;x<800;x+=150){c.fillText("🌼",x,91);c.fillText("🌿",x+55,891)}
 for(const e of game.entities){
  e.x+=e.speed*dt*.018;if(e.x<-2)e.x=10;if(e.x>10)e.x=-2;
  drawTrafficCar(c,e);
 }
 c.font="65px sans-serif";c.fillText("🏡",340,92);c.fillText("🐸",game.player.x*80+8,game.player.y*100+68);
 if(game.player.y===0){completeLevel("Лягушка добралась домой!");return}
 if(game.entities.some(e=>Math.abs(e.y-game.player.y)<.35&&game.player.x>=e.x-.2&&game.player.x<=e.x+e.w-.3)){loseLife();game.player={x:4,y:9}}
}
function drawSnake(c,dt){
 const cell=50,cols=16,rows=18;
 const fieldPalettes=[
  ["#f8ffb7","#caffb4","#83ead1"],
  ["#c9f1ff","#a8d8ff","#8ca9f5"],
  ["#ffe0ef","#ffc1d8","#f49ac2"],
  ["#fff0b3","#ffd18a","#ffab82"],
  ["#e5d5ff","#c8b8ff","#a99aef"],
  ["#c9fff0","#91eadb","#65c9c9"],
  ["#fff4c2","#e8f49b","#a9df87"],
  ["#d8eaff","#b9d4ff","#a9b4f5"],
  ["#ffd9c7","#ffbca8","#f58fa2"],
  ["#d5fff8","#a7f0e7","#75d5d0"]
 ];
 const palette=fieldPalettes[(game.level-1)%fieldPalettes.length];
 const bg=c.createLinearGradient(0,0,800,900);bg.addColorStop(0,palette[0]);bg.addColorStop(.48,palette[1]);bg.addColorStop(1,palette[2]);c.fillStyle=bg;c.fillRect(0,0,800,900);
 // Soft checkerboard makes every movement cell easy to read
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  if((x+y)%2===0){c.fillStyle="#ffffff2b";c.fillRect(x*cell,y*cell,cell,cell)}
 }
 // Rounded garden border
 c.strokeStyle="#ffffffd9";c.lineWidth=9;c.strokeRect(5,5,790,890);
 // Fruits: regular +1, golden +5, rainbow +10
 const fx=game.food.x*cell+25,fy=game.food.y*cell+25,bonus=game.food.value||1;
 c.save();c.shadowColor=bonus===10?"#9d48ff88":bonus===5?"#ffb52e88":"#d93d4b55";c.shadowBlur=bonus>1?18:10;
 const fruitColor=bonus===10?"#a45cff":bonus===5?"#ffad32":"#ff536c";
 c.fillStyle=fruitColor;c.beginPath();c.arc(fx,fy+3,16,0,Math.PI*2);c.fill();
 c.fillStyle=bonus===10?"#ffe66d":"#42b86b";c.beginPath();c.ellipse(fx+8,fy-15,9,5,-.55,0,Math.PI*2);c.fill();
 c.strokeStyle="#80533b";c.lineWidth=3;c.beginPath();c.moveTo(fx,fy-12);c.lineTo(fx+2,fy-19);c.stroke();
 c.fillStyle="#ffffffa8";c.beginPath();c.arc(fx-6,fy-3,4,0,Math.PI*2);c.fill();c.restore();
 if(bonus>1){c.save();c.font="bold 19px sans-serif";c.textAlign="center";c.lineWidth=4;c.strokeStyle="#ffffff";c.strokeText("+"+bonus,fx,fy-25);c.fillStyle=bonus===10?"#7c36c9":"#bd6a00";c.fillText("+"+bonus,fx,fy-25);c.restore()}
 // Wait for the first tap or swipe before the snake starts moving
 if(game.started)game.moveClock=(game.moveClock||0)+dt;
 if(game.started&&game.moveClock>=Math.max(4.5,10.5-game.level*.2)){
  game.moveClock=0;
  game.snake.unshift({...game.snake[0]});const h=game.snake[0];
  if(game.player.dir==="left")h.x--;if(game.player.dir==="right")h.x++;if(game.player.dir==="up")h.y--;if(game.player.dir==="down")h.y++;
  // The field wraps around: leaving one edge brings the snake back on the opposite edge.
  h.x=(h.x+cols)%cols;h.y=(h.y+rows)%rows;
  if(game.snake.slice(1).some(s=>s.x===h.x&&s.y===h.y)){
   game.snake=[{x:7,y:7},{x:6,y:7},{x:5,y:7}];game.player.dir="right";game.moveClock=0;loseLife();return;
  }
  if(h.x===game.food.x&&h.y===game.food.y){game.score+=game.food.value||1;placeFood()}else game.snake.pop();
 }
 // Draw tail first so the head sits cleanly on top
 game.snake.slice().reverse().forEach((s,ri)=>{
  const i=game.snake.length-1-ri,x=s.x*cell+4,y=s.y*cell+4,size=42;
  const grad=c.createLinearGradient(x,y,x+size,y+size);grad.addColorStop(0,i===0?"#36c96c":"#7de36d");grad.addColorStop(1,i===0?"#119b58":"#38b978");
  c.save();c.shadowColor="#237c4b35";c.shadowBlur=5;c.shadowOffsetY=3;
  rect(c,x,y,size,size,grad, i===0?15:13);c.restore();
  if(i>0){c.fillStyle="#ffffff55";c.beginPath();c.arc(x+12,y+10,4,0,Math.PI*2);c.fill()}
 });
 // Directional eyes and a tiny smile on the head
 const head=game.snake[0],hx=head.x*cell+25,hy=head.y*cell+25,dir=game.player.dir;
 let eyes;
 if(dir==="right")eyes=[[hx+8,hy-8],[hx+8,hy+8]];
 else if(dir==="left")eyes=[[hx-8,hy-8],[hx-8,hy+8]];
 else if(dir==="up")eyes=[[hx-8,hy-8],[hx+8,hy-8]];
 else eyes=[[hx-8,hy+8],[hx+8,hy+8]];
 eyes.forEach(([x,y])=>{c.fillStyle="#fff";c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();c.fillStyle="#174d38";c.beginPath();c.arc(x+(dir==="left"?-1:dir==="right"?1:0),y+(dir==="up"?-1:dir==="down"?1:0),2.5,0,Math.PI*2);c.fill()});
 if(!game.started){c.save();c.fillStyle="#174d38cc";c.font="bold 38px sans-serif";c.textAlign="center";c.fillText("Коснись экрана, чтобы начать",400,470);c.font="25px sans-serif";c.fillText("Проведи пальцем в нужную сторону",400,515);c.restore()}
 if(game.score>=(game.level*10+10))completeLevel("Змейка выросла! Уровень пройден.");
}
function drawBreakout(c,dt){
 const bg=c.createLinearGradient(0,0,800,900);bg.addColorStop(0,"#ffc4e1");bg.addColorStop(.5,"#c8b8ff");bg.addColorStop(1,"#9be8ff");c.fillStyle=bg;c.fillRect(0,0,800,900);
 game.bricks.forEach((b,i)=>{if(b.alive)rect(c,b.x*100,b.y*75,88,58,["#ff8b9e","#ffcb65","#70c8ef","#9c8be9"][i%4],12)});
 const p=game.paddle*100;rect(c,p,820,150,24,"#5944a2",12);
 const b=game.ball;b.x+=b.dx*dt*.55;b.y+=b.dy*dt*.55;if(b.x<.1||b.x>7.8)b.dx*=-1;if(b.y<.1)b.dy=Math.abs(b.dy);
 if(b.y>7.9&&b.x*100>p-20&&b.x*100<p+170)b.dy=-Math.abs(b.dy);
 if(b.y>9){game.lives--;b.x=4;b.y=7;b.dy=-.13;if(game.lives<=0)loseLife(true)}
 const hit=game.bricks.find(x=>x.alive&&b.x>x.x-.08&&b.x<x.x+.98&&b.y>x.y-.08&&b.y<x.y+.8);
 if(hit){hit.alive=false;b.dy*=-1;game.score+=5}
 rect(c,b.x*100,b.y*100,24,24,"#ff6c65",12);
 if(game.bricks.every(x=>!x.alive))completeLevel("Все кирпичики разбиты!");
}
function drawSpace(c,dt){
 const bg=c.createLinearGradient(0,0,800,900);bg.addColorStop(0,"#100b45");bg.addColorStop(.5,"#292078");bg.addColorStop(1,"#075b9c");c.fillStyle=bg;c.fillRect(0,0,800,900);
 for(let i=0;i<58;i++){const x=(i*137)%790+5,y=(i*193+game.tick*(1+i%3)*.35)%880+8;c.fillStyle=i%4===0?"#ffe99a":"#ffffffbb";c.beginPath();c.arc(x,y,i%5===0?3:1.8,0,Math.PI*2);c.fill()}
 // Every wave contains exactly ten regular enemy ships.
 if(!game.boss&&!game.bossSpawned){
  if(game.spawnedInWave<10){
   game.spawn-=dt;
   if(game.spawn<=0){game.entities.push({x:Math.random()*650+75,y:72,speed:.48+game.level*.012,hp:1,phase:Math.random()*Math.PI*2,kind:Math.floor(Math.random()*3)});game.spawnedInWave++;game.spawn=Math.max(35,54-game.level*.45)}
  }else if(game.entities.length===0){
   if(game.stagePause<=0){game.stagePause=65;const h=$q("#arcade-hint");if(h)h.textContent="Волна "+game.wave+" пройдена! Приготовься к следующей."}
   else {game.stagePause-=dt;if(game.stagePause<=0){
    if(game.wave<game.wavesTotal){game.wave++;game.spawnedInWave=0;game.spawn=0;const w=$q("#arcade-wave");if(w)w.textContent=game.wave+"/"+game.wavesTotal;const h=$q("#arcade-hint");if(h)h.textContent="Волна "+game.wave+"! Уничтожь 10 кораблей."}
    else if(game.hasBoss){game.bossSpawned=true;game.boss={x:400,y:175,hp:10,maxHp:10,phase:0,shotClock:0};const h=$q("#arcade-hint");if(h)h.textContent="БОСС! Уклоняйся и стреляй по большому кораблю!"}
    else completeLevel("Все волны отражены! Ты защитил галактику.");
   }}
  }
 }
 game.entities.forEach(e=>{
  e.y+=e.speed*dt*1.25;e.x+=Math.sin(game.tick*.025+e.phase)*.28*dt;
  const x=e.x,y=e.y,colors=["#ff668e","#ffb83f","#62e6d0"],col=colors[e.kind];
  c.save();c.translate(x,y);c.shadowColor=col;c.shadowBlur=20;c.fillStyle=col;c.beginPath();c.moveTo(-35,4);c.lineTo(-57,20);c.lineTo(-43,-7);c.lineTo(-28,-17);c.lineTo(0,-28);c.lineTo(28,-17);c.lineTo(43,-7);c.lineTo(57,20);c.lineTo(35,4);c.quadraticCurveTo(0,36,-35,4);c.fill();
  c.shadowBlur=0;c.fillStyle="#eafaff";c.beginPath();c.ellipse(0,-9,20,13,0,Math.PI,Math.PI*2);c.fill();c.fillStyle="#4d3d9e";c.beginPath();c.ellipse(0,-8,12,7,0,Math.PI,Math.PI*2);c.fill();c.fillStyle="#fff2a6";for(let k=-1;k<=1;k++){c.beginPath();c.arc(k*23,9,4,0,Math.PI*2);c.fill()}c.restore();
  if(e.y>825&&!e.passed){e.passed=true;game.lives--;if(game.lives<=0)loseLife(true)}
 });
 game.bullets=game.bullets||[];
 game.bullets.forEach(b=>{b.y-=17*dt;c.save();c.shadowColor="#7df8ff";c.shadowBlur=16;rect(c,b.x-5,b.y-20,10,34,"#9effff",5);c.restore()});
 game.bullets=game.bullets.filter(b=>b.y>0);
 game.entities=game.entities.filter(e=>{
  const hit=game.bullets.find(b=>Math.abs(b.x-e.x)<58&&Math.abs(b.y-e.y)<42);
  if(hit){game.bullets.splice(game.bullets.indexOf(hit),1);game.score+=10;game.kills++;return false}
  return e.y<940;
 });
 if(game.boss){
  const b=game.boss;b.phase+=dt*.035;b.x=400+Math.sin(b.phase)*245;
  c.save();c.translate(b.x,b.y);c.shadowColor="#ff4e9c";c.shadowBlur=42;c.fillStyle="#a63be8";c.beginPath();c.moveTo(-155,12);c.lineTo(-205,62);c.lineTo(-130,46);c.lineTo(-88,88);c.lineTo(0,68);c.lineTo(88,88);c.lineTo(130,46);c.lineTo(205,62);c.lineTo(155,12);c.quadraticCurveTo(0,-108,-155,12);c.fill();
  c.shadowBlur=0;c.fillStyle="#ff8fca";c.beginPath();c.ellipse(0,-22,78,43,0,Math.PI,Math.PI*2);c.fill();c.fillStyle="#442c91";c.beginPath();c.ellipse(0,-20,52,27,0,Math.PI,Math.PI*2);c.fill();c.fillStyle="#fff18b";for(let x=-105;x<=105;x+=70){c.beginPath();c.arc(x,38,11,0,Math.PI*2);c.fill()}c.restore();
  const hit=game.bullets.findIndex(q=>Math.abs(q.x-b.x)<170&&Math.abs(q.y-b.y)<100);
  if(hit>=0){game.bullets.splice(hit,1);b.hp--;game.score+=15}
  rect(c,190,62,420,16,"#ffffff55",8);rect(c,190,62,420*Math.max(0,b.hp/b.maxHp),16,"#ff5c9e",8);
  c.fillStyle="#fff";c.font="bold 22px sans-serif";c.textAlign="center";c.fillText("БОСС",400,48);c.textAlign="start";
  if(b.hp<=0){game.boss=null;completeLevel("Босс повержен! Галактика спасена!")}
 }
 const px=game.player.x*80+40,py=820;c.save();c.translate(px,py);c.shadowColor="#64efff";c.shadowBlur=24;
 c.fillStyle="#d8f7ff";c.beginPath();c.moveTo(0,-58);c.lineTo(34,25);c.lineTo(15,18);c.lineTo(0,30);c.lineTo(-15,18);c.lineTo(-34,25);c.closePath();c.fill();c.shadowBlur=0;
 c.fillStyle="#397be8";c.beginPath();c.moveTo(0,-43);c.lineTo(15,12);c.lineTo(0,5);c.lineTo(-15,12);c.closePath();c.fill();c.fillStyle="#8df7ff";c.beginPath();c.ellipse(0,-17,9,17,0,0,Math.PI*2);c.fill();c.fillStyle="#ffcf65";c.beginPath();c.moveTo(-12,22);c.lineTo(0,48+Math.sin(game.tick*.6)*7);c.lineTo(12,22);c.closePath();c.fill();c.fillStyle="#ff6c8b";c.beginPath();c.moveTo(-23,18);c.lineTo(-29,39);c.lineTo(-12,25);c.closePath();c.fill();c.beginPath();c.moveTo(23,18);c.lineTo(29,39);c.lineTo(12,25);c.closePath();c.fill();c.restore();
}
function drawJumper(c,dt){
 const bg=c.createLinearGradient(0,0,800,900);bg.addColorStop(0,"#a9f4ff");bg.addColorStop(.55,"#b9d9ff");bg.addColorStop(1,"#d9baff");c.fillStyle=bg;c.fillRect(0,0,800,900);
 game.platforms.forEach(p=>{p.y+=dt*(.35+l*.025);if(p.y>920){p.y=-80;p.x=Math.random()*7.1}rect(c,p.x*100,p.y,Math.max(95,p.w*100),20,"#62bd7d",12)});
 const p=game.player;p.vy+=.25*dt;p.y+=p.vy*dt;if(p.y>820){loseLife();p.y=650;p.vy=-8}
 game.platforms.forEach(pl=>{if(p.vy>0&&p.x*100+30>pl.x*100&&p.x*100<pl.x*100+pl.w*100&&p.y+65>=pl.y&&p.y+65<=pl.y+30){p.vy=-9-l*.08;game.score+=5}});
 c.font="60px sans-serif";c.fillText("🦘",p.x*100,p.y+60);
 if(game.score>=game.target*5)completeLevel("Отличный прыжок!");
}
function drawFruit(c,dt){
 const bg=c.createLinearGradient(0,0,800,900);bg.addColorStop(0,"#fff18a");bg.addColorStop(.5,"#ffc1a6");bg.addColorStop(1,"#ff9fce");c.fillStyle=bg;c.fillRect(0,0,800,900);game.spawn-=dt;if(game.spawn<=0){game.entities.push({x:Math.random()*740+20,y:-20,bomb:Math.random()<.18,speed:1.3+l*.035});game.spawn=Math.max(22,42-l*.55)}
 game.entities.forEach(e=>{e.y+=e.speed*dt*2;c.font="48px sans-serif";c.fillText(e.bomb?"💣":"🍎",e.x,e.y)});
 game.entities=game.entities.filter(e=>{if(e.y>790&&e.y<890&&Math.abs(e.x-(game.player.x*100+50))<85){if(e.bomb)game.lives--;else game.score+=10;return false}return e.y<940});
 rect(c,game.player.x*100,820,100,40,"#a76b43",18);c.font="46px sans-serif";c.fillText("🧺",game.player.x*100+20,820);
 if(game.lives<=0)loseLife(true);if(game.score>=game.target*10)completeLevel("Корзинка полна!");
}
function drawRacing(c,dt){
 const bg=c.createLinearGradient(0,0,800,900);bg.addColorStop(0,"#9df06e");bg.addColorStop(.5,"#49d69a");bg.addColorStop(1,"#22b8b5");c.fillStyle=bg;c.fillRect(0,0,800,900);rect(c,110,0,580,900,"#39445f",0);
 c.setLineDash([35,30]);c.strokeStyle="#fff";c.lineWidth=7;c.beginPath();c.moveTo(303,0);c.lineTo(303,900);c.moveTo(496,0);c.lineTo(496,900);c.stroke();c.setLineDash([]);
 game.spawn-=dt;if(game.spawn<=0){game.entities.push({lane:Math.floor(Math.random()*3),y:-100,speed:1.8+l*.045});game.spawn=Math.max(24,48-l*.7)}
 game.entities.forEach(e=>{e.y+=e.speed*dt*2;rect(c,130+e.lane*193,e.y,95,130,"#f2a04c",18);c.font="55px sans-serif";c.fillText("🚙",145+e.lane*193,e.y+85)});
 if(game.entities.some(e=>e.lane===game.player.x&&e.y>690&&e.y<890)){game.entities=game.entities.filter(e=>!(e.lane===game.player.x&&e.y>690&&e.y<890));loseLife()}
 game.entities=game.entities.filter(e=>{if(e.y>920){game.score+=5;return false}return true});
 c.font="66px sans-serif";c.fillText("🏎️",140+game.player.x*193,850);
 if(game.score>=game.target*5)completeLevel("Финиш! Ты справился с трассой!");
}
function completeLevel(msg){
 if(game.done||game.over)return;game.done=true;cancelAnimationFrame(raf);const next=Math.min(30,game.level+1);if(game.level<30)save(current,next);localStorage.setItem("mogu-arcade-best-"+current,String(Math.max(best(current),game.score)));
 const finished=game.level>=30;
 const el=$q("#arcade-message");if(el)el.innerHTML='<div class="arcade-overlay"><div class="arcade-dialog"><div class="arcade-trophy">🏆</div><h2>'+(finished?"Все 30 уровней пройдены!": "Уровень "+game.level+" пройден!")+'</h2><p>'+msg+'</p><button class="arcade-main-btn" data-arcade-next="'+(finished?"hub":next)+'">'+(finished?"К играм":"Следующий уровень →")+'</button></div></div>';
}
function loseLife(final=false){
 if(game.done||game.over)return;
 if(!final&&game.lives>1){game.lives--;const el=$q("#arcade-hint");if(el)el.textContent="Осторожно! Осталось жизней: "+game.lives;return}
 game.over=true;cancelAnimationFrame(raf);const el=$q("#arcade-message");if(el)el.innerHTML='<div class="arcade-overlay"><div class="arcade-dialog"><div class="arcade-trophy">💛</div><h2>Попробуем ещё?</h2><p>Ты набрал '+game.score+' очков. Каждая попытка помогает стать лучше!</p><button class="arcade-main-btn" data-arcade-restart>Повторить уровень</button><button class="soft-button" data-arcade-back>К играм</button></div></div>';
}
function act(dir){
 if(!game||current==="2048"||game.done||game.over)return;
 if(current==="frog"){if(dir==="left")game.player.x=Math.max(0,game.player.x-1);if(dir==="right")game.player.x=Math.min(9,game.player.x+1);if(dir==="up")game.player.y=Math.max(0,game.player.y-1);if(dir==="down")game.player.y=Math.min(9,game.player.y+1)}
 if(current==="snake"){if(["left","right","up","down"].includes(dir)){const opposite={left:"right",right:"left",up:"down",down:"up"};if(!game.started){game.started=true;game.player.dir=dir;game.moveClock=0}else if(opposite[dir]!==game.player.dir)game.player.dir=dir}}
 if(current==="breakout"){if(dir==="left")game.paddle=Math.max(0,game.paddle-.65);if(dir==="right")game.paddle=Math.min(6.5,game.paddle+.65)}
 if(current==="space"){if(dir==="left")game.player.x=Math.max(0,game.player.x-.6);if(dir==="right")game.player.x=Math.min(9,game.player.x+.6)}
 if(current==="jumper"){if(dir==="up"&&game.player.vy>0)game.player.vy=-10;if(dir==="left")game.player.x=Math.max(0,game.player.x-.35);if(dir==="right")game.player.x=Math.min(7.2,game.player.x+.35)}
 if(current==="fruit"||current==="racing"){if(dir==="left")game.player.x=Math.max(0,game.player.x-1);if(dir==="right")game.player.x=Math.min(current==="racing"?2:7,game.player.x+1)}
}
function action(a){if(!game||game.done||game.over)return;if(a==="fire"&&current==="space")game.bullets.push({x:game.player.x*80+35,y:820});if(a==="jump"&&current==="jumper"&&game.player.vy>0)game.player.vy=-10}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-arcade-start],[data-arcade-back],[data-arcade-restart],[data-arcade-next],[data-game-dir],[data-game-action],[data-2048-dir]");
 if(!b)return;
 if(b.dataset.arcadeStart){e.preventDefault();e.stopImmediatePropagation();start(b.dataset.arcadeStart);return}
 if(b.hasAttribute("data-arcade-back")){e.preventDefault();e.stopImmediatePropagation();hub();return}
 if(b.hasAttribute("data-arcade-restart")){e.preventDefault();e.stopImmediatePropagation();start(current);return}
 if(b.dataset.arcadeNext){e.preventDefault();e.stopImmediatePropagation();if(b.dataset.arcadeNext==="hub")hub();else start(current,Number(b.dataset.arcadeNext));return}
 if(b.dataset.gameDir){e.preventDefault();e.stopImmediatePropagation();act(b.dataset.gameDir);return}
 if(b.dataset.gameAction){e.preventDefault();e.stopImmediatePropagation();action(b.dataset.gameAction);return}
 if(b.dataset["2048Dir"]){e.preventDefault();e.stopImmediatePropagation();move2048(b.dataset["2048Dir"]);return}
},true);
document.addEventListener("keydown",e=>{
 const map={ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down"," ":"fire"};
 if(map[e.key]){if(current){e.preventDefault();if(current==="2048")move2048(map[e.key]);else if(map[e.key]==="fire")action("fire");else act(map[e.key])}}
});
let swipeOrigin=null;
function canvasPoint(e,canvas){const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(800,(e.clientX-r.left)/r.width*800)),y:Math.max(0,Math.min(900,(e.clientY-r.top)/r.height*900))}}
document.addEventListener("pointerdown",e=>{
 const board=e.target.closest(".board-2048"),canvas=e.target.closest("#arcade-canvas");
 if(board||canvas){swipeOrigin={x:e.clientX,y:e.clientY,target:board||canvas,point:canvas?canvasPoint(e,canvas):null};if(canvas){canvasPointerId=e.pointerId;if(canvas.setPointerCapture)try{canvas.setPointerCapture(e.pointerId)}catch(_){}}}
},{passive:true});
document.addEventListener("pointermove",e=>{
 if(!swipeOrigin||e.pointerId!==canvasPointerId||swipeOrigin.target!==$q("#arcade-canvas")||!game||game.done||game.over)return;
 const p=canvasPoint(e,swipeOrigin.target);
 if(current==="breakout")game.paddle=Math.max(0,Math.min(6.5,p.x/100-.75));
 if(current==="fruit")game.player.x=Math.max(0,Math.min(7,p.x/100-.5));
 if(current==="space")game.player.x=Math.max(0,Math.min(9,p.x/80-.5));
 if(current==="jumper")game.player.x=Math.max(0,Math.min(7.2,p.x/100-.35));
},{passive:true});
function finishPointer(e){
 if(!swipeOrigin)return;
 const origin=swipeOrigin;swipeOrigin=null;canvasPointerId=null;
 const dx=e.clientX-origin.x,dy=e.clientY-origin.y;
 if(origin.target.classList&&origin.target.classList.contains("board-2048")){
  if(Math.max(Math.abs(dx),Math.abs(dy))>=20){const dir=Math.abs(dx)>Math.abs(dy)?(dx<0?"left":"right"):(dy<0?"up":"down");move2048(dir)}
  return;
 }
 if(!game||game.done||game.over)return;
 if(Math.max(Math.abs(dx),Math.abs(dy))>=22){
  const dir=Math.abs(dx)>Math.abs(dy)?(dx<0?"left":"right"):(dy<0?"up":"down");
  if(current==="frog"||current==="snake")act(dir);
  else if(current==="jumper"&&dir==="up")action("jump");
  else if(current==="racing"){if(dir==="left"||dir==="right")act(dir)}
 }else{
  const p=origin.point;
  if(current==="space")action("fire");
  else if(current==="jumper")action("jump");
  else if(current==="frog"&&p){const px=game.player.x*80+40,py=game.player.y*100+50;const ddx=p.x-px,ddy=p.y-py;act(Math.abs(ddx)>Math.abs(ddy)?(ddx<0?"left":"right"):(ddy<0?"up":"down"))}
  else if(current==="snake"&&p){const h=game.snake[0],ddx=p.x-(h.x*50+25),ddy=p.y-(h.y*50+25);act(Math.abs(ddx)>Math.abs(ddy)?(ddx<0?"left":"right"):(ddy<0?"up":"down"))}
  else if(current==="racing"&&p)game.player.x=Math.max(0,Math.min(2,Math.floor(p.x/800*3)));
 }
}
document.addEventListener("pointerup",finishPointer,{passive:true});
document.addEventListener("pointercancel",e=>{if(e.pointerId===firePointerId){firePointerId=null;if(fireHoldTimer){clearInterval(fireHoldTimer);fireHoldTimer=null}}if(e.pointerId===canvasPointerId){swipeOrigin=null;canvasPointerId=null}},{passive:true});
window.addEventListener("resize",()=>{});
window.renderGames=hub;
})();
