# Site dışı GEO: kopyala-yapıştır metin paketi

AI asistanları (ChatGPT, Perplexity, Gemini, Google AI Overviews) bir uygulama önerirken çoğunlukla üçüncü taraf kaynakları alıntılar: dizinler, Reddit, YouTube. Bu dosyadaki metinler o kaynaklarda MyAnimeDex'in aynı, doğru bilgiyle görünmesi için. Her yerde aynı ad (**MyAnimeDex**), aynı tek cümlelik tanım ve aynı linkler kullanılsın; tutarlılık AI'ın markayı tek bir varlık olarak tanımasını sağlar.

Linkler:
- Site: https://myanimedex.com
- App Store: https://apps.apple.com/app/id6758043488
- Google Play: https://play.google.com/store/apps/details?id=com.myanimedex.app

Tek cümlelik tanım (her yerde bunu kullan):

> MyAnimeDex is a free anime tracker for iPhone, iPad and Android: log every episode, see a weekly airing calendar in your time zone with episode reminders, and turn what you watch into ranked lists, stats and XP.

---

## 1. AlternativeTo

En yüksek etkili adım: "best MyAnimeList alternative" gibi sorguların neredeyse tamamı AlternativeTo'dan besleniyor.

1. https://alternativeto.net → hesap aç → **Add new app** (Add Software).
2. Alanlar:
   - **Name:** MyAnimeDex
   - **Website:** https://myanimedex.com
   - **Platforms:** iPhone, iPad, Android
   - **License:** Freemium (free with optional Premium)
   - **Categories / tags:** Anime / Manga Tracking, Episode Tracker, TV Show Tracker, Anime, Watchlist, Airing Calendar
   - **Short description:** Free anime tracker with an airing calendar, episode reminders and ranked lists. Import your MyAnimeList or AniList list in a minute.
   - **Description:**

```text
MyAnimeDex is a free anime tracker for iPhone, iPad and Android. Log every episode you watch, see a weekly airing calendar in your own time zone and get a reminder when your favorite anime airs.

- Import your list from MyAnimeList or AniList with statuses, progress and scores.
- Browse anime, the calendar and Arena without an account (guest mode).
- Ranked lists you can reorder, share and build together with friends.
- XP and ranks from Rookie to Kami, plus a leaderboard.
- Anime Arena: bracket battles in 20 categories.
- 15 languages, dark and light theme. Anime data comes from AniList.

Optional Premium adds My Stats, themes, For You+ recommendations, tags and notes, cloud backup and export, and removes ads.
```

3. Uygulama onaylandıktan sonra şu sayfalarda **Suggest alternative → MyAnimeDex** ekle: MyAnimeList, AniList, Kitsu, LiveChart.me, Anime Tracker, Trackma.
4. Ekran görüntüleri: `web/ss/` (calendar.png, watching_dark.png, review_dark.png, profil_dark.png, search.png).

## 2. Product Hunt

Sadece bir kez yapılır; hazırlıksız başlatılırsa boşa gider. Lansmandan 3 hafta önce başla.

- **Name:** MyAnimeDex
- **Tagline (60):** `Track every anime episode, never miss an airing`
- **Description (260):**

```text
A free anime tracker for iPhone and Android. Log episodes with one tap, see a weekly airing calendar in your time zone with reminders, import your MyAnimeList or AniList list, and rank what you watch in shareable lists. 15 languages.
```

- **Topics:** iOS, Android, Entertainment, Anime (varsa), Productivity
- **Galeri (1270×760):** 1) ana sayfa hero, 2) takvim, 3) sıralı liste, 4) profil/XP, 5) import ekranı. Video: `teaser/out/promo_1920x1080.mp4` YouTube'a yükle, linkini ver.
- **Maker comment (ilk yorum):**

```text
Hi Product Hunt! I'm Hasan, a solo developer and a big anime fan.

I built MyAnimeDex because I wanted one app that remembers which episode I'm on, tells me when the next one airs in my own time zone, and lets me rank and share what I've watched. When the Jikan API shut down I moved everything to AniList, and added a one-minute import from MyAnimeList and AniList so nobody has to start their list from scratch.

What's free: tracking, the airing calendar, episode reminders, lists and the Arena brackets. Premium is optional.

I'd love your feedback, especially on the calendar and the import. What does your current anime tracking setup look like?
```

