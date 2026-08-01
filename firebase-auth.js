import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

const message = document.querySelector("#authMessage");
const configured = !firebaseConfig.apiKey.includes("FIREBASE_");
if (!configured) {
  message.textContent = "Önce Firebase Kurulum Sihirbazını tamamla.";
  message.className = "auth-message error";
  throw new Error("Firebase config eksik");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function msg(text, type=""){ message.textContent=text; message.className=`auth-message ${type}`; }
function show(type){
  const login=type==="login";
  document.querySelector("#loginForm").classList.toggle("hidden",!login);
  document.querySelector("#registerForm").classList.toggle("hidden",login);
  document.querySelector("#showLoginBtn").classList.toggle("active",login);
  document.querySelector("#showRegisterBtn").classList.toggle("active",!login);
}
document.querySelector("#showLoginBtn").onclick=()=>show("login");
document.querySelector("#showRegisterBtn").onclick=()=>show("register");

document.querySelector("#registerForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    const username=document.querySelector("#registerUsername").value.trim();
    const email=document.querySelector("#registerEmail").value.trim();
    const password=document.querySelector("#registerPassword").value;
    const result=await createUserWithEmailAndPassword(auth,email,password);
    await updateProfile(result.user,{displayName:username});
    await setDoc(doc(db,"users",result.user.uid),{
      username,email,createdAt:serverTimestamp(),lastSeenAt:serverTimestamp()
    });
    msg("Kayıt başarılı.","success");
  }catch(error){msg(error.message,"error");}
};

document.querySelector("#loginForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    await signInWithEmailAndPassword(auth,
      document.querySelector("#loginEmail").value.trim(),
      document.querySelector("#loginPassword").value
    );
    msg("Giriş başarılı.","success");
  }catch(error){msg(error.message,"error");}
};

document.querySelector("#logoutBtn").onclick=()=>signOut(auth);

onAuthStateChanged(auth,async user=>{
  const forms=document.querySelector("#authForms");
  const panel=document.querySelector("#accountPanel");
  if(!user){forms.classList.remove("hidden");panel.classList.add("hidden");return;}
  forms.classList.add("hidden");panel.classList.remove("hidden");
  const snap=await getDoc(doc(db,"users",user.uid));
  const data=snap.data()||{};
  const username=data.username||user.displayName||"Oyuncu";
  document.querySelector("#accountUsername").textContent=username;
  document.querySelector("#accountEmail").textContent=user.email;
  document.querySelector("#accountAvatar").textContent=username.slice(0,2).toLocaleUpperCase("tr-TR");
  const save=await getDoc(doc(db,"gameSaves",user.uid));
  document.querySelector("#saveStatus").textContent=save.exists()?"Bulutta kayıtlı":"Yeni oyun";
  document.querySelector("#lastSaveAt").textContent=save.exists()&&save.data().updatedAt?.toDate
    ? save.data().updatedAt.toDate().toLocaleString("tr-TR"):"Henüz yok";
  document.querySelector("#adminPanelLink").classList.toggle("hidden",user.email.toLowerCase()!==ADMIN_EMAIL.toLowerCase());
  await setDoc(doc(db,"users",user.uid),{lastSeenAt:serverTimestamp()},{merge:true});
});
