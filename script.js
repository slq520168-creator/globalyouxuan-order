const canvas=document.getElementById('stars');
const ctx=canvas.getContext('2d');
let stars=[];
function resize(){
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=innerWidth*dpr; canvas.height=innerHeight*dpr;
  canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  stars=Array.from({length:Math.floor(innerWidth*innerHeight/8500)},()=>({
    x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.5+.25,
    a:Math.random()*.8+.2,s:Math.random()*.015+.003
  }));
}
function draw(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for(const p of stars){
    p.a+=p.s;if(p.a>1||p.a<.15)p.s*=-1;
    ctx.beginPath();ctx.fillStyle=`rgba(78,147,255,${p.a})`;
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
  }
  requestAnimationFrame(draw);
}
addEventListener('resize',resize);resize();draw();

const toast=document.getElementById('toast');
function notify(text){toast.textContent=text;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}
document.getElementById('aiSearch').addEventListener('submit',e=>{
  e.preventDefault();
  const q=document.getElementById('query').value.trim();
  notify(q?`正在搜索：${q}`:'请输入搜索内容');
});
document.querySelector('.language').addEventListener('click',()=>notify('当前语言：中文'));
document.querySelector('.menu').addEventListener('click',()=>notify('功能菜单正在接入'));
document.querySelectorAll('.card').forEach(card=>card.addEventListener('click',e=>{
  e.preventDefault();notify(`${card.querySelector('h2').textContent} 功能正在接入`);
}));
