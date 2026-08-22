import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.0';

const ua='GlobalYouXuan-OpportunityBot/10.0';
const clean=(s='')=>String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();
const abs=(href:string,base:string)=>{try{return new URL(href,base).toString()}catch{return''}};
const risk=/(保证金|押金|会员费|培训费|入驻费|认证费|资料费|解锁费|充值|垫资|刷单|先付款|先付费|购买套餐|security deposit|deposit required|membership fee|training fee|registration fee|pay to apply|pay upfront|upfront fee|recharge|prepay)/i;
const core=/(\bai\b|artificial intelligence|prompt|content|writer|writing|copywriter|design|designer|video|editor|translation|translator|marketing|seo|social media|customer support|support specialist|virtual assistant|data labeling|data entry|website|web developer|wordpress|automation|research|freelance|contract|项目|任务|设计|文案|翻译|剪辑|视频|网站|运营|客服|数据标注|数据录入|人工智能|远程|兼职|外包)/i;
const easy=/(data labeling|data entry|content reviewer|content writer|copywriter|writer|translation|translator|video editor|graphic designer|social media|customer support|virtual assistant|research assistant|sales development|inside sales|wordpress|web content|seo|marketing assistant|prompt|ai video|ai content|兼职|外包|文案|翻译|剪辑|设计|客服|数据标注|数据录入|运营|助理|网站内容)/i;
const siteFit=/(\bai\b|prompt|content|copywriter|writer|design|video|translation|marketing|seo|social media|customer support|virtual assistant|data labeling|data entry|website|wordpress|automation|人工智能|提示词|文案|设计|视频|翻译|运营|客服|数据标注|数据录入|网站|自动化)/i;
const advanced=/(senior|staff |principal|lead |manager|director|architect|counsel|head of|chief |engineer iii|engineer iv|资深|高级工程师|负责人|经理|总监|架构师|法务)/i;
const badRole=/(maintenance technician|cabin cleaning|cleaner|housekeeper|warehouse|driver|delivery|nurse|physician|dentist|security guard|mechanic|cook|chef|restaurant|construction|plumber|electrician|painter|维修|清洁|保洁|司机|配送|护士|医生|厨师|仓库|施工|水电工|油漆工)/i;
const genericTitle=/^(hire a freelancer|find freelancers?|search freelancers?.*|freelance jobs?|remote jobs?|jobs?|云端工作\s*自由工作、远程工作|自由工作|远程工作|找人才|发布项目)$/i;
const globalish=/(worldwide|anywhere|global|remote|asia|south.?east asia|apac|international|全球|不限地区|远程|亚洲|东南亚)/i;
const titleLimited=/(united states|usa only|us only|uk only|canada only|australia only|europe only|仅限美国|美国地区|仅限英国|仅限加拿大)/i;
const closedText=/(job (?:is )?no longer available|position (?:has been )?filled|applications? (?:are|is) closed|no longer accepting applications|job (?:has )?expired|posting (?:has )?expired|project (?:is )?closed|project completed|no longer available|not accepting proposals|role (?:has been )?filled|vacancy (?:has been )?filled|招聘已结束|职位已关闭|岗位已关闭|已停止招聘|停止接受申请|已招满|项目已关闭|项目已完成|任务已结束|任务已关闭|已过期)/i;

type Candidate={title:string,link:string,body:string,source_name:string,published_at:string|null,score:number};

function score(x:Candidate){const text=(x.title+' '+x.body).slice(0,2200);let value=0;if(core.test(x.title))value+=7;if(siteFit.test(text))value+=8;if(easy.test(text))value+=10;if(globalish.test(text))value+=5;if(/freelance|contract|part-time|project|gig|外包|兼职|项目/i.test(text))value+=4;if(/beginner|entry level|junior|no experience|初级|入门|无需经验/i.test(text))value+=5;if(advanced.test(x.title))value-=12;if(titleLimited.test(x.title))value-=14;return value}
const allowed=(x:Candidate)=>x.title&&/^https?:\/\//i.test(x.link)&&core.test(x.title)&&!genericTitle.test(x.title.trim())&&!badRole.test(x.title)&&!titleLimited.test(x.title)&&!/[�â]/.test(x.title)&&!risk.test(x.title+' '+x.body);

