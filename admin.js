import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { auth, db } from "./firebase-service.js";
import { ADMIN_EMAIL } from "./firebase-config.js";

const tbody = document.querySelector("#playersTableBody");
const message = document.querySelector("#adminMessage");

function cell(value = "—") {
  const td = document.createElement("td");
  td.textContent = value ?? "—";
  return td;
}

async function loadPlayers() {
  message.textContent = "Kayıtlar yükleniyor...";

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const savesSnap = await getDocs(collection(db, "gameSaves"));
    const saves = new Map(savesSnap.docs.map(docSnap => [docSnap.id, docSnap.data()]));

    tbody.innerHTML = "";

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      const save = saves.get(userDoc.id) || {};
      const state = save.saveData || {};

      const tr = document.createElement("tr");
      tr.append(
        cell(user.username),
        cell(user.email),
        cell(user.createdAt?.toDate?.().toLocaleString("tr-TR") || "—"),
        cell(user.lastSeenAt?.toDate?.().toLocaleString("tr-TR") || "—"),
        cell(state.money ?? save.money ?? 0),
        cell(state.logs ?? save.logs ?? 0),
        cell(state.lumber ?? save.lumber ?? 0),
        cell(state.workers ?? save.workers ?? 0),
        cell(Array.isArray(state.plots) ? state.plots.length : save.plots ?? 16),
        cell(save.updatedAt?.toDate?.().toLocaleString("tr-TR") || "Kayıt yok")
      );

      tbody.appendChild(tr);
    }

    const dayAgo = Date.now() - 86_400_000;

    document.querySelector("#totalPlayers").textContent = usersSnap.size;
    document.querySelector("#totalSaves").textContent = savesSnap.size;
    document.querySelector("#activePlayers").textContent =
      usersSnap.docs.filter(docSnap =>
        docSnap.data().lastSeenAt?.toMillis?.() >= dayAgo
      ).length;

    message.textContent = "Oyuncu kayıtları güncel.";
    message.className = "auth-message success";
  } catch (error) {
    message.textContent = error.message;
    message.className = "auth-message error";
  }
}

document.querySelector("#refreshAdminBtn").addEventListener("click", loadPlayers);
document.querySelector("#adminLogoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  location.href = "index.html";
});

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    message.textContent = "Bu sayfaya erişim yetkin yok.";
    message.className = "auth-message error";
    return;
  }

  loadPlayers();
});
