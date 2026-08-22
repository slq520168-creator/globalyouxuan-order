import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.0';

const C={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...C,'Content-Type':'application/json; charset=utf-8'}});
const TZ='Asia/Shanghai';

function todayCN(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:C});
  if(req.method!=='POST')return J({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const authorization=req.headers.get('Authorization')||'';
    if(!authorization.startsWith('Bearer '))return J({error:'UNAUTHORIZED'},401);
    const url=Deno.env.get('SUPABASE_URL')!;
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:userError}=await userClient.auth.getUser();
    if(userError||!userData.user)return J({error:'UNAUTHORIZED'},401);
    const {data:admin,error:adminError}=await userClient.from('admin_users').select('is_active').eq('user_id',userData.user.id).maybeSingle();
    if(adminError)throw adminError;
    if(!admin?.is_active)return J({error:'ADMIN_REQUIRED'},403);

    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||'today');
    if(action==='today'||action==='day'){
      const date=action==='today'?todayCN():String(body.date||todayCN());
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return J({error:'INVALID_DATE'},400);
      const {data,error}=await db.from('site_daily_views').select('view_date,page_views,updated_at').eq('view_date',date).maybeSingle();
      if(error)throw error;
      return J({ok:true,data:{date,page_views:Number(data?.page_views||0),updated_at:data?.updated_at||null},timezone:TZ});
    }
    if(action==='month'){
      const month=String(body.month||todayCN().slice(0,7));
      if(!/^\d{4}-\d{2}$/.test(month))return J({error:'INVALID_MONTH'},400);
      const start=`${month}-01`;
      const [year,monthNo]=month.split('-').map(Number);
      const nextMonth=new Date(Date.UTC(year,monthNo,1)).toISOString().slice(0,7)+'-01';
      const {data,error}=await db.from('site_daily_views').select('view_date,page_views,updated_at').gte('view_date',start).lt('view_date',nextMonth).order('view_date',{ascending:true});
      if(error)throw error;
      return J({ok:true,data:{month,days:(data||[]).map((x:any)=>({date:x.view_date,page_views:Number(x.page_views||0),updated_at:x.updated_at}))},timezone:TZ});
    }
    return J({error:'ACTION_NOT_ALLOWED'},400);
  }catch(error){
    return J({error:'SERVER_ERROR',message:String((error as Error)?.message||error)},500);
  }
});

