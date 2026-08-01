import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
let user=null;
let lastUploaded="";

async function getLocal(){
  for(const key of ["ahsapTycoonSave_v13","ahsapTycoonSave_v12","ahsapTycoonSave"]){
    const value=localStorage.getItem(key);
    if(value)return value;
  }
  return null;
}

async function upload(){
  if(!user)return;
  const raw=await getLocal();
  if(!raw||raw===lastUploaded)return;
  try{
    await setDoc(doc(db,"gameSaves",user.uid),{
      saveData:JSON.parse(raw),updatedAt:serverTimestamp()
    });
    lastUploaded=raw;
  }catch(error){console.warn(error);}
}

document.querySelector("#logoutGameBtn").onclick=async()=>{
  await upload();await signOut(auth);location.href="index.html";
};

onAuthStateChanged(auth,async current=>{
  if(!current){location.href="index.html";return;}
  user=current;
  document.querySelector("#currentPlayerName").textContent=current.displayName||"Oyuncu";
  const cloud=await getDoc(doc(db,"gameSaves",current.uid));
  if(cloud.exists()){
    const raw=JSON.stringify(cloud.data().saveData);
    localStorage.setItem("ahsapTycoonSave_v13",raw);
    lastUploaded=raw;
  }
  const script=document.createElement("script");
  script.src="game.js";
  script.onload=()=>setInterval(upload,2500);
  document.body.appendChild(script);
});
