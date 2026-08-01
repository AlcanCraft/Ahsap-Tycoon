import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { auth, db } from "./firebase-service.js";

const LOCAL_SAVE_KEY = "ahsapTycoonSave_v13";
let activeUser = null;
let lastUploaded = "";
let uploadTimer = null;

function findLocalSave() {
  const keys = [
    "ahsapTycoonSave_v13",
    "ahsapTycoonSave_v12",
    "ahsapTycoonSave"
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  return null;
}

async function uploadSave() {
  if (!activeUser) return;

  const raw = findLocalSave();
  if (!raw || raw === lastUploaded) return;

  try {
    const saveData = JSON.parse(raw);

    await setDoc(doc(db, "gameSaves", activeUser.uid), {
      username: activeUser.displayName || "Oyuncu",
      email: activeUser.email,
      money: saveData.money || 0,
      logs: saveData.logs || 0,
      lumber: saveData.lumber || 0,
      workers: saveData.workers || 0,
      plots: Array.isArray(saveData.plots) ? saveData.plots.length : 16,
      saveData,
      updatedAt: serverTimestamp()
    }, { merge: true });

    lastUploaded = raw;
  } catch (error) {
    console.warn("Bulut kaydı yüklenemedi:", error);
  }
}

document.querySelector("#logoutGameBtn")?.addEventListener("click", async () => {
  await uploadSave();
  if (uploadTimer) clearInterval(uploadTimer);
  await signOut(auth);
  location.href = "index.html";
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  activeUser = user;
  document.querySelector("#currentPlayerName").textContent =
    user.displayName || "Oyuncu";

  try {
    const cloudSnap = await getDoc(doc(db, "gameSaves", user.uid));

    if (cloudSnap.exists() && cloudSnap.data().saveData) {
      const raw = JSON.stringify(cloudSnap.data().saveData);
      localStorage.setItem(LOCAL_SAVE_KEY, raw);
      lastUploaded = raw;
    }
  } catch (error) {
    console.warn("Bulut kaydı okunamadı:", error);
  }

  const gameScript = document.createElement("script");
  gameScript.src = "game.js";
  gameScript.onload = () => {
    uploadTimer = setInterval(uploadSave, 2500);
    window.addEventListener("beforeunload", uploadSave);
  };
  document.body.appendChild(gameScript);
});
