-- Anime / manga style banner patterns (drawn by components/Profile/BannerPattern.tsx; older app versions show the plain gradient)
update public.cosmetics set payload = payload || '{"pattern":"stars","pattern_color":"#FFFFFF","pattern_opacity":0.9}'::jsonb where id = 'banner_night';
update public.cosmetics set payload = payload || '{"pattern":"sakura","pattern_color":"#FFFFFF","pattern_opacity":0.75}'::jsonb where id = 'banner_sakura';
update public.cosmetics set payload = payload || '{"pattern":"shine","pattern_color":"#FFFFFF","pattern_opacity":0.3}'::jsonb where id = 'banner_sunset';
update public.cosmetics set payload = payload || '{"pattern":"halftone","pattern_color":"#FFFFFF","pattern_opacity":0.22}'::jsonb where id = 'banner_gold';

insert into public.cosmetics (id, type, name, payload, premium, sort) values
('banner_shonen', 'banner',
 '{"en":"Shōnen Spirit","tr":"Shōnen Ruhu","ja":"少年魂","ru":"Дух сёнэна","de":"Shōnen-Geist","ar":"روح الشونين","es":"Espíritu shōnen","pt":"Espírito shōnen","id":"Semangat Shōnen","hi":"शोनेन जोश"}',
 '{"colors":["#FDE047","#F97316","#B91C1C"],"pattern":"speedlines","pattern_color":"#FFFFFF","pattern_opacity":0.45}', true, 60),
('banner_manga', 'banner',
 '{"en":"Manga Page","tr":"Manga Sayfası","ja":"マンガのページ","ru":"Страница манги","de":"Mangaseite","ar":"صفحة مانغا","es":"Página de manga","pt":"Página de mangá","id":"Halaman Manga","hi":"मांगा पेज"}',
 '{"colors":["#111827","#374151","#6B7280"],"pattern":"halftone","pattern_color":"#FFFFFF","pattern_opacity":0.35}', true, 70),
('banner_neo_tokyo', 'banner',
 '{"en":"Neo Tokyo","tr":"Neo Tokyo","ja":"ネオ東京","ru":"Нео-Токио","de":"Neo-Tokio","ar":"نيو طوكيو","es":"Neo Tokio","pt":"Neo Tóquio","id":"Neo Tokyo","hi":"नियो टोक्यो"}',
 '{"colors":["#0F0326","#4C1D95","#BE185D"],"pattern":"synthwave","pattern_color":"#22D3EE","pattern_opacity":0.7}', true, 80),
('banner_seigaiha', 'banner',
 '{"en":"Ocean Waves","tr":"Okyanus Dalgası","ja":"青海波","ru":"Океанские волны","de":"Meereswellen","ar":"أمواج المحيط","es":"Olas del océano","pt":"Ondas do oceano","id":"Ombak Samudra","hi":"समुद्री लहरें"}',
 '{"colors":["#082F49","#0369A1","#0EA5E9"],"pattern":"seigaiha","pattern_color":"#E0F2FE","pattern_opacity":0.3}', true, 90),
('banner_yozakura', 'banner',
 '{"en":"Yozakura","tr":"Yozakura","ja":"夜桜","ru":"Ёдзакура","de":"Yozakura","ar":"يوزاكورا","es":"Yozakura","pt":"Yozakura","id":"Yozakura","hi":"योज़ाकुरा"}',
 '{"colors":["#1E1B4B","#701A75","#DB2777"],"pattern":"sakura","pattern_color":"#FBCFE8","pattern_opacity":0.85}', true, 100),
('banner_starfall', 'banner',
 '{"en":"Starfall","tr":"Yıldız Kayması","ja":"流れ星","ru":"Звездопад","de":"Sternschnuppen","ar":"شهب","es":"Lluvia de estrellas","pt":"Chuva de estrelas","id":"Hujan Bintang","hi":"टूटते तारे"}',
 '{"colors":["#020617","#312E81","#0EA5E9"],"pattern":"stars","pattern_color":"#FFFFFF","pattern_opacity":1}', true, 110),
('banner_isekai', 'banner',
 '{"en":"Isekai Portal","tr":"İsekai Portalı","ja":"異世界ゲート","ru":"Портал в исекай","de":"Isekai-Portal","ar":"بوابة إيسيكاي","es":"Portal isekai","pt":"Portal isekai","id":"Portal Isekai","hi":"इसेकाई पोर्टल"}',
 '{"colors":["#4C1D95","#2563EB","#06B6D4"],"pattern":"speedlines","pattern_color":"#E0E7FF","pattern_opacity":0.3}', true, 120),
('banner_aurora', 'banner',
 '{"en":"Northern Lights","tr":"Kuzey Işıkları","ja":"オーロラ","ru":"Северное сияние","de":"Nordlichter","ar":"الشفق القطبي","es":"Auroras boreales","pt":"Aurora boreal","id":"Cahaya Utara","hi":"उत्तरी रोशनी"}',
 '{"colors":["#022C22","#059669","#6366F1","#DB2777"],"pattern":"shine","pattern_color":"#FFFFFF","pattern_opacity":0.3}', true, 130),
('banner_pastel', 'banner',
 '{"en":"Pastel Dream","tr":"Pastel Rüya","ja":"パステルドリーム","ru":"Пастельная мечта","de":"Pastelltraum","ar":"حلم الباستيل","es":"Sueño pastel","pt":"Sonho pastel","id":"Mimpi Pastel","hi":"पेस्टल सपना"}',
 '{"colors":["#FBCFE8","#C4B5FD","#A5F3FC"],"pattern":"halftone","pattern_color":"#FFFFFF","pattern_opacity":0.45}', true, 140);
