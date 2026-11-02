# SEO / GEO / ASO: konsolda elle yapılacaklar

Kodla yapılamayan adımlar. Sıra önemli: 1 ve 2 deploy'dan hemen sonra, 3–5 bir sonraki sürümle, 6–9 istediğin zaman.

## 1. Google Search Console

1. https://search.google.com/search-console → **Mülk ekle** → **Alan** (Domain) → `myanimedex.com`.
2. Verdiği TXT kaydını alan adının DNS'ine ekle (Netlify DNS kullanıyorsan Netlify > Domains > DNS records), **Doğrula**.
3. **Site haritaları** → `https://myanimedex.com/sitemap.xml` gönder.
4. **URL denetimi** → ana sayfa, `/tr`, `/jp`, `/id`, `/anime/` için **Dizine eklenmesini iste**.
5. 1–2 hafta sonra **Sayfalar** raporunda "Tarandı, dizine eklenmedi" listesine bak (anime sayfaları buraya düşerse haber ver).

## 2. Bing Webmaster Tools (ChatGPT araması Bing dizinini kullanır)

1. https://www.bing.com/webmasters → **Import from Google Search Console** (1. adım bittiyse tek tık).
2. **Sitemaps** → `https://myanimedex.com/sitemap.xml`.

## 3. Android App Links

`web/.well-known/assetlinks.json` iki SHA-256 ile yazıldı (2026-11-03): Play uygulama imzalama anahtarı (`29:AE:…`, Play'den yüklenen her sürüm, iç test dahil) ve yükleme anahtarı (`00:C7:…`, Play dışından kurulan EAS APK'ları).

1. Deploy sonrası Google'ın doğrulamasını test et: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://myanimedex.com&relation=delegate_permission/common.handle_all_urls → `com.myanimedex.app` görünmeli.
2. Yeni Android sürümü yüklendikten sonra: Play Console → **Deep links** sayfası `myanimedex.com` için "doğrulandı" göstermeli.

## 4. iOS Universal Links (bir sonraki iOS sürümüyle)

`app.json`'a `applinks:myanimedex.com` eklendi. Xcode'da otomatik imzalama açıksa ek iş yok:

1. Arşivlemeden önce bana söyle: `npx expo prebuild --platform ios` + Release simülatör build'i ile doğrularım (iOS dilleri, izin metinleri ve Associated Domains birlikte).
2. Xcode → Signing & Capabilities'te **Associated Domains** görünmeli. Hata verirse developer.apple.com → Identifiers → `com.myanimedex.app` → **Associated Domains** kutusunu işaretle.
3. Deploy sonrası Apple'ın dosyayı görebildiğini test et: `https://app-site-association.cdn-apple.com/a/v1/myanimedex.com` JSON döndürmeli.

## 5. App Store Connect: metinler ve diller

Metinlerin hepsi `docs/store-listing.md`'de (karakter sınırları kontrol edildi).

1. Yeni sürümü (1.0.17) oluştur. Ad, alt başlık ve anahtar kelimeler sadece yeni sürüm gönderilirken değişebilir.
2. Sağ üst dil menüsünden **eksik 8 dili ekle**: Fransızca, İtalyanca, Lehçe, Vietnamca, Tayca, Endonezce, Arapça, Hintçe.
3. Her dilde: Ad, Alt başlık, Anahtar kelimeler, Tanıtım metni, Açıklama.
4. Kampanya ölçümü için: **Analytics > Acquisition > Campaigns > Generate a campaign link**. Linkteki `pt=` değerini (provider token) bana gönder; site linklerine eklerim.

## 6. Google Play Console: metinler

1. **Büyüme > Mağazadaki varlık > Ana mağaza girişi** → her dil için Uygulama adı, Kısa açıklama, Tam açıklama (`docs/store-listing.md`).
2. Play metinleri sürüm beklemeden yayına girer.

## 7. App Store In-App Event: Kış 2027 sezonu

Kış sezonu Ocak 2027 başında başlıyor; etkinlik en geç 14 gün önce onayda olmalı.

1. App Store Connect → **In-App Events** → yeni etkinlik, rozet **New Season**.
2. Ad (30): `Winter 2027 Anime Season`
3. Kısa açıklama (50): `Track every new anime airing this winter`
4. Uzun açıklama (120): `See the full winter schedule in your time zone, add new shows to your list and get a reminder when each episode airs.`
5. Görseller: 1920×1080 kart + 1080×1920 detay (istersen teaser'dan üretirim).
6. Tarih: 2027-01-01 – 2027-01-31, deep link: uygulamada takvim ekranı.

## 8. Google Play: Store Listing Experiment

1. **Büyüme > Mağaza girişi denemeleri** → yeni deneme, varsayılan giriş.
2. İlk test: **ilk ekran görüntüsü** (mevcut vs. "listeni 1 dakikada aktar" mesajlı yeni görsel). Hedef metrik: ilk kez yükleyenler, %50/%50, en az 7 gün.

## 9. Site dışı GEO (marka bilinirliği)

1. **AlternativeTo**: MyAnimeList, AniList ve Kitsu sayfalarında "Suggest alternative" → MyAnimeDex (metin: llms.txt'deki özet).
2. **Product Hunt**: lansmandan 3 hafta önce sayfa hazırla; oy değil geri bildirim iste.
3. **Reddit**: alt forumların self-promo kurallarına uyarak, geliştirici olduğunu belirterek paylaş.
4. **YouTube Shorts**: `teaser/out/` içindeki klipler; açıklamaya site linki.
