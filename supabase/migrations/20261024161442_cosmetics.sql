/*
  # Personalization (Module 2, premium)

  1. cosmetics: server-managed catalog of app themes, avatar frames, profile banners and username
     colors. Adding a row adds an option to the app without a release; `active = false` hides it.
     payload by type:
       theme      {"dark": {colors...}, "light": {colors...}}  (ThemeContext color tokens, partial ok)
       frame      {"colors": ["#..", "#..", ..]}               (avatar ring gradient)
       banner     {"colors": ["#..", ..], "image_url"?: "..."} (profile header)
       name_color {"color": "#.."}
     name is {locale: label}; the app falls back to "en".
  2. profiles.cosmetics: the user's picks {"theme": id, "frame": id, "banner": id, "name_color": id}.
     profiles.top10: the "Top 10" showcase, up to 10 {anime_id, title, image}.
     Both are applied/shown only while the owner is premium (checked by the app with the
     server-owned is_pro), so they are kept when premium lapses and come back on renewal.
*/

CREATE TABLE IF NOT EXISTS public.cosmetics (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('theme', 'frame', 'banner', 'name_color')),
  name jsonb NOT NULL,
  payload jsonb NOT NULL,
  premium boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active cosmetics"
  ON public.cosmetics FOR SELECT
  TO anon, authenticated
  USING (active);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cosmetics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS top10 jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cosmetics_object_check CHECK (jsonb_typeof(cosmetics) = 'object'),
  ADD CONSTRAINT profiles_top10_check CHECK (jsonb_typeof(top10) = 'array' AND jsonb_array_length(top10) <= 10);

GRANT UPDATE (cosmetics, top10) ON public.profiles TO authenticated;

