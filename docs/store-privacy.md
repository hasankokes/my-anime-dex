# Mağaza gizlilik beyanları — 1.0.16

Bu sürümle gelen veri akışları: PostHog analitiği (yeni), yerel bildirimler, telefon takvimine ekleme, bulut yedekleme, MyAnimeList/AniList içe aktarma.
Aşağıdaki cevaplar koddan ve son release APK'nın izin listesinden çıkarıldı. Gizlilik politikası (`web/privacy*.html` ve uygulama içi `privacy` metni) bu cevaplarla birebir aynı şeyi söylüyor; birini değiştirirsen ötekini de güncelle.

Gizlilik politikası URL'si: **https://myanimedex.com/privacy** (adres aynı, içerik güncellendi — formları göndermeden önce web sitesini yayına al).
Hesap silme URL'si: **https://myanimedex.com/delete-account** (değişmedi).

---

## Google Play Console

### 1. Policy → App content → Data safety (güncellenmeli)

Genel sorular:

| Soru | Cevap |
|---|---|
| Uygulama gerekli kullanıcı veri türlerinden herhangi birini topluyor veya paylaşıyor mu? | Evet |
| Tüm veriler aktarım sırasında şifreleniyor mu? | Evet |
| Kullanıcılar verilerinin silinmesini isteyebiliyor mu? | Evet (uygulama içi + yukarıdaki URL) |
| Hesap oluşturma | Kullanıcı adı/şifre ile + OAuth (Google, Apple). Hesap zorunlu değil (misafir modu) |

Veri türleri (✔ = işaretle):

| Kategori → Tür | Toplanıyor | Paylaşılıyor | İsteğe bağlı mı | Amaçlar | Kaynak |
|---|---|---|---|---|---|
| Kişisel bilgiler → E-posta adresi | ✔ | – | İsteğe bağlı | Uygulama işlevselliği, Hesap yönetimi | Supabase Auth |
| Kişisel bilgiler → Kullanıcı kimlikleri | ✔ | – | İsteğe bağlı | Uygulama işlevselliği, Analiz, Hesap yönetimi | Kullanıcı adı, hesap ID'si (Supabase, PostHog, RevenueCat) |
| Finansal bilgiler → Satın alma geçmişi | ✔ | – | İsteğe bağlı | Uygulama işlevselliği | RevenueCat |
| Fotoğraflar ve videolar → Fotoğraflar | ✔ | – | İsteğe bağlı | Uygulama işlevselliği | Profil fotoğrafı |
| Uygulama etkinliği → Uygulama etkileşimleri | ✔ | ✔ | Zorunlu | Analiz, Reklam veya pazarlama | PostHog (toplama), AdMob (paylaşım) |
| Uygulama etkinliği → Kullanıcı tarafından oluşturulan diğer içerikler | ✔ | – | İsteğe bağlı | Uygulama işlevselliği | Listeler, puanlar, yorumlar, notlar, etiketler, yedekler |
| Konum → Yaklaşık konum | ✔ | ✔ | Zorunlu | Reklam veya pazarlama, Dolandırıcılık önleme | AdMob (IP adresinden) |
| Uygulama bilgileri ve performansı → Kilitlenme günlükleri | ✔ | ✔ | Zorunlu | Analiz | AdMob SDK |
| Uygulama bilgileri ve performansı → Teşhis | ✔ | ✔ | Zorunlu | Analiz, Reklam veya pazarlama | AdMob SDK |
| Cihaz veya diğer kimlikler | ✔ | ✔ | Zorunlu | Reklam veya pazarlama, Analiz, Dolandırıcılık önleme | Reklam kimliği (AdMob), PostHog anonim kimliği |

İşaretlenmeyecekler: ad, adres, telefon, kesin konum, kişiler, takvim (uygulama takvimi okumuyor/yüklemiyor, yalnızca cihazda etkinlik ekliyor), mesajlar, sesler, sağlık, web geçmişi, arama geçmişi (aramalar saklanmıyor).

> "Paylaşılıyor" yalnızca AdMob verileri için işaretli. Supabase, RevenueCat ve PostHog Google'ın tanımına göre "hizmet sağlayıcı" sayıldığı için paylaşım değil.

### 2. Policy → App content → diğer bölümler

