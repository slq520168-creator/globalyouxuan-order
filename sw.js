self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('message',event=>{
  const data=event.data||{};
  if(data.type!=='GYX_SHOW_NOTIFICATION')return;
  const title=data.title||'GlobalYouXuan';
  const options={
    body:data.body||'',
    icon:'assets/member-logo.webp',
    badge:'assets/member-logo.webp',
    data:{url:data.url||'shop.html'}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch{payload={body:event.data?event.data.text():''}}
  const title=payload.title||'GlobalYouXuan';
  const options={
    body:payload.body||'',
    icon:payload.icon||'assets/member-logo.webp',
    badge:payload.badge||'assets/member-logo.webp',
    data:{url:payload.url||'shop.html'}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'shop.html',self.location.origin).href;
  event.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      if('focus' in client){
        if('navigate' in client)await client.navigate(target);
        return client.focus();
      }
    }
    if(self.clients.openWindow)return self.clients.openWindow(target);
  })());
});
