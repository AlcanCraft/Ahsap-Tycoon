(() => {
let step=1,config=null,adminEmail="";
const cards=[...document.querySelectorAll(".setup-card")];
function show(n){step=Math.max(1,Math.min(4,n));cards.forEach(c=>c.classList.toggle("active",+c.dataset.step===step));document.querySelector("#setupStateBadge").textContent=`${step} / 4`;document.querySelector("#setupProgressFill").style.width=`${step*25}%`;}
document.querySelectorAll(".next-step").forEach(b=>b.onclick=()=>show(step+1));
document.querySelectorAll(".previous-step").forEach(b=>b.onclick=()=>show(step-1));

document.querySelector("#parseConfigBtn").onclick=()=>{
  const text=document.querySelector("#firebaseConfigInput").value;
  adminEmail=document.querySelector("#adminEmailInput").value.trim();
  const msg=document.querySelector("#setupMessage");
  try{
    const match=text.match(/\{[\s\S]*\}/);
    if(!match)throw new Error("firebaseConfig nesnesi bulunamadı.");
    let objText=match[0].replace(/(\w+)\s*:/g,'"$1":').replace(/'/g,'"').replace(/,\s*}/,'}');
    config=JSON.parse(objText);
    if(!config.apiKey||!config.projectId)throw new Error("apiKey veya projectId eksik.");
    if(!adminEmail.includes("@"))throw new Error("Yönetici e-postası geçersiz.");
    msg.textContent="Bilgiler hazır.";msg.className="auth-message success";setTimeout(()=>show(3),350);
  }catch(e){msg.textContent=e.message;msg.className="auth-message error";}
};
document.querySelector("#servicesNextBtn").onclick=()=>document.querySelector("#servicesCheck").checked?show(4):alert("Önce iki hizmeti açtığını işaretle.");

function download(name,content){const blob=new Blob([content],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
document.querySelector("#downloadConfigBtn").onclick=()=>{
  if(!config)return alert("Önce yapılandırmayı tamamla.");
  download("firebase-config.js",`export const firebaseConfig = ${JSON.stringify(config,null,2)};\n\nexport const ADMIN_EMAIL = ${JSON.stringify(adminEmail)};\n`);
};
document.querySelector("#downloadRulesBtn").onclick=()=>{
  if(!adminEmail)return alert("Önce yönetici e-postanı yaz.");
  download("firestore.rules",`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isAdmin() { return signedIn() && request.auth.token.email == ${JSON.stringify(adminEmail)}; }

    match /users/{userId} {
      allow create: if signedIn() && request.auth.uid == userId;
      allow read: if signedIn() && (request.auth.uid == userId || isAdmin());
      allow update: if signedIn() && request.auth.uid == userId;
    }

    match /gameSaves/{userId} {
      allow create, update: if signedIn() && request.auth.uid == userId;
      allow read: if signedIn() && (request.auth.uid == userId || isAdmin());
    }
  }
}
`);
};
show(1);
})();