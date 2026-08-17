import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json; charset=utf-8'};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:cors});

Deno.serve(async (req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return reply(405,{ok:false,error:'method_not_allowed'});
  const auth=req.headers.get('Authorization')||'';
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:{user},error:userErr}=await userClient.auth.getUser();
  if(userErr||!user) return reply(401,{ok:false,error:'unauthorized'});
  let payload:any={}; try{payload=await req.json()}catch{}
  const id=String(payload?.opportunity_id||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(id)) return reply(400,{ok:false,error:'invalid_opportunity'});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const claimedAt=new Date().toISOString();
  const {data:claimed,error:claimErr}=await admin.from('community_external_feed')
    .update({claimed_by:user.id,claimed_at:claimedAt,opportunity_status:'closed'})
    .eq('id',id).is('claimed_by',null).eq('opportunity_status','open')
    .select('id,title,body,source_url,batch_code,opportunity_no,batch_key,claimed_at').maybeSingle();
  if(claimErr) return reply(500,{ok:false,error:'claim_failed'});
  if(!claimed) return reply(409,{ok:false,error:'already_claimed'});
  const {error:historyErr}=await admin.from('community_opportunity_status_history').upsert({
    source_url:claimed.source_url,
    title:claimed.title,
    status:'closed',
    closed_at:claimedAt,
    last_checked_at:claimedAt,
    last_batch_key:claimed.batch_key
  },{onConflict:'source_url'});
  if(historyErr) console.error('claim history update failed',historyErr.message);
  const {error:statsErr}=await admin.from('community_opportunity_stats').upsert({user_id:user.id,opportunity_id:id,action:'download'},{onConflict:'user_id,opportunity_id,action'});
  if(statsErr) console.error('claim stats update failed',statsErr.message);
  return reply(200,{ok:true,opportunity:claimed});
});