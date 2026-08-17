import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.0';

const CORS={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,'content-type':'application/json; charset=utf-8'}});
function envKey(modern:string,legacy:string){
  const raw=Deno.env.get(modern);
  if(raw){try{const v=JSON.parse(raw);if(typeof v?.default==='string')return v.default}catch{}}
  const fallback=Deno.env.get(legacy); if(!fallback) throw new Error(modern+'_MISSING'); return fallback;
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:CORS});
  if(req.method!=='POST') return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const auth=req.headers.get('Authorization')||'';
    if(!auth.startsWith('Bearer ')) return json({error:'AUTH_REQUIRED'},401);
    const url=Deno.env.get('SUPABASE_URL')!;
    const publishable=envKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
    const service=envKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
    const userClient=createClient(url,publishable,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const token=auth.slice(7);
    const {data:ud,error:ue}=await userClient.auth.getUser(token);
    if(ue||!ud.user) return json({error:'INVALID_SESSION'},401);
    const body=await req.json().catch(()=>({}));
    const action=String(body?.action||'');
    if(action==='checkin'){
      const {data,error}=await admin.rpc('gyx_member_checkin_service',{p_user_id:ud.user.id});
      if(error) throw error;
      return json({ok:true,data});
    }
    if(action==='redeem'){
      const rewardId=String(body?.reward_id||'').trim();
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rewardId)) return json({error:'INVALID_REWARD_ID'},400);
      const {data,error}=await admin.rpc('gyx_redeem_member_reward_service',{p_user_id:ud.user.id,p_reward_id:rewardId});
      if(error){
        const m=String(error.message||'');
        for(const code of ['REAL_PURCHASE_REQUIRED','INSUFFICIENT_POINTS','ALREADY_REDEEMED','REWARD_NOT_AVAILABLE','POINT_ACCOUNT_NOT_FOUND']) if(m.includes(code)) return json({error:code},409);
        throw error;
      }
      return json({ok:true,data});
    }
    return json({error:'INVALID_ACTION'},400);
  }catch(e){console.error('member-points-action',e);return json({error:'INTERNAL_ERROR'},500)}
});