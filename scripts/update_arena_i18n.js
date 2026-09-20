const fs = require('fs');

const file = 'lib/i18n.ts';
let content = fs.readFileSync(file, 'utf8');

const translations = {
    en: "        arena: { title: 'Anime Arena', choose_category: 'Choose Category', choose_size: 'Choose Size', start_button: 'Start Battle!', your_winner: 'YOUR WINNER!', share: 'Share Result', go_home: 'Go Home', cat_all_time: 'ALL TIME', cat_shounen: 'SHOUNEN', cat_isekai: 'ISEKAI', cat_romance: 'ROMANCE', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', game: 'Arena', result: 'Result' },",
    tr: "        arena: { title: 'Anime Arena', choose_category: 'Kategori Seç', choose_size: 'Soru Sayısı Seç', start_button: 'Savaşı Başlat!', your_winner: 'SENİN KAZANANIN!', share: 'Sonucu Paylaş', go_home: 'Anasayfaya Dön', cat_all_time: 'TÜM ZAMANLAR', cat_shounen: 'SHOUNEN', cat_isekai: 'ISEKAI', cat_romance: 'ROMANTİZM', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', game: 'Arena', result: 'Sonuç' },",
    ja: "        arena: { title: 'アニメアリーナ', choose_category: 'カテゴリーを選択', choose_size: 'サイズを選択', start_button: 'バトル開始！', your_winner: 'あなたの勝者！', share: '結果をシェア', go_home: 'ホームへ', cat_all_time: '歴代', cat_shounen: '少年', cat_isekai: '異世界', cat_romance: '恋愛', cat_waifu: 'ワイフ', cat_husbando: '夫', game: 'アリーナ', result: '結果' },",
    ru: "        arena: { title: 'Аниме Арена', choose_category: 'Выберите Категорию', choose_size: 'Выберите Размер', start_button: 'Начать Битву!', your_winner: 'ВАШ ПОБЕДИТЕЛЬ!', share: 'Поделиться Результатом', go_home: 'На Главную', cat_all_time: 'ВСЕ ВРЕМЕНА', cat_shounen: 'СЁНЭН', cat_isekai: 'ИСЭКАЙ', cat_romance: 'РОМАНТИКА', cat_waifu: 'ВАЙФУ', cat_husbando: 'ХАСБАНДО', game: 'Арена', result: 'Результат' },",
    de: "        arena: { title: 'Anime Arena', choose_category: 'Kategorie wählen', choose_size: 'Größe wählen', start_button: 'Kampf beginnen!', your_winner: 'DEIN GEWINNER!', share: 'Ergebnis teilen', go_home: 'Zur Startseite', cat_all_time: 'ALLE ZEITEN', cat_shounen: 'SHOUNEN', cat_isekai: 'ISEKAI', cat_romance: 'ROMANTIK', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', game: 'Arena', result: 'Ergebnis' },",
    ar: "        arena: { title: 'حلبة الأنمي', choose_category: 'اختر الفئة', choose_size: 'اختر الحجم', start_button: 'ابدأ المعركة!', your_winner: 'الفائز الخاص بك!', share: 'مشاركة النتيجة', go_home: 'الرئيسية', cat_all_time: 'كل الأوقات', cat_shounen: 'شونين', cat_isekai: 'إيسيكاي', cat_romance: 'رومانسية', cat_waifu: 'وايفو', cat_husbando: 'هوسباندو', game: 'حلبة', result: 'النتيجة' },",
    es: "        arena: { title: 'Anime Arena', choose_category: 'Elegir Categoría', choose_size: 'Elegir Tamaño', start_button: '¡Comenzar Batalla!', your_winner: '¡TU GANADOR!', share: 'Compartir Resultado', go_home: 'Inicio', cat_all_time: 'TODOS LOS TIEMPOS', cat_shounen: 'SHOUNEN', cat_isekai: 'ISEKAI', cat_romance: 'ROMANCE', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', game: 'Arena', result: 'Resultado' },",
    pt: "        arena: { title: 'Anime Arena', choose_category: 'Escolher Categoria', choose_size: 'Escolher Tamanho', start_button: 'Iniciar Batalha!', your_winner: 'SEU VENCEDOR!', share: 'Compartilhar Resultado', go_home: 'Início', cat_all_time: 'TODOS OS TEMPOS', cat_shounen: 'SHOUNEN', cat_isekai: 'ISEKAI', cat_romance: 'ROMANCE', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', game: 'Arena', result: 'Resultado' },",
    id: "        arena: { title: 'Arena Anime', choose_category: 'Pilih Kategori', choose_size: 'Pilih Ukuran', start_button: 'Mulai Pertarungan!', your_winner: 'PEMENANGMU!', share: 'Bagikan Hasil', go_home: 'Beranda', cat_all_time: 'SEPANJANG MASA', cat_shounen: 'SHOUNEN', cat_isekai: 'ISEKAI', cat_romance: 'ROMANSA', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', game: 'Arena', result: 'Hasil' },",
    hi: "        arena: { title: 'एनीमे एरिना', choose_category: 'श्रेणी चुनें', choose_size: 'आकार चुनें', start_button: 'लड़ाई शुरू करें!', your_winner: 'आपका विजेता!', share: 'परिणाम साझा करें', go_home: 'होम', cat_all_time: 'हर समय', cat_shounen: 'शोनेन', cat_isekai: 'इसेकाई', cat_romance: 'रोमांस', cat_waifu: 'वाइफू', cat_husbando: 'हस्बैंडो', game: 'एरिना', result: 'परिणाम' }"
};

for (const [lang, addStr] of Object.entries(translations)) {
    const searchStr = `    ${lang}: {\n`;
    const replaceStr = `    ${lang}: {\n${addStr}\n`;
    if (content.includes(searchStr) && !content.includes("arena: {")) {
        content = content.replace(searchStr, replaceStr);
    }
}

fs.writeFileSync(file, content);
console.log('Done updating i18n.ts for Arena');