| Bölüm | Ne yapılacak |
|---|---|
| Privacy policy | URL aynı kalır, sadece sitenin güncel olduğundan emin ol |
| Ads | "Evet, reklam içeriyor" (değişmedi) |
| Advertising ID | "Evet" → Amaç: Reklam veya pazarlama (değişmedi) |
| Data deletion / Account deletion | Değişmedi |
| App access | Misafir modu sayesinde çoğu ekran girişsiz açılıyor; yazma işlemleri (liste, yorum) için mevcut test hesabı kalsın |
| Target audience / Content rating | Değişmedi |
| İzin beyanları | **Gerekmiyor.** Son APK'da `READ_MEDIA_*`, `SCHEDULE_EXACT_ALARM`, `RECORD_AUDIO` yok. Takvim ve bildirim izinleri ayrı form istemiyor |

### 3. Sürüm (Production → Create new release)

1. EAS'ten gelen `.aab` dosyasını yükle (versionCode 19).
2. **App Bundle Explorer → bu sürüm → Downloads → "Deobfuscation file" → `mapping.txt` yükle.** Dosya EAS build sayfasında "Build artifacts" altında. R8 bu sürümde açıldı; yüklemezsen çökme raporları okunamaz.
3. Sürüm notları: `STORE_RELEASE_NOTES.md` içindeki tek blok.
4. Kademeli yayın: %10–20 ile başla, birkaç gün çökme oranını izle, sonra artır.

---

## App Store Connect

### 1. App Privacy (güncellenmeli)

"Data Types" ekranında aşağıdakileri seç. Her tür için sonraki ekranda amaç, "Linked to the user" ve "Used for tracking" sorulur.

| Kategori → Tür | Amaçlar | Kullanıcıya bağlı mı | Takip için mi | Kaynak |
|---|---|---|---|---|
| Contact Info → Email Address | App Functionality | Evet | Hayır | Supabase Auth |
| User Content → Photos or Videos | App Functionality | Evet | Hayır | Profil fotoğrafı |
| User Content → Other User Content | App Functionality | Evet | Hayır | Yorumlar, listeler, notlar, yedekler |
| Identifiers → User ID | App Functionality, Analytics | Evet | Hayır | Hesap ID'si, kullanıcı adı |
| Identifiers → Device ID | Third-Party Advertising, Analytics | Hayır | **Evet** | IDFA (AdMob, ATT izniyle) |
| Purchases → Purchase History | App Functionality | Evet | Hayır | RevenueCat |
| Usage Data → Product Interaction | Analytics, Third-Party Advertising | Evet | **Evet** | PostHog (bağlı), AdMob (takip) |
| Usage Data → Advertising Data | Third-Party Advertising | Hayır | **Evet** | AdMob |
| Location → Coarse Location | Third-Party Advertising | Hayır | **Evet** | AdMob (IP adresinden) |
| Diagnostics → Crash Data | Analytics | Hayır | Hayır | AdMob SDK |
| Diagnostics → Performance Data | Analytics | Hayır | Hayır | AdMob SDK |
| Diagnostics → Other Diagnostic Data | Analytics | Hayır | Hayır | AdMob SDK |

Seçilmeyecekler: Name, Phone, Physical Address, Precise Location, Contacts, Health, Financial Info (ödeme bilgisi Apple'da kalıyor), Browsing/Search History, Sensitive Info, Audio, Gameplay Content.

> Takvim ve bildirimler cihazda kalıyor, sunucuya veri gitmiyor; App Privacy'de beyan gerektirmiyor. Uygulamanın gösterdiği izin metinleri (`NSCalendarsUsageDescription` vb.) build'in içinde.

### 2. Diğer alanlar

| Alan | Ne yapılacak |
|---|---|
| App Information → Privacy Policy URL | Aynı URL, değişiklik yok |
| Sürüm 1.0.16 → What's New / Promotional Text | `STORE_RELEASE_NOTES.md`. İstersen What's New'in son satırına "Gizlilik politikamızı güncelledik." ekle |
| App Review Information | Mevcut test hesabı kalsın; notlara "Uygulama misafir modunda açılır, yazma işlemleri için giriş gerekir" yazabilirsin |
| Export Compliance | Artık sorulmaz: `app.json` → `ios.config.usesNonExemptEncryption: false` (yalnızca HTTPS) |
| Age Rating | Apple yeni soruları gösterirse: kullanıcı içeriği (yorumlar) var, kullanıcılar arası mesajlaşma yok, reklam var |
| Phased Release | Aç (7 günde kademeli) |