function parseXml(xml:string,name:string){
  const blocks=[...(xml.match(/<item\b[\s\S]*?<\/item>/gi)||[]),...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi)||[])];
  return blocks.slice(0,120).map(block=>{
    const get=(tag:string)=>block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]||'';
    const title=clean(get('title'));
    const link=clean(get('link'))||block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]||'';
    const body=clean(get('content:encoded')||get('content')||get('description')||get('summary'));
    const rawDate=clean(get('pubDate')||get('published')||get('updated'));
    const publishedAt=rawDate&&!isNaN(Date.parse(rawDate))?new Date(rawDate).toISOString():null;
    const candidate:Candidate={title,link,body,source_name:name,published_at:publishedAt,score:0};candidate.score=score(candidate);return candidate;
  }).filter(allowed);
}
function parseJson(json:any,name:string){
  const source=Array.isArray(json)?json:Array.isArray(json?.jobs)?json.jobs:[];
  return source.slice(0,180).map((row:any)=>{
    const title=clean(row.position||row.title||row.job_title||'');
    const link=String(row.url||row.apply_url||row.link||'');
    const body=clean([row.description,row.company_name||row.company,row.candidate_required_location||row.location,Array.isArray(row.tags)?row.tags.join(' '):'',row.category,row.job_type].filter(Boolean).join(' '));
    const rawDate=row.date||row.publication_date||row.created_at||row.created||null;
    const publishedAt=rawDate&&!isNaN(Date.parse(rawDate))?new Date(rawDate).toISOString():null;
    const candidate:Candidate={title,link,body,source_name:name,published_at:publishedAt,score:0};candidate.score=score(candidate);return candidate;
  }).filter(allowed);
}
function parseHtml(html:string,name:string,base:string){
  const out:Candidate[]=[];
  for(const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const title=clean(match[2]);if(title.length<12||title.length>180)continue;
    const link=abs(match[1],base);if(!link)continue;
    const candidate:Candidate={title,link,body:'',source_name:name,published_at:null,score:0};candidate.score=score(candidate);if(allowed(candidate))out.push(candidate);
  }
  return out.slice(0,100);
}
async function detail(candidate:Candidate){
  if(candidate.body.length>160)return candidate;
  try{
    const response=await fetch(candidate.link,{headers:{'user-agent':ua,'accept':'text/html'},redirect:'follow',signal:AbortSignal.timeout(6500)});
    if(!response.ok)return candidate;
    const html=await response.text();
    const main=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html;
    const paragraphs=[...main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>clean(x[1])).filter(x=>x.length>35).slice(0,16).join(' ');
    if(paragraphs)candidate.body=paragraphs.slice(0,1600);candidate.score=score(candidate);return candidate;
  }catch{return candidate}
}
async function mapLimit<T,R>(items:T[],limit:number,work:(item:T)=>Promise<R>){
  const results=new Array<R>(items.length);let next=0;
  async function runner(){while(next<items.length){const index=next++;results[index]=await work(items[index])}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},runner));return results;
}
const bjDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const bjTime=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(/:/g,'');

