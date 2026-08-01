import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { auth, db } from "./firebase-service.js";

const list = document.querySelector("#leaderboardList");
const message = document.querySelector("#leaderboardMessage");

function score(save) {
  const state = save.saveData || {};
  const money = Number(state.money ?? save.money ?? 0);
  const logs = Number(state.logs ?? save.logs ?? 0);
  const lumber = Number(state.lumber ?? save.lumber ?? 0);
  const workers = Number(state.workers ?? save.workers ?? 0);
  const plots = Array.isArray(state.plots) ? state.plots.length : Number(save.plots ?? 16);

  return Math.max(0, Math.floor(
    money + logs * 18 + lumber * 38 + workers * 120 + plots * 75
  ));
}

async function loadLeaderboard() {
  try {
    const snapshot = await getDocs(collection(db, "gameSaves"));

    const players = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        username: data.username || "Oyuncu",
        score: score(data),
        money: data.money || data.saveData?.money || 0,
        workers: data.workers || data.saveData?.workers || 0,
        plots: data.plots || data.saveData?.plots?.length || 16
      };
    }).sort((a, b) => b.score - a.score).slice(0, 50);

    list.innerHTML = players.length
      ? players.map((player, index) => `
          <article class="leaderboard-row">
            <span class="rank">${index + 1}</span>
            <div class="leaderboard-avatar">${player.username.slice(0, 2).toLocaleUpperCase("tr-TR")}</div>
            <div class="leaderboard-player">
              <strong>${player.username}</strong>
              <span>${player.workers} işçi • ${player.plots} parsel</span>
            </div>
            <div class="leaderboard-money">${new Intl.NumberFormat("tr-TR").format(player.money)} ₺</div>
            <div class="leaderboard-score">${new Intl.NumberFormat("tr-TR").format(player.score)} puan</div>
          </article>
        `).join("")
      : `<div class="leaderboard-empty">Henüz sıralamaya giren oyuncu yok.</div>`;

    message.textContent = "Sıralama güncel.";
    message.className = "auth-message success";
  } catch (error) {
    message.textContent = error.message;
    message.className = "auth-message error";
  }
}

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "index.html";
    return;
  }
  loadLeaderboard();
});
