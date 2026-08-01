import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const body=document.querySelector("#playersTableBody"),message=document.querySelector("#adminMessage");
const cell=v=>{const td=document.createElement("td");td.textContent=v??"—";return td;};

async function load(){
  const users=await getDocs(collection(db,"users"));
  const saves=await getDocs(collection(db,"gameSaves"));
  const saveMap=new Map(saves.docs.map(d=>[d.id,d.data()]));
  body.innerHTML="";
  users.docs.forEach(d=>{
    const u=d.data(),s=saveMap.get(d.id),g=s?.saveData||{},tr=document.createElement("tr");
    tr.append(cell(u.username),cell(u.email),cell(u.createdAt?.toDate?.().toLocaleString("tr-TR")),cell(u.lastSeenAt?.toDate?.().toLocaleString("tr-TR")),cell(g.money||0),cell(g.logs||0),cell(g.lumber||0),cell(g.workers||0),cell(g.plots?.length||16),cell(s?.updatedAt?.toDate?.().toLocaleString("tr-TR")||"Kayıt yok"));
    body.appendChild(tr);
  });
  document.querySelector("#totalPlayers").textContent=users.size;
  document.querySelector("#totalSaves").textContent=saves.size;
  document.querySelector("#activePlayers").textContent=[...users.docs].filter(d=>d.data().lastSeenAt?.toMillis?.()>Date.now()-86400000).length;
  message.textContent="Kayıtlar güncel.";
}

document.querySelector("#refreshAdminBtn").onclick=load;
document.querySelector("#adminLogoutBtn").onclick=async()=>{await signOut(auth);location.href="index.html";};
onAuthStateChanged(auth,user=>{
  if(!user){location.href="index.html";return;}
  if(user.email.toLowerCase()!==ADMIN_EMAIL.toLowerCase()){message.textContent="Yönetici yetkin yok.";return;}
  load();
});
