import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { auth, db } from "./firebase-service.js";
import { ADMIN_EMAIL } from "./firebase-config.js";

const message = document.querySelector("#authMessage");
const forms = document.querySelector("#authForms");
const accountPanel = document.querySelector("#accountPanel");

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `auth-message ${type}`;
}

function showForm(type) {
  const loginMode = type === "login";
  document.querySelector("#loginForm").classList.toggle("hidden", !loginMode);
  document.querySelector("#registerForm").classList.toggle("hidden", loginMode);
  document.querySelector("#showLoginBtn").classList.toggle("active", loginMode);
  document.querySelector("#showRegisterBtn").classList.toggle("active", !loginMode);
  setMessage("");
}

document.querySelector("#showLoginBtn").addEventListener("click", () => showForm("login"));
document.querySelector("#showRegisterBtn").addEventListener("click", () => showForm("register"));

document.querySelector("#registerForm").addEventListener("submit", async event => {
  event.preventDefault();

  const username = document.querySelector("#registerUsername").value.trim();
  const email = document.querySelector("#registerEmail").value.trim();
  const password = document.querySelector("#registerPassword").value;

  if (!/^[a-zA-Z0-9_ğüşöçıİĞÜŞÖÇ -]{3,24}$/.test(username)) {
    return setMessage("Kullanıcı adı 3–24 karakter olmalıdır.", "error");
  }

  setMessage("Hesap oluşturuluyor...");

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: username });

    await setDoc(doc(db, "users", result.user.uid), {
      username,
      email,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    });

    setMessage("Kayıt tamamlandı.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

document.querySelector("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  setMessage("Giriş yapılıyor...");

  try {
    await signInWithEmailAndPassword(
      auth,
      document.querySelector("#loginEmail").value.trim(),
      document.querySelector("#loginPassword").value
    );
    setMessage("Giriş başarılı.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

document.querySelector("#forgotPasswordBtn").addEventListener("click", async () => {
  const email = document.querySelector("#loginEmail").value.trim();

  if (!email) {
    return setMessage("Önce e-posta adresini yaz.", "error");
  }

  try {
    await sendPasswordResetEmail(auth, email);
    setMessage("Parola yenileme bağlantısı e-posta adresine gönderildi.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

document.querySelector("#logoutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  if (!user) {
    forms.classList.remove("hidden");
    accountPanel.classList.add("hidden");
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const profileSnap = await getDoc(userRef);
  const profile = profileSnap.data() || {};
  const username = profile.username || user.displayName || "Oyuncu";

  await setDoc(userRef, {
    username,
    email: user.email,
    lastSeenAt: serverTimestamp()
  }, { merge: true });

  const saveSnap = await getDoc(doc(db, "gameSaves", user.uid));

  forms.classList.add("hidden");
  accountPanel.classList.remove("hidden");
  document.querySelector("#accountUsername").textContent = username;
  document.querySelector("#accountEmail").textContent = user.email;
  document.querySelector("#accountAvatar").textContent =
    username.slice(0, 2).toLocaleUpperCase("tr-TR");

  document.querySelector("#saveStatus").textContent =
    saveSnap.exists() ? "Bulutta kayıtlı" : "Yeni oyun";

  document.querySelector("#lastSaveAt").textContent =
    saveSnap.exists() && saveSnap.data().updatedAt?.toDate
      ? saveSnap.data().updatedAt.toDate().toLocaleString("tr-TR")
      : "Henüz yok";

  document.querySelector("#adminPanelLink").classList.toggle(
    "hidden",
    user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
  );
});
