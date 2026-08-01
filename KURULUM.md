# Ahşap Tycoon v1.4 — Kullanıcı Sistemi Kurulumu

Bu sürümde e-posta/parola ile kayıt, kullanıcı adı, bulut oyun kaydı ve yönetici paneli bulunur.

## 1. Supabase projesi oluşturun

Supabase üzerinde ücretsiz bir proje oluşturun.

## 2. Veritabanını hazırlayın

Supabase panelinde **SQL Editor** bölümünü açın.

ZIP içindeki `supabase-setup.sql` dosyasının tamamını yapıştırıp çalıştırın.

## 3. Site adreslerini tanımlayın

Supabase panelinde:

**Authentication → URL Configuration**

- Site URL: `https://alcancraft.github.io/Ahsap-Tycoon/`
- Redirect URLs bölümüne:
  `https://alcancraft.github.io/Ahsap-Tycoon/**`

ekleyin.

## 4. config.js dosyasını düzenleyin

Supabase panelinde:

**Project Settings → API**

bölümünden proje URL'sini ve publishable/anon anahtarını alın.

`config.js` dosyasındaki:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

değerlerini değiştirin.

`service_role` anahtarını kesinlikle GitHub'a yüklemeyin.

## 5. Yönetici hesabını belirleyin

Önce web sitesinden kendi hesabınızı normal kullanıcı olarak oluşturun.

Sonra Supabase SQL Editor'da:

```sql
update public.profiles
set is_admin = true
where email = 'kendi-email-adresiniz';
```

komutunu çalıştırın.

## 6. GitHub'a yükleyin

ZIP içindeki bütün dosyaları GitHub deposunun ana klasörüne yükleyin.

Ana sayfa artık giriş/kayıt ekranıdır.

- Oyun: `game.html`
- Yönetici paneli: `admin.html`

## Güvenlik

Parolalar sizin veritabanı tablolarınızda tutulmaz ve yönetici panelinde gösterilmez. Parola doğrulaması Supabase Auth tarafından yönetilir.

Yönetici panelinde görülebilenler:

- Kullanıcı adı
- E-posta
- Kayıt tarihi
- Son görülme
- Oyun parası
- Kütük ve kereste
- İşçi sayısı
- Parsel sayısı
- Son kayıt zamanı
