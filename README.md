# Ahşap Tycoon v0.5

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