INSERT INTO public.cosmetics (id, type, name, payload, premium, sort) VALUES
  ('theme_sakura', 'theme', '{"en": "Sakura", "tr": "Sakura", "ja": "桜", "ru": "Сакура", "de": "Sakura", "ar": "ساكورا", "es": "Sakura", "pt": "Sakura", "id": "Sakura", "hi": "साकुरा"}'::jsonb, '{"dark": {"background": "#1A1016", "card": "#2A1A24", "text": "#FFFFFF", "subtext": "#C9A9BB", "border": "#3D2734", "primary": "#F472B6", "tabBar": "#140C11", "inputBg": "#2A1A24"}, "light": {"background": "#FFF5F8", "card": "#FFFFFF", "text": "#3B0A24", "subtext": "#9D5C7D", "border": "#F9D0E1", "primary": "#F472B6", "tabBar": "#FFFFFF", "inputBg": "#FCE7F0"}}'::jsonb, true, 10),
  ('theme_midnight', 'theme', '{"en": "Midnight", "tr": "Gece Mavisi", "ja": "ミッドナイト", "ru": "Полночь", "de": "Mitternacht", "ar": "منتصف الليل", "es": "Medianoche", "pt": "Meia-noite", "id": "Tengah Malam", "hi": "मिडनाइट"}'::jsonb, '{"dark": {"background": "#0B1120", "card": "#16213A", "text": "#F1F5F9", "subtext": "#94A3B8", "border": "#24324F", "primary": "#60A5FA", "tabBar": "#080D1A", "inputBg": "#16213A"}, "light": {"background": "#F0F5FF", "card": "#FFFFFF", "text": "#0F172A", "subtext": "#64748B", "border": "#DBE4F5", "primary": "#60A5FA", "tabBar": "#FFFFFF", "inputBg": "#E5EDFB"}}'::jsonb, true, 20),
  ('theme_matcha', 'theme', '{"en": "Matcha", "tr": "Matcha", "ja": "抹茶", "ru": "Матча", "de": "Matcha", "ar": "ماتشا", "es": "Matcha", "pt": "Matcha", "id": "Matcha", "hi": "माचा"}'::jsonb, '{"dark": {"background": "#0E140F", "card": "#1A251C", "text": "#F0FDF4", "subtext": "#A3B8A8", "border": "#2A3A2D", "primary": "#4ADE80", "tabBar": "#0A100B", "inputBg": "#1A251C"}, "light": {"background": "#F4FAF2", "card": "#FFFFFF", "text": "#14281A", "subtext": "#5B7462", "border": "#D6E8D3", "primary": "#4ADE80", "tabBar": "#FFFFFF", "inputBg": "#E6F2E3"}}'::jsonb, true, 30),
  ('theme_crimson', 'theme', '{"en": "Crimson", "tr": "Kızıl", "ja": "クリムゾン", "ru": "Багрянец", "de": "Karmesin", "ar": "قرمزي", "es": "Carmesí", "pt": "Carmesim", "id": "Merah Tua", "hi": "क्रिमसन"}'::jsonb, '{"dark": {"background": "#140A0A", "card": "#241414", "text": "#FFF1F1", "subtext": "#C4A1A1", "border": "#3A2222", "primary": "#F87171", "tabBar": "#0F0707", "inputBg": "#241414"}, "light": {"background": "#FFF6F5", "card": "#FFFFFF", "text": "#3A0C0C", "subtext": "#8F5A5A", "border": "#F5D5D2", "primary": "#F87171", "tabBar": "#FFFFFF", "inputBg": "#FBE6E4"}}'::jsonb, true, 40),
  ('theme_violet', 'theme', '{"en": "Violet", "tr": "Mor", "ja": "バイオレット", "ru": "Фиалка", "de": "Violett", "ar": "بنفسجي", "es": "Violeta", "pt": "Violeta", "id": "Ungu", "hi": "वायलेट"}'::jsonb, '{"dark": {"background": "#120E1C", "card": "#1F1830", "text": "#F5F3FF", "subtext": "#A8A0C2", "border": "#2F2648", "primary": "#A78BFA", "tabBar": "#0D0A15", "inputBg": "#1F1830"}, "light": {"background": "#F7F5FF", "card": "#FFFFFF", "text": "#1E1338", "subtext": "#6B6290", "border": "#E2DCF7", "primary": "#A78BFA", "tabBar": "#FFFFFF", "inputBg": "#ECE8FB"}}'::jsonb, true, 50),
  ('frame_amethyst', 'frame', '{"en": "Amethyst", "tr": "Ametist", "ja": "アメジスト", "ru": "Аметист", "de": "Amethyst", "ar": "جمشت", "es": "Amatista", "pt": "Ametista", "id": "Kecubung", "hi": "नीलम"}'::jsonb, '{"colors": ["#C084FC", "#A855F7", "#7E22CE"]}'::jsonb, true, 10),
  ('frame_gold', 'frame', '{"en": "Gold", "tr": "Altın", "ja": "ゴールド", "ru": "Золото", "de": "Gold", "ar": "ذهبي", "es": "Oro", "pt": "Ouro", "id": "Emas", "hi": "गोल्ड"}'::jsonb, '{"colors": ["#FDE68A", "#F59E0B", "#B45309"]}'::jsonb, true, 20),
  ('frame_sakura', 'frame', '{"en": "Sakura", "tr": "Sakura", "ja": "桜", "ru": "Сакура", "de": "Sakura", "ar": "ساكورا", "es": "Sakura", "pt": "Sakura", "id": "Sakura", "hi": "साकुरा"}'::jsonb, '{"colors": ["#FBCFE8", "#F472B6", "#BE185D"]}'::jsonb, true, 30),
  ('frame_aurora', 'frame', '{"en": "Aurora", "tr": "Aurora", "ja": "オーロラ", "ru": "Аврора", "de": "Aurora", "ar": "الشفق", "es": "Aurora", "pt": "Aurora", "id": "Aurora", "hi": "ऑरोरा"}'::jsonb, '{"colors": ["#5EEAD4", "#60A5FA", "#A78BFA"]}'::jsonb, true, 40),
  ('frame_flame', 'frame', '{"en": "Flame", "tr": "Alev", "ja": "フレイム", "ru": "Пламя", "de": "Flamme", "ar": "لهب", "es": "Llama", "pt": "Chama", "id": "Api", "hi": "ज्वाला"}'::jsonb, '{"colors": ["#FDBA74", "#F97316", "#DC2626"]}'::jsonb, true, 50),
  ('banner_sunset', 'banner', '{"en": "Sunset", "tr": "Gün Batımı", "ja": "夕焼け", "ru": "Закат", "de": "Sonnenuntergang", "ar": "غروب", "es": "Atardecer", "pt": "Pôr do sol", "id": "Senja", "hi": "सूर्यास्त"}'::jsonb, '{"colors": ["#F97316", "#DB2777", "#7C3AED"]}'::jsonb, true, 10),
  ('banner_night', 'banner', '{"en": "Night Sky", "tr": "Gece Göğü", "ja": "夜空", "ru": "Ночное небо", "de": "Nachthimmel", "ar": "سماء الليل", "es": "Cielo nocturno", "pt": "Céu noturno", "id": "Langit Malam", "hi": "रात का आसमान"}'::jsonb, '{"colors": ["#0F172A", "#1E3A8A", "#7C3AED"]}'::jsonb, true, 20),
  ('banner_sakura', 'banner', '{"en": "Cherry Blossom", "tr": "Kiraz Çiçeği", "ja": "桜吹雪", "ru": "Цветение сакуры", "de": "Kirschblüte", "ar": "زهر الكرز", "es": "Flor de cerezo", "pt": "Flor de cerejeira", "id": "Bunga Sakura", "hi": "चेरी ब्लॉसम"}'::jsonb, '{"colors": ["#FBCFE8", "#F9A8D4", "#C084FC"]}'::jsonb, true, 30),
  ('banner_forest', 'banner', '{"en": "Forest", "tr": "Orman", "ja": "森", "ru": "Лес", "de": "Wald", "ar": "غابة", "es": "Bosque", "pt": "Floresta", "id": "Hutan", "hi": "जंगल"}'::jsonb, '{"colors": ["#064E3B", "#059669", "#A3E635"]}'::jsonb, true, 40),
  ('banner_gold', 'banner', '{"en": "Golden Hour", "tr": "Altın Saat", "ja": "ゴールデンアワー", "ru": "Золотой час", "de": "Goldene Stunde", "ar": "الساعة الذهبية", "es": "Hora dorada", "pt": "Hora dourada", "id": "Jam Emas", "hi": "गोल्डन आवर"}'::jsonb, '{"colors": ["#78350F", "#D97706", "#FDE68A"]}'::jsonb, true, 50),
  ('name_gold', 'name_color', '{"en": "Gold", "tr": "Altın", "ja": "ゴールド", "ru": "Золото", "de": "Gold", "ar": "ذهبي", "es": "Oro", "pt": "Ouro", "id": "Emas", "hi": "गोल्ड"}'::jsonb, '{"color": "#FACC15"}'::jsonb, true, 10),
  ('name_pink', 'name_color', '{"en": "Pink", "tr": "Pembe", "ja": "ピンク", "ru": "Розовый", "de": "Pink", "ar": "وردي", "es": "Rosa", "pt": "Rosa", "id": "Merah Muda", "hi": "गुलाबी"}'::jsonb, '{"color": "#F472B6"}'::jsonb, true, 20),
  ('name_sky', 'name_color', '{"en": "Sky", "tr": "Gök Mavisi", "ja": "スカイ", "ru": "Небесный", "de": "Himmelblau", "ar": "سماوي", "es": "Cielo", "pt": "Céu", "id": "Biru Langit", "hi": "आसमानी"}'::jsonb, '{"color": "#38BDF8"}'::jsonb, true, 30),
  ('name_mint', 'name_color', '{"en": "Mint", "tr": "Nane", "ja": "ミント", "ru": "Мятный", "de": "Mint", "ar": "نعناعي", "es": "Menta", "pt": "Menta", "id": "Mint", "hi": "पुदीना"}'::jsonb, '{"color": "#4ADE80"}'::jsonb, true, 40),
  ('name_violet', 'name_color', '{"en": "Violet", "tr": "Mor", "ja": "バイオレット", "ru": "Фиолетовый", "de": "Violett", "ar": "بنفسجي", "es": "Violeta", "pt": "Violeta", "id": "Ungu", "hi": "बैंगनी"}'::jsonb, '{"color": "#A78BFA"}'::jsonb, true, 50),
  ('name_coral', 'name_color', '{"en": "Coral", "tr": "Mercan", "ja": "コーラル", "ru": "Коралловый", "de": "Koralle", "ar": "مرجاني", "es": "Coral", "pt": "Coral", "id": "Koral", "hi": "मूँगा"}'::jsonb, '{"color": "#FB7185"}'::jsonb, true, 60)
ON CONFLICT (id) DO NOTHING;
