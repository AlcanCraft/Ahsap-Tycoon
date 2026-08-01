# Ahşap Tycoon v1.1

Bu sürümde metin/emoji ağırlıklı görünüm kaldırıldı ve gerçek oyun sahnesi yaklaşımına geçildi.

## Görsel yenilikler

- SVG çizimli gerçek fabrika binası
- SVG çizimli depo binası
- SVG çizimli işçi lojmanı
- Emoji yerine çizimli kaynak ikonları
- SVG ağaçlar
- Hareket eden işçiler
- Fabrikaya taşınan kütükler
- Çalışan testere hattı
- Fabrika bacası duman animasyonu
- Yolda hareket eden kamyon
- Modern yönetim paneli
- Mobil uyumlu tasarım

## Oynanış

- Manuel ve otomatik fidan dikimi
- Otomatik ağaç kesimi
- Otomatik yeniden ekim
- Manuel kütük üretimi
- İşçi, lojman ve fabrika yükseltmeleri
- Kütükten kereste üretimi
- Kereste satışı
- Otomatik kayıt

## GitHub'a yükleme

ZIP içindeki `index.html`, `style.css`, `game.js` ve `README.md` dosyalarını mevcut dosyaların üzerine yükle.


## v0.5 düzeltmesi

Önceki CSS tabanlı animasyonların bazı tarayıcılarda sabit görünmesi sorunu giderildi.

Bu sürümde hareketler `requestAnimationFrame` kullanan JavaScript sistemiyle çalışır:

- Kamyon gerçekten yol boyunca hareket eder.
- İşçiler harita üzerinde dolaşır.
- Kütükler bant üzerinde ilerler ve döner.
- Testere sürekli döner.
- Fabrika dumanı yükselir.
- Makine içindeki kütük ilerler.

Haritanın sol altında “Canlı animasyon sistemi aktif” yazısı görünür.


## v0.6 orman ilerleme görünümü

Orman arazilerindeki üretim aşamaları artık açıkça görünür:

1. Fidan
2. Büyüyen ağaç
3. Olgun ve kesime hazır ağaç
4. Kesilmiş kütükler
5. Yeniden dikilen fidan

Kesimden sonra kütükler yaklaşık 3 saniye arazide görünür. Sonra otomatik üretim açıksa işçiler yeniden fidan diker.


## v0.7 canlı üretim akışı

- İşçiler rastgele dolaşmak yerine görev verilen araziye gider.
- İşçi araziye vardığında “Fidan dikiliyor” veya “Ağaç kesiliyor” göstergesi çıkar.
- Fidan dikildikten sonra ağaç zamanla büyür.
- Ağaç kesime hazır olduğunda işçi tekrar araziye gider.
- Kesim tamamlandığında forklift fabrikadan çıkar.
- Forklift kesilen kütüğü alır ve fabrikaya götürür.
- Kütük sayısı, forklift fabrikaya ulaştığında artar.
- Otomatik üretimde bu döngü sürekli tekrar eder.


## v0.8 görev ayrımı

- İşçiler yalnızca orman arazisi sınırları içinde hareket eder.
- İşçiler fabrikaya veya depoya gitmez.
- İşçilerin görevleri sadece fidan dikmek ve olgun ağacı kesmektir.
- Kesilen kütükler arazide forklift bekler.
- Forklift fabrikadan çıkar, ilgili araziye gider ve kütüğü yükler.
- Forklift kütüğü fabrikaya götürdüğünde kütük stoğu artar.
- Haritada orman işçi bölgesi ve forklift taşıma hattı görsel olarak ayrılmıştır.


## v0.9 bilgi ekranı

- Yeni sürüm yayınlandığında oyuncunun karşısına “Bilgi Ekranı” açılır.
- Güncelleme maddeleri kategori bazlı listelenir.
- Orman, fidan, forklift, fabrika ve arayüz için ayrı ikonlar kullanılır.
- Her güncelleme kategorisi farklı renk ve çerçeveye sahiptir.
- Oyuncu “Okudum” düğmesine bastığında ekran kapanır.
- Aynı sürüm için bilgi ekranı yalnızca bir kez gösterilir.
- Yeni sürümlerde sürüm numarası değiştirilerek ekran tekrar gösterilebilir.


## v1.0 otomatik fabrika ve firma talepleri

- Kereste fabrikasına otomatik üretim aç/kapat düğmesi eklendi.
- Birden fazla kütük üretim sırasına alınabilir.
- Fabrika sıradaki kütükleri tek tek işler.
- Otomatik üretim açıkken depodaki uygun kütükler sıraya otomatik eklenir.
- Aynı anda 6 firma talebi gösterilir.
- Firma talepleri 1–5 kereste arasındadır.
- Firma örnekleri:
  - Master Dekorasyon
  - Hazer Ahşap
  - Altın Ahşap İşleme
  - Doruk Mobilya
  - Marmara Dekor
  - Atlas Yapı Ahşap
- Stok yeterliyse firma ürünü otomatik satın alır.
- Stok yoksa firma süre bitene kadar bekler.
- Süresi dolan firma ayrılır ve yerine yeni firma gelir.
- Her firmanın fiyatı, miktarı ve kalan süresi farklı olabilir.


## v1.1 çift ürün satış sistemi

- Firmalar artık hem kütük hem de kereste talep edebilir.
- Kütük talebi, forklift ürünü fabrikaya teslim ettikten sonra stoktan karşılanır.
- Kereste talebi, fabrika üretimi tamamlandıktan sonra stoktan karşılanır.
- Firma kartında ürün türü açıkça gösterilir.
- Kütük fiyatları keresteden daha düşüktür.
- Stok yoksa firma bekler.
- Süre dolarsa firma ayrılır ve yerine yeni firma gelir.
