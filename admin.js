(() => {
  "use strict";

  const cfg = window.AHSAP_CONFIG || {};
  const message = document.querySelector("#adminMessage");

  function setMessage(text, type = "") {
    message.textContent = text;
    message.className = `auth-message ${type}`;
  }

  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR-PROJECT")) {
    setMessage("config.js içindeki Supabase ayarları eksik.", "error");
    return;
  }

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  function cell(value = "—") {
    const td = document.createElement("td");
    td.textContent = value ?? "—";
    return td;
  }

  async function loadPlayers() {
    setMessage("Kayıtlar yükleniyor...");

    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) {
      location.href = "index.html";
      return;
    }

    const { data: myProfile } = await client
      .from("profiles")
      .select("is_admin")
      .eq("user_id", session.user.id)
      .single();

    if (!myProfile?.is_admin) {
      setMessage("Bu sayfaya erişim yetkiniz yok.", "error");
      return;
    }

    const { data: profiles, error: profilesError } = await client
      .from("profiles")
      .select("user_id,username,email,created_at,last_seen_at")
      .order("created_at", { ascending: false });

    if (profilesError) return setMessage(profilesError.message, "error");

    const { data: saves, error: savesError } = await client
      .from("game_saves")
      .select("user_id,save_data,updated_at");

    if (savesError) return setMessage(savesError.message, "error");

    const savesByUser = new Map((saves || []).map(save => [save.user_id, save]));
    const tbody = document.querySelector("#playersTableBody");
    tbody.innerHTML = "";

    for (const profile of profiles || []) {
      const save = savesByUser.get(profile.user_id);
      const state = save?.save_data || {};
      const tr = document.createElement("tr");
      tr.append(
        cell(profile.username),
        cell(profile.email),
        cell(new Date(profile.created_at).toLocaleString("tr-TR")),
        cell(profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString("tr-TR") : "—"),
        cell(state.money ?? 0),
        cell(state.logs ?? 0),
        cell(state.lumber ?? 0),
        cell(state.workers ?? 0),
        cell(Array.isArray(state.plots) ? state.plots.length : 16),
        cell(save?.updated_at ? new Date(save.updated_at).toLocaleString("tr-TR") : "Kayıt yok")
      );
      tbody.appendChild(tr);
    }

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    document.querySelector("#totalPlayers").textContent = profiles?.length || 0;
    document.querySelector("#totalSaves").textContent = saves?.length || 0;
    document.querySelector("#activePlayers").textContent =
      (profiles || []).filter(p => p.last_seen_at && new Date(p.last_seen_at).getTime() >= dayAgo).length;

    setMessage("Oyuncu kayıtları güncel.", "success");
  }

  document.querySelector("#refreshAdminBtn").addEventListener("click", loadPlayers);
  document.querySelector("#adminLogoutBtn").addEventListener("click", async () => {
    await client.auth.signOut();
    location.href = "index.html";
  });

  loadPlayers();
})();