const KEYS={products:"gyx_products_v1",orders:"gyx_orders_v1",settings:"gyx_settings_v1"};
const defaults={
 settings:{name:"全球优选",telegram:"https://t.me/your_username",network:"USDT-TRC20",wallet:"TKfQoN7kZirALGYxMkxU4SoqMWJRqXsh7k",minutes:15},
 products:[
  {id:"p1",name:"AI 视频模板包",desc:"短视频镜头、文案与提示词模板合集。",price:9.9,category:"模板",emoji:"🎬",deliveryType:"download",delivery:"downloads/ai-video-template.txt",stockType:"unlimited",active:true},
  {id:"p2",name:"ChatGPT 提示词包",desc:"电商、短视频和办公提示词合集。",price:6.9,category:"模板",emoji:"🤖",deliveryType:"download",delivery:"downloads/chatgpt-prompts.txt",stockType:"unlimited",active:true},
  {id:"p3",name:"数字营销教程",desc:"流量获取、成交转化与日常运营教程。",price:12.8,category:"教程",emoji:"📚",deliveryType:"download",delivery:"downloads/digital-marketing-guide.txt",stockType:"unlimited",active:true},
  {id:"p4",name:"软件激活码",desc:"付款后自动发放一条未使用激活码。",price:19.9,category:"软件",emoji:"🔑",deliveryType:"code",delivery:"GYX-DEMO-2026-8888",stockType:"limited",stock:100,active:true}
 ]
};
function getData(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v??fallback}catch{return fallback}}
function saveData(key,v){localStorage.setItem(key,JSON.stringify(v))}
if(!localStorage.getItem(KEYS.settings))saveData(KEYS.settings,defaults.settings);
if(!localStorage.getItem(KEYS.products))saveData(KEYS.products,defaults.products);
if(!localStorage.getItem(KEYS.orders))saveData(KEYS.orders,[]);
let settings=getData(KEYS.settings,defaults.settings),products=getData(KEYS.products,defaults.products),orders=getData(KEYS.orders,[]);
let selected=null,currentOrder=null,timer=null,currentCategory="全部";
const $=id=>document.getElementById(id);
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function applySettings(){document.title=`${settings.name}｜数字商品自助下单`;$("brandName").textContent=settings.name;$("footerBrand").textContent=settings.name;$("supportLink").href=settings.telegram;$("walletInput").value=settings.wallet;$("networkSpan").textContent=settings.network}
function categories(){return ["全部",...new Set(products.filter(p=>p.active).map(p=>p.category||"其他"))]}
function renderCategories(){$("categoryBar").innerHTML=categories().map(c=>`<button class="category-btn ${c===currentCategory?"active":""}" onclick="setCategory('${escapeHtml(c)}')">${escapeHtml(c)}</button>`).join("")}
window.setCategory=c=>{currentCategory=c;renderCategories();renderProducts()}
function renderProducts(){products=getData(KEYS.products,defaults.products);const q=$("searchInput").value.trim().toLowerCase();const list=products.filter(p=>p.active&&(currentCategory==="全部"||p.category===currentCategory)&&(q===""||p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q)));$("productList").innerHTML=list.length?list.map(p=>`<div class="product-card" onclick="openOrder('${escapeHtml(p.id)}')" style="cursor:pointer"><div class="emoji">${p.emoji||"📦"}</div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.desc)}</p><div class="price">¥${p.price.toFixed(2)}</div></div>`).join(""):"<div style='text-align:center;color:#999'>没有找到相关商品</div>"}
window.openOrder=id=>{products=getData(KEYS.products,defaults.products);selected=products.find(p=>p.id===id);if(!selected)return;$("modalEmoji").textContent=selected.emoji||"📦";$("modalName").textContent=selected.name;$("modalDesc").textContent=selected.desc;$("modalPrice").textContent=selected.price.toFixed(2);showStep("orderStep");openModal("productModal")}
function showStep(id){["orderStep","paymentStep","successStep"].forEach(x=>$(x).classList.toggle("hidden",x!==id))}
function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden");if(id==="productModal")clearInterval(timer)}
function createOrder(){const email=$("emailInput").value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert("请输入正确的收货邮箱");return}const unique=(Math.floor(Math.random()*1e8)).toString(36).toUpperCase();currentOrder={id:unique,productId:selected.id,productName:selected.name,amount:selected.price,email:email,createdAt:new Date().toISOString(),status:"waiting"};orders=getData(KEYS.orders,[]);orders.push(currentOrder);saveData(KEYS.orders,orders);$("paymentAmount").textContent=selected.price.toFixed(2);$("paymentOrderNo").textContent=unique;showStep("paymentStep");startTimer(settings.minutes*60)}
function startTimer(sec){clearInterval(timer);const draw=()=>{const m=String(Math.floor(sec/60)).padStart(2,"0"),s=String(sec%60).padStart(2,"0");$("countdown").textContent=`${m}:${s}`;if(sec--<=0){updateOrderStatus(currentOrder.id,"expired");showStep("orderStep");alert("订单已过期，请重新下单");return}timer=setTimeout(draw,1000)};draw()}
function updateOrderStatus(id,status,delivery=""){orders=getData(KEYS.orders,[]);const i=orders.findIndex(o=>o.id===id);if(i>=0){orders[i].status=status;orders[i].delivery=delivery;orders[i].updatedAt=new Date().toISOString();saveData(KEYS.orders,orders)}}
function simulatePaid(){if(!currentOrder)return;products=getData(KEYS.products,defaults.products);const i=products.findIndex(p=>p.id===currentOrder.productId);if(i<0)return;const p=products[i];if(p.stockType==="limited"){p.stock=(p.stock||0)-1;if(p.stock<=0)p.active=false;saveData(KEYS.products,products)}updateOrderStatus(currentOrder.id,"paid",p.delivery);showStep("successStep");$("successDelivery").textContent=p.deliveryType==="download"?"文件已发送到邮箱":p.deliveryType==="code"?"卡密已发送到邮箱":"账号信息已发送到邮箱"}
function queryOrder(){const no=$("queryOrderNo").value.trim(),email=$("queryEmail").value.trim().toLowerCase();orders=getData(KEYS.orders,[]);const o=orders.find(x=>x.id===no&&x.email.toLowerCase()===email);if(!o){alert("订单不存在");return}alert(`订单号: ${o.id}\n商品: ${o.productName}\n金额: ${o.amount} USDT\n状态: ${{"waiting":"等待付款","paid":"已付款","expired":"已过期"}[o.status]||"未知"}\n创建时间: ${new Date(o.createdAt).toLocaleString()}`)}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
$("productModal").onclick=e=>{if(e.target===$("productModal"))closeModal("productModal")};
$("queryModal").onclick=e=>{if(e.target===$("queryModal"))closeModal("queryModal")};
$("searchInput").oninput=renderProducts;$("createOrderBtn").onclick=createOrder;$("simulatePaidBtn").onclick=simulatePaid;$("orderQueryBtn").onclick=()=>openModal("queryModal");$("queryBtn").onclick=queryOrder;
$("copyWalletBtn").onclick=async()=>{try{await navigator.clipboard.writeText($("walletInput").value);$("copyWalletBtn").textContent="已复制";setTimeout(()=>$("copyWalletBtn").textContent="复制钱包地址",2000)}catch{alert("复制失败")}};
applySettings();renderCategories();renderProducts();
