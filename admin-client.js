(() => {
  "use strict";
  const config = Object.freeze({url:"https://afzcohtnljnmucrkgcaz.supabase.co",publishableKey:"sb_publishable_EqF-kTNRsSZWhUE8LWB8DQ_UNkTjImv"});
  if(!window.supabase||typeof window.supabase.createClient!=="function"){console.error("Supabase client library failed to load.");return;}
  const client=window.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:"gyx_admin_auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"implicit"}});
  async function getVerifiedUser(){try{const{data:sessionData}=await client.auth.getSession();const sessionUser=sessionData?.session?.user||null;if(!sessionUser)return null;const{data,error}=await client.auth.getUser();if(!error&&data?.user)return data.user;return sessionUser}catch{return null}}
  async function invokeFunction(name,body){const{data,error}=await client.functions.invoke(name,{body});if(!error)return data;let code="";try{const payload=await error.context?.clone?.().json();code=payload?.error||payload?.message||""}catch{}const wrapped=new Error(code||error.message||"FUNCTION_REQUEST_FAILED");wrapped.code=code||"FUNCTION_REQUEST_FAILED";throw wrapped}
  window.gyxSupabase=client;window.gyxGetVerifiedUser=getVerifiedUser;window.gyxInvokeFunction=invokeFunction;window.GYX_ADMIN_AUTH_STORAGE="gyx_admin_auth";
  const memberNav=document.querySelector('[data-panel="members"]');if(memberNav){memberNav.removeAttribute('data-panel');memberNav.setAttribute('data-member-security-nav','1')}
  const memberRefresh=document.querySelector('[data-refresh="members"]');if(memberRefresh){memberRefresh.removeAttribute('data-refresh');memberRefresh.setAttribute('data-member-security-refresh','1')}
  const load=(src,key)=>{if(document.querySelector("script[data-"+key+"]"))return;const s=document.createElement("script");s.src=src;s.defer=true;s.setAttribute("data-"+key,"1");document.head.appendChild(s)};
  const go=()=>{load("admin-advanced.js?v=20260810-full-control-1","gyx-advanced");load("admin-data.js?v=20260810-data-control-1","gyx-data");load("admin-code-file.js?v=20260810-code-upload-1","gyx-codefile");load("admin-member-level.js?v=20260811-levels-1","gyx-memberlevel");load("admin-member-profile.js?v=20260811-profile-2","gyx-memberprofile");load("admin-profile-requests.js?v=20260811-profile-review-1","gyx-profilerequests");load("admin-member-security.js?v=20260813-member-security-main-table-2","gyx-membersecurity")};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go,{once:true});else go();
})();