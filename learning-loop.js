/* 自我学习前台小模块：只记日志 + 读已审核的学习结果。没有任何界面。
   迁移未上线时 RPC 不存在 → 全部静默失败，不影响原有搜索和客服。 */
(()=>{'use strict';if(window.GYXLearn)return;
const N=s=>String(s||'').toLowerCase().replace(/[\s，。！？、；：,.!?;:()（）【】\[\]"'“”‘’_\-\/\\]+/g,'');
const db=()=>window.gyxSupabase||null,loc=()=>String(window.GYXI18N?.locale||document.documentElement.lang||'zh').toLowerCase().slice(0,10);
const SYN_KEY='gyx_learn_syn_v1',SYN_TTL=6*3600*1000;
let syn=[],synAt=0,loading=null,disabled=false;
function sid(){try{let v=sessionStorage.getItem('gyx_learn_sid');if(!v){v='lrn-'+(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));sessionStorage.setItem('gyx_learn_sid',v)}return v}catch{return'lrn-'+Date.now().toString(36)}}
function readCache(){try{const c=JSON.parse(localStorage.getItem(SYN_KEY)||'null');if(c&&Array.isArray(c.rows)){syn=c.rows;synAt=+c.at||0}}catch{}}
function prep(rows){return(rows||[]).map(r=>({n:N(r.term_norm),e:(Array.isArray(r.expansions)?r.expansions:[]).map(x=>String(x||'').trim()).filter(x=>x.length>=2).slice(0,12),core:r.role==='core'})).filter(r=>r.n.length>=2&&r.e.length)}
function timeout(p,ms){return Promise.race([p,new Promise(r=>setTimeout(()=>r({data:null,error:{message:'TIMEOUT'}}),ms))])}
function missing(err){return /could not find|does not exist|PGRST202|404/i.test(String(err?.message||err?.code||''))}
async function loadSynonyms(force=false){if(disabled)return syn;if(!force&&synAt&&Date.now()-synAt<SYN_TTL)return syn;if(loading)return loading;const c=db();if(!c)return syn;
 loading=(async()=>{try{const{data,error}=await timeout(c.rpc('learn_get_synonyms'),4000);if(error){if(missing(error))disabled=true;return syn}syn=prep(data);synAt=Date.now();try{localStorage.setItem(SYN_KEY,JSON.stringify({at:synAt,rows:syn}))}catch{}}catch{}finally{loading=null}return syn})();return loading}
/* 给五轮搜索用：问题里命中已学会的词 → 追加核心词/扩展词 */
function expand(q){const x=N(q),core=[],exp=[];if(!x)return{core,exp};for(const r of syn){if(x.includes(r.n)){(r.core?core:exp).push(...r.e)}}return{core:[...new Set(core)].slice(0,12),exp:[...new Set(exp)].slice(0,16)}}
function fire(name,args){if(disabled)return Promise.resolve(null);const c=db();if(!c)return Promise.resolve(null);try{return timeout(c.rpc(name,args),5000).then(r=>{if(r?.error&&missing(r.error))disabled=true;return r?.error?null:r?.data??null},()=>null)}catch{return Promise.resolve(null)}}
function logSearch(e){e=e||{};return fire('learn_log_search',{p_session:sid(),p_query:String(e.query||'').slice(0,200),p_category:e.category||null,p_mode:e.mode==='auto'?'auto':'manual',p_round:+e.round||1,p_result_count:+e.resultCount||0,p_strict_count:+e.strictCount||0,p_fill_count:+e.fillCount||0,p_picked_ids:(e.pickedIds||[]).map(Number).filter(Number.isSafeInteger).slice(0,12),p_picked_texts:(e.pickedTexts||[]).map(x=>String(x||'').slice(0,120)).slice(0,12),p_completed:!!e.completed,p_locale:loc()})}
function logSupport(e){e=e||{};return fire('learn_log_support',{p_session:sid(),p_channel:e.channel==='member'?'member':'home',p_question:String(e.question||'').slice(0,500),p_topic:e.topic||null,p_source:['rule','kb'].includes(e.source)?e.source:'none',p_kb_id:e.kbId||null,p_answered:!!e.answered,p_locale:loc()})}
function markUnhelpful(eventId){if(!eventId)return Promise.resolve(null);return fire('learn_mark_support_unhelpful',{p_session:sid(),p_event_id:eventId})}
/* 给客服用：查已审核的问答，2.5 秒内没结果就当没有 */
async function supportLookup(q,channel){if(disabled)return null;const c=db();if(!c||String(q||'').trim().length<2)return null;try{const{data,error}=await timeout(c.rpc('learn_support_lookup',{p_question:String(q).slice(0,500),p_locale:loc(),p_channel:channel==='member'?'member':'home'}),2500);if(error){if(missing(error))disabled=true;return null}const row=Array.isArray(data)?data[0]:null;return row?.answer?{kbId:row.kb_id,answer:String(row.answer),score:+row.score||0}:null}catch{return null}}
readCache();
window.GYXLearn={normalize:N,sessionId:sid,loadSynonyms,expand,logSearch,logSupport,markUnhelpful,supportLookup};
const boot=()=>setTimeout(()=>loadSynonyms().catch(()=>{}),300);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