async function cleanup(db:any,cutoff:string){
  await db.from('community_external_feed').delete().eq('opportunity_status','closed').is('claimed_by',null);
  await db.from('community_external_feed').delete().lt('created_at',cutoff).is('claimed_by',null);
}
async function recheck(db:any,cutoff:string){
  const {data:active}=await db.from('community_external_feed').select('id,title,source_url,batch_key,closed_at').eq('opportunity_status','open').gte('created_at',cutoff);
  await mapLimit(active||[],5,async(item:any)=>{
    let closed=false;
    try{const response=await fetch(item.source_url,{headers:{'user-agent':ua,'accept':'text/html,*/*'},redirect:'follow',signal:AbortSignal.timeout(6500)});if(response.status===404||response.status===410)closed=true;else if(response.ok){const text=clean((await response.text()).slice(0,300000));if(closedText.test(text))closed=true}}catch{}
    const now=new Date().toISOString();
    await db.from('community_external_feed').update({opportunity_status:closed?'closed':'open',status_checked_at:now,closed_at:closed?(item.closed_at||now):null}).eq('id',item.id).eq('opportunity_status','open');
    await db.from('community_opportunity_status_history').upsert({source_url:item.source_url,title:item.title,status:closed?'closed':'open',last_checked_at:now,last_batch_key:item.batch_key,...(closed?{closed_at:now}:{})},{onConflict:'source_url',ignoreDuplicates:false});
    return true;
  });
}

Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return new Response('method not allowed',{status:405});
  try{
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const cutoff=new Date(Date.now()-36*60*60*1000).toISOString();
    await recheck(db,cutoff);
    await cleanup(db,cutoff);

    const {data:current,error:currentError}=await db.from('community_external_feed').select('id,source_url,batch_code,batch_key,opportunity_status,created_at,claimed_by').order('created_at',{ascending:false});
    if(currentError)throw currentError;
    const visible=(current||[]).filter((x:any)=>x.opportunity_status==='open'&&!x.claimed_by&&Date.parse(x.created_at)>=Date.parse(cutoff));
    const newest=(code:string)=>visible.filter((x:any)=>x.batch_code===code).sort((a:any,b:any)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0]||null;
    const latestA=newest('A'),latestB=newest('B');
    const code=!latestA?'A':!latestB?'B':Date.parse(latestA.created_at)<=Date.parse(latestB.created_at)?'A':'B';
    const existingUrls=new Set((current||[]).map((x:any)=>x.source_url).filter(Boolean));

    const {data:sources,error:sourceError}=await db.from('community_feed_sources').select('name,feed_url').eq('enabled',true).order('id');
    if(sourceError)throw sourceError;
    const sourceResults=await Promise.all((sources||[]).map(async(src:any)=>{
      try{
        const response=await fetch(src.feed_url,{headers:{'user-agent':ua,'accept':'application/json,application/rss+xml,application/xml,text/html,*/*'},redirect:'follow',signal:AbortSignal.timeout(9000)});
        if(!response.ok)return [];
        const contentType=response.headers.get('content-type')||'',text=await response.text();
        if(contentType.includes('json')||text.trim().startsWith('[')||text.trim().startsWith('{')){try{return parseJson(JSON.parse(text),src.name)}catch{return []}}
        if(/<rss|<feed|<item|<entry/i.test(text))return parseXml(text,src.name);
        return parseHtml(text,src.name,src.feed_url);
      }catch{return []}
    }));
    const unique=new Map<string,Candidate>();
    for(const candidate of sourceResults.flat())if(!existingUrls.has(candidate.link)&&!unique.has(candidate.link)&&allowed(candidate))unique.set(candidate.link,candidate);
    const candidates=[...unique.values()].sort((a,b)=>b.score-a.score||Date.parse(b.published_at||'1970')-Date.parse(a.published_at||'1970')).slice(0,60);
    const enriched=(await mapLimit(candidates,5,detail)).filter(x=>allowed(x)&&x.score>=8&&x.body.length>=45).sort((a,b)=>b.score-a.score||Date.parse(b.published_at||'1970')-Date.parse(a.published_at||'1970'));
    const picked:Candidate[]=[];let advancedCount=0;
    for(const candidate of enriched){if(picked.length>=20)break;const isAdvanced=advanced.test(candidate.title);if(isAdvanced&&advancedCount>=3)continue;picked.push(candidate);if(isAdvanced)advancedCount++}
    if(picked.length<10)return Response.json({ok:true,rotated:false,retry_on_next_schedule:true,valid:picked.length,reason:'not enough suitable new opportunities'});

    const batch=`${bjDay()}-${code}-${bjTime()}`;
    const rows=picked.map((candidate,index)=>({title:candidate.title.slice(0,220),body:candidate.body.slice(0,1200),source_name:candidate.source_name,source_url:candidate.link,published_at:candidate.published_at,batch_key:batch,batch_code:code,opportunity_no:index+1,opportunity_status:'open'}));
    const {data:inserted,error:insertError}=await db.from('community_external_feed').insert(rows).select('id,title,source_url,batch_key');
    if(insertError)throw insertError;
    await db.from('community_external_feed').delete().eq('batch_code',code).neq('batch_key',batch).is('claimed_by',null);
    const now=new Date().toISOString();
    for(const item of inserted||[])await db.from('community_opportunity_status_history').upsert({source_url:item.source_url,title:item.title,status:'open',last_checked_at:now,last_batch_key:item.batch_key},{onConflict:'source_url'});
    await cleanup(db,cutoff);
    return Response.json({ok:true,rotated:true,batch,count:(inserted||[]).length,next_refresh_continues:true,advanced:advancedCount});
  }catch(error){
    return Response.json({ok:false,error:String((error as Error)?.message||error),next_refresh_continues:true},{status:500});
  }
});

