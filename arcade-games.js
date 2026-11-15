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
 cancelAnimationFrame(raf);current=null;
 const p=progress();
 document.getElementById("app-main").innerHTML='<section class="arcade-hub"><div class="arcade-welcome"><div class="arcade-mascot">🎮</div><div><h2>Большая игровая площадка!</h2><p>Выбирай аркаду, набирай очки и открывай новые уровни. Играй в своём темпе!</p></div></div><div class="arcade-grid">'+G.map(g=>'<button class="arcade-card arcade-'+g.tone+'" data-arcade-start="'+g.id+'"><span class="arcade-icon">'+g.icon+'</span><strong>'+g.title+'</strong><small>'+g.desc+'</small><span class="arcade-progress">'+(g.id==="2048"?"♾️ Без уровней":"⭐ Открыт уровень "+(p[g.id]||1)+" из 30")+'</span><span class="arcade-play">Играть →</span></button>').join("")+'</div></section>';
 if(typeof nav==="function")nav("home");
}
function shell(g,inner){
 document.getElementById("app-main").innerHTML='<section class="arcade-shell"><div class="arcade-top"><button class="soft-button" data-arcade-back>← Все игры</button><strong>'+g.icon+' '+g.title+'</strong><button class="arcade-restart" data-arcade-restart aria-label="Заново">↻</button></div>'+inner+'</section>';
 if(typeof nav==="function")nav("home");
}
function start(id){
 const g=G.find(x=>x.id===id);if(!g)return;
 current=id;
 if(id==="2048"){init2048();return}
 const p=progress(),level=Math.min(30,p[id]||1);
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
 if(id==="snake"){game.player={x:7,y:7,dir:"right"};game.snake=[{x:7,y:7},{x:6,y:7},{x:5,y:7}];placeFood()}
 if(id==="breakout"){game.paddle=4;game.ball={x:4.5,y:7,dx:.08+l*.003,dy:-.12-l*.004};game.bricks=[];for(let y=0;y<Math.min(3+Math.ceil(l/5),6);y++)for(let x=0;x<8;x++)game.bricks.push({x:x+.08,y:y+.5,alive:true})}
 if(id==="space"){game.player={x:4,y:8};game.entities=[];game.bullets=[];game.spawn=0}
 if(id==="jumper"){game.player={x:4,y:650,vy:-8};game.platforms=[];for(let i=0;i<9;i++)game.platforms.push({x:Math.random()*7.2,y:720-i*100,w:1.2+Math.random()*.6});game.stars=0}
 if(id==="fruit"){game.player={x:4,y:8};game.entities=[];game.spawn=0}
 if(id==="racing"){game.player={x:1,y:8};game.entities=[];game.spawn=0}
 const canvas='<div class="arcade-stats"><span>Уровень: <b id="arcade-level">'+l+'/30</b></span><span>Очки: <b id="arcade-score">0</b></span><span>❤️ <b id="arcade-lives">3</b></span></div><canvas id="arcade-canvas" width="800" height="900" aria-label="Игровое поле"></canvas><p class="arcade-hint" id="arcade-hint">'+hint(id)+'</p><div id="arcade-message"></div>';
 shell(G.find(x=>x.id===id),canvas);
}
function hint(id){return ({frog:"Проведи лягушку через дорогу к домику. Касайся поля или проводи пальцем в нужную сторону.",snake:"Собирай фрукты. Не касайся стен и собственного хвоста.",breakout:"Веди пальцем по полю — платформа будет двигаться за ним.",space:"Веди пальцем, чтобы управлять кораблём, и касайся поля, чтобы стрелять.",jumper:"Касайся поля для прыжка и веди пальцем, чтобы двигаться.",fruit:"Перемещай корзинку пальцем по полю.",racing:"Свайпай влево и вправо, чтобы менять полосу."})[id]}
function placeFood(){let p;do{p={x:Math.floor(Math.random()*14)+1,y:Math.floor(Math.random()*12)+1}}while(game.snake&&game.snake.some(s=>s.x===p.x&&s.y===p.y));game.food=p}
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
 const sc=$q("#arcade-score"),lv=$q("#arcade-lives");if(sc)sc.textContent=game.score;if(lv)lv.textContent=game.lives;
 if(!game.done&&!game.over)raf=requestAnimationFrame(drawFrame);
}
function drawFrog(c,dt){
 rect(c,0,0,800,900,"#bde8bd",0);for(let y=100;y<800;y+=200)rect(c,0,y,800,100,"#59636c",0);
 for(const e of game.entities){e.x+=e.speed*dt*.018;if(e.x<-2)e.x=10;if(e.x>10)e.x=-2;rect(c,e.x*80,e.y*100,Math.max(75,e.w*80),62,["#ff806d","#ffc34f","#7b83ec"][Math.floor(e.y)%3],16);c.font="44px sans-serif";c.fillText("🚗",e.x*80+12,e.y*100+49)}
 c.font="65px sans-serif";c.fillText("🏡",340,92);c.fillText("🐸",game.player.x*80+8,game.player.y*100+68);
 if(game.player.y===0){completeLevel("Лягушка добралась домой!");return}
 if(game.entities.some(e=>Math.abs(e.y-game.player.y)<.35&&game.player.x>=e.x-.2&&game.player.x<=e.x+e.w-.3)){loseLife();game.player={x:4,y:9}}
}
function drawSnake(c,dt){
 c.fillStyle="#f5f9dc";c.fillRect(0,0,800,900);const cell=50;
 c.font="44px sans-serif";c.fillText("🍎",game.food.x*cell,game.food.y*cell+40);
 game.moveClock=(game.moveClock||0)+dt;
 if(game.moveClock>=Math.max(4,11-game.level*.22)){game.moveClock=0;game.snake.unshift({...game.snake[0]});const h=game.snake[0];if(game.player.dir==="left")h.x--;if(game.player.dir==="right")h.x++;if(game.player.dir==="up")h.y--;if(game.player.dir==="down")h.y++;
 if(h.x<0||h.x>=16||h.y<0||h.y>=18||game.snake.slice(1).some(s=>s.x===h.x&&s.y===h.y)){game.snake=[{x:7,y:7},{x:6,y:7},{x:5,y:7}];game.player.dir="right";loseLife();return}
 if(h.x===game.food.x&&h.y===game.food.y){game.score+=10;placeFood()}else game.snake.pop();}
 game.snake.forEach((s,i)=>rect(c,s.x*cell+3,s.y*cell+3,44,44,i?"#62b96e":"#25894a",12));
 if(game.score>=(game.level*30+30))completeLevel("Змейка выросла! Уровень пройден.");
}
function drawBreakout(c,dt){
 c.fillStyle="#e8e6ff";c.fillRect(0,0,800,900);
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
 c.fillStyle="#101b49";c.fillRect(0,0,800,900);c.font="30px sans-serif";for(let i=0;i<30;i++)c.fillText("✦",(i*137)%790,(i*193+game.tick*2)%880);
 game.spawn-=dt;if(game.spawn<=0){game.entities.push({x:Math.random()*740+20,y:50,speed:.8+l*.025});game.spawn=Math.max(24,72-l*1.2)}
 game.entities.forEach(e=>{e.y+=e.speed*dt*2;c.font="48px sans-serif";if(e.y<=800)c.fillText("👾",e.x,e.y);if(e.y>800&&!e.passed){e.passed=true;game.lives--;if(game.lives<=0)loseLife(true)}});
 game.bullets=game.bullets||[];game.bullets.forEach(b=>b.y-=14*dt);game.bullets=game.bullets.filter(b=>b.y>0);
 game.entities=game.entities.filter(e=>{const hit=game.bullets.find(b=>Math.abs(b.x-e.x)<48&&Math.abs(b.y-e.y)<48);if(hit){game.score+=10;game.bullets.splice(game.bullets.indexOf(hit),1);return false}return e.y<950});
 game.bullets.forEach(b=>{c.font="32px sans-serif";c.fillText("✨",b.x,b.y)});
 c.font="62px sans-serif";c.fillText("🚀",game.player.x*80+8,850);
 if(game.score>=game.target*10)completeLevel("Волна пришельцев побеждена!");
}
function drawJumper(c,dt){
 c.fillStyle="#e8f8ff";c.fillRect(0,0,800,900);
 game.platforms.forEach(p=>{p.y+=dt*(.35+l*.025);if(p.y>920){p.y=-80;p.x=Math.random()*7.1}rect(c,p.x*100,p.y,Math.max(95,p.w*100),20,"#62bd7d",12)});
 const p=game.player;p.vy+=.25*dt;p.y+=p.vy*dt;if(p.y>820){loseLife();p.y=650;p.vy=-8}
 game.platforms.forEach(pl=>{if(p.vy>0&&p.x*100+30>pl.x*100&&p.x*100<pl.x*100+pl.w*100&&p.y+65>=pl.y&&p.y+65<=pl.y+30){p.vy=-9-l*.08;game.score+=5}});
 c.font="60px sans-serif";c.fillText("🦘",p.x*100,p.y+60);
 if(game.score>=game.target*5)completeLevel("Отличный прыжок!");
}
function drawFruit(c,dt){
 c.fillStyle="#fff1d6";c.fillRect(0,0,800,900);game.spawn-=dt;if(game.spawn<=0){game.entities.push({x:Math.random()*740+20,y:-20,bomb:Math.random()<.18,speed:1.3+l*.035});game.spawn=Math.max(22,42-l*.55)}
 game.entities.forEach(e=>{e.y+=e.speed*dt*2;c.font="48px sans-serif";c.fillText(e.bomb?"💣":"🍎",e.x,e.y)});
 game.entities=game.entities.filter(e=>{if(e.y>790&&e.y<890&&Math.abs(e.x-(game.player.x*100+50))<85){if(e.bomb)game.lives--;else game.score+=10;return false}return e.y<940});
 rect(c,game.player.x*100,820,100,40,"#a76b43",18);c.font="46px sans-serif";c.fillText("🧺",game.player.x*100+20,820);
 if(game.lives<=0)loseLife(true);if(game.score>=game.target*10)completeLevel("Корзинка полна!");
}
function drawRacing(c,dt){
 c.fillStyle="#85c98a";c.fillRect(0,0,800,900);rect(c,110,0,580,900,"#555b65",0);
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
 if(current==="snake"){if(["left","right","up","down"].includes(dir)){const opposite={left:"right",right:"left",up:"down",down:"up"};if(opposite[dir]!==game.player.dir)game.player.dir=dir}}
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
 if(b.dataset.arcadeNext){e.preventDefault();e.stopImmediatePropagation();if(b.dataset.arcadeNext==="hub")hub();else start(current);return}
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
 if(board||canvas){swipeOrigin={x:e.clientX,y:e.clientY,target:board||canvas,point:canvas?canvasPoint(e,canvas):null};if(canvas&&canvas.setPointerCapture)try{canvas.setPointerCapture(e.pointerId)}catch(_){}}
},{passive:true});
document.addEventListener("pointermove",e=>{
 if(!swipeOrigin||swipeOrigin.target!==$q("#arcade-canvas")||!game||game.done||game.over)return;
 const p=canvasPoint(e,swipeOrigin.target);
 if(current==="breakout")game.paddle=Math.max(0,Math.min(6.5,p.x/100-.75));
 if(current==="fruit")game.player.x=Math.max(0,Math.min(7,p.x/100-.5));
 if(current==="space")game.player.x=Math.max(0,Math.min(9,p.x/80-.5));
 if(current==="jumper")game.player.x=Math.max(0,Math.min(7.2,p.x/100-.35));
},{passive:true});
function finishPointer(e){
 if(!swipeOrigin)return;
 const origin=swipeOrigin;swipeOrigin=null;
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
document.addEventListener("pointercancel",()=>{swipeOrigin=null},{passive:true});
window.addEventListener("resize",()=>{});
window.renderGames=hub;
})();
