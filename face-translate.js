(()=>{
'use strict';
const I=window.GYXI18N;
const AI_ENDPOINT='https://globalyouxuan-ai.slq520168.workers.dev/api/chat';
const LANGS={
  zh:{name:()=>I.t('languageName.zh'),speech:['zh-CN','zh_CN'],label:'zh'},
  en:{name:()=>I.t('languageName.en'),speech:['en-US','en_US'],label:'en'},
  km:{name:()=>I.t('languageName.km'),speech:['km-KH','km_KH'],label:'km'}
};
let sideA='zh',sideB='km',busy=false,recognition=null,recSide=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const srSupported=()=>!!(window.SpeechRecognition||window.webkitSpeechRecognition);
const ttsSupported=()=>'speechSynthesis' in window;

function toast(msg){const t=$('ftToast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2600)}

function fillLangSelects(){
  for(const el of [$('langA'),$('langB')]){
    el.innerHTML='';
    for(const code of Object.keys(LANGS)){
      const o=document.createElement('option');o.value=code;o.textContent=LANGS[code].name();el.appendChild(o);
    }
  }
  $('langA').value=sideA;$('langB').value=sideB;
}

function refreshHeadings(){
  $('titleA').textContent=LANGS[sideA].name();
  $('titleB').textContent=LANGS[sideB].name();
  const hintRec=srSupported()?I.t('ftHintVoice'):I.t('ftHintType');
  $('hintA').textContent=hintRec;$('hintB').textContent=hintRec;
  document.title=I.t('ftTitle')+' · GlobalYouXuan';
  document.documentElement.lang=I.locale==='zh'?'zh-CN':I.locale==='km'?'km':'en';
}

async function translate(text,from,to){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),25000);
  const system=`You are a live face-to-face interpreter. Translate the user message from ${LANGS[from].name()} into ${LANGS[to].name()} for spoken delivery. Output ONLY the translation as one natural, conversational sentence or short paragraph. Keep numbers, prices and names. No explanations, no quotes, no transliteration of the original.`;
  try{
    const res=await fetch(AI_ENDPOINT,{
      method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,
      body:JSON.stringify({messages:[{role:'system',content:system},{role:'user',content:text}]})
    });
    const raw=await res.text();
    if(!res.ok)throw new Error('AI_'+res.status);
    let out='';
    try{
      const p=JSON.parse(raw);
      for(const k of ['response','reply','text','content','message','output','answer']){if(typeof p?.[k]==='string'&&p[k].trim()){out=p[k].trim();break}}
      if(!out&&typeof p?.choices?.[0]?.message?.content==='string')out=p.choices[0].message.content.trim();
    }catch{out=raw.trim()}
    if(!out)throw new Error('EMPTY');
    return out;
  }finally{clearTimeout(timer)}
}

function addBubble(side,src,dst,autoTTS){
  const log=$(side==='a'?'logA':'logB');
  const node=document.createElement('div');node.className='ft-msg';
  node.innerHTML=`<div class="ft-msg-src">${esc(src)}</div><div class="ft-msg-dst">${esc(dst)}</div><div class="ft-msg-meta"><button type="button" class="ft-speak" data-voice="${esc(dst)}" data-lang="${side==='a'?sideA:sideB}">${ttsSupported()?esc(I.t('ftPlayAgain')):''}</button><span>${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>`;
  node.querySelector('.ft-speak').addEventListener('click',e=>speak(e.currentTarget.dataset.voice,e.currentTarget.dataset.lang));
  log.appendChild(node);log.scrollTop=log.scrollHeight;
  if(autoTTS)speak(dst,side==='a'?sideA:sideB);
}

function speak(text,lang){
  if(!ttsSupported()||!text)return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(String(text).slice(0,600));
    const codes=LANGS[lang]?.speech||[lang];
    const voices=speechSynthesis.getVoices();
    let v=voices.find(v=>codes.includes(v.lang))||voices.find(v=>v.lang.replace('_','-').startsWith(codes[0].split('-')[0]));
    if(v)u.voice=v;
    u.lang=codes[0];u.rate=1;u.pitch=1;
    speechSynthesis.speak(u);
  }catch(e){console.warn('TTS failed',e)}
}

function stopRec(){
  if(recognition){try{recognition.stop()}catch{}recognition=null}
  recSide=null;
  for(const s of ['micA','micB'])$(s).classList.remove('rec');
  for(const s of ['stateA','stateB'])$(s).textContent='';
}

function startRec(side){
  if(recSide===side){stopRec();return}
  stopRec();
  if(!srSupported()){toast(I.t('ftNoSpeech'));return}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new SR();
  rec.lang=LANGS[side==='a'?sideA:sideB].speech[0];
  rec.interimResults=false;rec.maxAlternatives=1;rec.continuous=false;
  recognition=rec;recSide=side;
  const mic=$(side==='a'?'micA':'micB'),state=$(side==='a'?'stateA':'stateB');
  mic.classList.add('rec');state.textContent=I.t('ftListening');state.classList.add('rec');
  rec.onresult=e=>{
    const text=e.results?.[0]?.[0]?.transcript?.trim();
    if(text)submit(side,text);
  };
  rec.onerror=e=>{
    stopRec();
    if(e.error==='not-allowed'||e.error==='service-not-allowed')toast(I.t('ftMicDenied'));
    else if(e.error==='no-speech')toast(I.t('ftNoSpeechHeard'));
    else toast(I.t('ftSpeechError'));
  };
  rec.onend=()=>{if(recSide===side)stopRec()};
  try{rec.start()}catch(e){stopRec();toast(I.t('ftSpeechError'))}
}

async function submit(side,text){
  if(busy){toast(I.t('ftBusy'));return}
  text=String(text||'').trim().slice(0,500);
  if(!text)return;
  busy=true;stopRec();
  const from=side==='a'?sideA:sideB,to=side==='a'?sideB:sideA;
  const state=$(side==='a'?'stateA':'stateB');
  state.textContent=I.t('ftTranslating');state.classList.add('rec');
  try{
    const dst=await translate(text,from,to);
    addBubble(side,text,dst,true);
  }catch(e){
    console.warn('translate failed',e);
    toast(e.name==='AbortError'?I.t('ftTimeout'):I.t('ftFailed'));
  }finally{
    busy=false;state.textContent='';state.classList.remove('rec');
  }
}

function swap(){
  if(busy)return;
  [sideA,sideB]=[sideB,sideA];
  $('langA').value=sideA;$('langB').value=sideB;
  refreshHeadings();
  const la=$('logA').innerHTML;$('logA').innerHTML=$('logB').innerHTML;$('logB').innerHTML=la;
}

function bind(){
  $('swapBtn').addEventListener('click',swap);
  $('langA').addEventListener('change',e=>{if(e.target.value===sideB){sideB=sideA}sideA=e.target.value;$('langB').value=sideB;refreshHeadings()});
  $('langB').addEventListener('change',e=>{if(e.target.value===sideA){sideA=sideB}sideB=e.target.value;$('langA').value=sideA;refreshHeadings()});
  $('micA').addEventListener('click',()=>startRec('a'));
  $('micB').addEventListener('click',()=>startRec('b'));
  for(const [form,side,input] of [['formA','a','inputA'],['formB','b','inputB']]){
    $(form).addEventListener('submit',e=>{e.preventDefault();const v=$(input).value;$(input).value='';submit(side,v)});
  }
  if(ttsSupported()){try{speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices()}catch{}}
  window.addEventListener('gyx:languagechange',()=>{fillLangSelects();refreshHeadings()});
}

function init(){
  if(!I)return setTimeout(init,120);
  fillLangSelects();refreshHeadings();bind();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
