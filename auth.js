(() => {
  "use strict";

  const cfg = window.AHSAP_CONFIG || {};
  const message = document.querySelector("#authMessage");

  function setMessage(text, type = "") {
    message.textContent = text;
    message.className = `auth-message ${type}`;
  }

  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR-PROJECT")) {
    setMessage("Önce config.js dosyasına Supabase adresini ve publishable anahtarını yazmalısın.", "error");
    return;
  }

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const authForms = document.querySelector("#authForms");
  const accountPanel = document.querySelector("#accountPanel");

  function showForm(type) {
    const login = type === "login";
    loginForm.classList.toggle("hidden", !login);
    registerForm.classList.toggle("hidden", login);
    document.querySelector("#showLoginBtn").classList.toggle("active", login);
    document.querySelector("#showRegisterBtn").classList.toggle("active", !login);
    setMessage("");
  }

  async function renderSession(session) {
    if (!session?.user) {
      authForms.classList.remove("hidden");
      accountPanel.classList.add("hidden");
      return;
    }

    const { data: profile, error } = await client
      .from("profiles")
      .select("username,email,is_admin,created_at")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      setMessage(error.message, "error");
      return;
    }

    await client
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", session.user.id);

    const { data: save } = await client
      .from("game_saves")
      .select("updated_at")
      .eq("user_id", session.user.id)
      .maybeSingle();

    authForms.classList.add("hidden");
    accountPanel.classList.remove("hidden");
    document.querySelector("#accountUsername").textContent = profile.username;
    document.querySelector("#accountEmail").textContent = profile.email;
    document.querySelector("#accountAvatar").textContent =
      profile.username.slice(0, 2).toLocaleUpperCase("tr-TR");
    document.querySelector("#saveStatus").textContent = save ? "Bulutta kayıtlı" : "Yeni oyun";
    document.querySelector("#lastSaveAt").textContent = save?.updated_at
      ? new Date(save.updated_at).toLocaleString("tr-TR")
      : "Henüz yok";
    document.querySelector("#adminPanelLink").classList.toggle("hidden", !profile.is_admin);
  }

  document.querySelector("#showLoginBtn").addEventListener("click", () => showForm("login"));
  document.querySelector("#showRegisterBtn").addEventListener("click", () => showForm("register"));

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    setMessage("Giriş yapılıyor...");

    const { data, error } = await client.auth.signInWithPassword({
      email: document.querySelector("#loginEmail").value.trim(),
      password: document.querySelector("#loginPassword").value
    });

    if (error) return setMessage(error.message, "error");
    setMessage("Giriş başarılı.", "success");
    await renderSession(data.session);
  });

  registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    const username = document.querySelector("#registerUsername").value.trim();
    const email = document.querySelector("#registerEmail").value.trim();
    const password = document.querySelector("#registerPassword").value;

    if (!/^[a-zA-Z0-9_ğüşöçıİĞÜŞÖÇ -]{3,24}$/.test(username)) {
      return setMessage("Kullanıcı adı 3–24 karakter olmalı.", "error");
    }

    setMessage("Hesap oluşturuluyor...");

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });

    if (error) return setMessage(error.message, "error");

    if (!data.session) {
      setMessage("Kayıt tamamlandı. E-posta doğrulama bağlantısını açtıktan sonra giriş yap.", "success");
      showForm("login");
      return;
    }

    setMessage("Kayıt tamamlandı.", "success");
    await renderSession(data.session);
  });

  document.querySelector("#logoutBtn").addEventListener("click", async () => {
    await client.auth.signOut();
    location.reload();
  });

  client.auth.getSession().then(({ data }) => renderSession(data.session));
  client.auth.onAuthStateChange((_event, session) => renderSession(session));
})();