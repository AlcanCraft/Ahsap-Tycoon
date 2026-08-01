(() => {
  "use strict";

  const cfg = window.AHSAP_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR-PROJECT")) {
    alert("config.js içindeki Supabase ayarları eksik.");
    location.href = "index.html";
    return;
  }

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const LOCAL_KEYS = ["ahsapTycoonSave_v13", "ahsapTycoonSave_v12", "ahsapTycoonSave"];
  let currentUser = null;
  let lastUploadedPayload = "";
  let uploadTimer = null;

  function currentLocalSave() {
    for (const key of LOCAL_KEYS) {
      const value = localStorage.getItem(key);
      if (value) return { key, value };
    }
    return null;
  }

  async function loadCloudSave() {
    const { data, error } = await client
      .from("game_saves")
      .select("save_data,updated_at")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) throw error;
    if (!data?.save_data) return;

    const payload = JSON.stringify(data.save_data);
    localStorage.setItem("ahsapTycoonSave_v13", payload);
    lastUploadedPayload = payload;
  }

  async function uploadSave() {
    if (!currentUser) return;
    const local = currentLocalSave();
    if (!local || local.value === lastUploadedPayload) return;

    let parsed;
    try {
      parsed = JSON.parse(local.value);
    } catch {
      return;
    }

    const { error } = await client.from("game_saves").upsert({
      user_id: currentUser.id,
      save_data: parsed,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

    if (!error) lastUploadedPayload = local.value;
  }

  async function boot() {
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) {
      location.href = "index.html";
      return;
    }

    currentUser = session.user;

    const { data: profile } = await client
      .from("profiles")
      .select("username")
      .eq("user_id", currentUser.id)
      .single();

    document.querySelector("#currentPlayerName").textContent = profile?.username || "Oyuncu";

    try {
      await loadCloudSave();
    } catch (error) {
      console.warn("Bulut kaydı yüklenemedi:", error);
    }

    const gameScript = document.createElement("script");
    gameScript.src = "game.js";
    gameScript.onload = () => {
      uploadTimer = setInterval(uploadSave, 2500);
      window.addEventListener("beforeunload", () => {
        uploadSave();
      });
    };
    document.body.appendChild(gameScript);
  }

  document.querySelector("#logoutGameBtn")?.addEventListener("click", async () => {
    await uploadSave();
    if (uploadTimer) clearInterval(uploadTimer);
    await client.auth.signOut();
    location.href = "index.html";
  });

  boot();
})();