- **Zamanlama:** Salı–Perşembe, 00:01 Pacific (Türkiye saatiyle 10:01). Lansman günü tüm gün yorumlara yanıt ver.
- **Hazırlık (3 hafta):** Product Hunt hesabını şimdiden aç ve birkaç ürüne yorum yap (yeni hesapların oyları daha az sayılır). Instagram takipçilerine ve uygulama içindeki kullanıcılara "geri bildirim ver" diye duyur; **oy isteme** (kural ihlali).

## 3. Reddit

Reddit, Perplexity ve ChatGPT'nin en çok alıntıladığı kaynaklardan biri. Ama r/anime ve büyük anime forumları kendi uygulamanı tanıtmayı yasaklar; yasaklı yerde paylaşım hesabı da markayı da yakar.

Uygun yerler (her paylaşımdan önce forumun kurallarını yeniden oku):
- **r/SideProject**, **r/IndieDev**, **r/iosapps**, **r/androidapps**: geliştirici olarak tanıtım serbest.
- **r/anime**, **r/AnimeSuggest**, **r/MyAnimeList**: tanıtım yapma. Sadece biri doğrudan "MAL alternatifi / takip uygulaması" sorarsa, geliştirici olduğunu belirterek yanıt ver.

r/SideProject / r/iosapps taslağı:

```text
Title: I built a free anime tracker with an airing calendar in your time zone (iOS + Android)

Hi! Solo dev here. MyAnimeDex is an anime tracker I built because I wanted one app for all of this:

- one tap to log an episode; shows move to Completed on their own
- weekly airing calendar in your own time zone + reminders when your favorites air
- import your MyAnimeList or AniList list in about a minute
- ranked lists you can share or build with friends
- works without an account if you just want to browse

It's free (ads; optional Premium removes them and adds stats/themes). 15 languages.

iOS: https://apps.apple.com/app/id6758043488
Android: https://play.google.com/store/apps/details?id=com.myanimedex.app

I'd really appreciate feedback on the calendar and the import flow. Happy to answer anything about the build too (Expo + Supabase + AniList).
```

## 4. YouTube Shorts

Gemini ve Google AI Overviews YouTube'u sık alıntılıyor; açıklama metni de indekslenir.

Hazır videolar: `teaser/out/promo_1080x1920.mp4`, `teaser/out/store_preview_886x1920.mp4`, `teaser/out/review/` klipleri.

Her video için başlık + açıklama:

1. **Never miss a new anime episode (airing calendar in your time zone)**: takvim klibi
2. **Move your MyAnimeList list to a new app in 60 seconds**: import ekranı kaydı (yeni çekim gerekir)
3. **Rank your favorite anime and share the list**: liste klibi
4. **Anime Arena: pick your all-time best anime in a bracket**: Arena kaydı
5. **Can't decide what to watch? Roll the dice**: zar klibi

Açıklama şablonu:

```text
MyAnimeDex is a free anime tracker for iPhone, iPad and Android: log every episode, see a weekly airing calendar in your time zone with episode reminders, and rank what you watch.

iPhone / iPad: https://apps.apple.com/app/id6758043488
Android: https://play.google.com/store/apps/details?id=com.myanimedex.app
Website: https://myanimedex.com

#anime #animetracker #myanimelist #anilist #animeapp
```

Kanal adı ve profil: **MyAnimeDex**, profil linki site. Kanalı açınca linkini bana ver; sitedeki `sameAs` listesine eklerim.

## 5. Sonra: marka varlığı

- **Wikidata:** uygulama için bir öğe (instance of: mobile app, website, developer, platform). ChatGPT ve Gemini bilgi grafiğini kullanıyor. Wikipedia sayfası için henüz erken (bağımsız kaynak gerektirir).
- **Instagram / TikTok biyografisi:** aynı tek cümlelik tanım + site linki.
- Yeni bir profil açtığında (YouTube, TikTok, Product Hunt) linkini bana ver; sitedeki `sameAs` listesine ekleyeyim.
