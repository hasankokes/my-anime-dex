const fs = require('fs');
const path = require('path');

const i18nPath = path.resolve(__dirname, '../lib/i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const arenaLines = {
  en: "        arena: { title: 'Anime Arena', choose_category: 'Choose Category', choose_size: 'Choose Size', start_button: 'Start Battle!', your_winner: 'YOUR WINNER!', share: 'Share Result', go_home: 'Go Home', game: 'Arena', result: 'Result', round: 'Round', match: 'Match', go_back: 'Go Back', my_champion: '{name} is my champion!', final: 'FINAL BATTLE', semi_final: 'SEMI FINAL', quarter_final: 'QUARTER FINAL', cat_all_time: 'ALL TIME BEST', cat_movie: 'BEST MOVIES', cat_shounen: 'SHOUNEN', cat_action: 'ACTION & FIGHTS', cat_isekai: 'ISEKAI', cat_romance: 'ROMANCE', cat_comedy: 'COMEDY', cat_horror: 'HORROR & THRILLER', cat_drama: 'DRAMA & TEARS', cat_seinen: 'SEINEN & DARK', cat_worst_sequels: 'WORST SEQUELS', cat_waifu: 'BEST WAIFU', cat_husbando: 'BEST HUSBANDO', total_played: 'Total Played', your_history: 'Your Results', community_winners: 'Community Favorites', rate_quiz: 'Rate this quiz', play_again: 'Play Again', people_played: '{count} played', no_results_yet: 'No results yet. Play your first quiz!', login_to_save: 'Log in to save your results', view_all: 'View All', quizzes: 'quizzes', recent: 'Recent', top_winner: 'Top Winner' },",
  
  tr: "        arena: { title: 'Anime Arena', choose_category: 'Kategori Seç', choose_size: 'Soru Sayısı Seç', start_button: 'Savaşı Başlat!', your_winner: 'SENİN KAZANANIN!', share: 'Sonucu Paylaş', go_home: 'Anasayfaya Dön', game: 'Arena', result: 'Sonuç', round: 'Tur', match: 'Eşleşme', go_back: 'Geri Dön', my_champion: '{name} benim şampiyonum!', final: 'BÜYÜK FİNAL', semi_final: 'YARI FİNAL', quarter_final: 'ÇEYREK FİNAL', cat_all_time: 'TÜM ZAMANLAR', cat_movie: 'EN İYİ FİLMLER', cat_shounen: 'SHOUNEN', cat_action: 'AKSİYON & DÖVÜŞ', cat_isekai: 'ISEKAI', cat_romance: 'ROMANTİZM', cat_comedy: 'KOMEDİ', cat_horror: 'KORKU & GERİLİM', cat_drama: 'DRAM & DUYGUSAL', cat_seinen: 'SEINEN & KARANLIK', cat_worst_sequels: 'EN KÖTÜ DEVAM SEZONLARI', cat_waifu: 'EN İYİ WAIFU', cat_husbando: 'EN İYİ HUSBANDO', total_played: 'Toplam Oynanan', your_history: 'Sonuçların', community_winners: 'Topluluk Favorileri', rate_quiz: 'Bu quizi puanla', play_again: 'Tekrar Oyna', people_played: '{count} kişi oynadı', no_results_yet: 'Henüz sonuç yok. İlk quizini oyna!', login_to_save: 'Sonuçlarını kaydetmek için giriş yap', view_all: 'Tümünü Gör', quizzes: 'quiz', recent: 'Son', top_winner: 'En Çok Kazanan' },",
  
  ja: "        arena: { title: 'アニメアリーナ', choose_category: 'カテゴリーを選択', choose_size: 'サイズを選択', start_button: 'バトル開始！', your_winner: 'あなたの勝者！', share: '結果をシェア', go_home: 'ホームへ', game: 'アリーナ', result: '結果', round: 'ラウンド', match: '対戦', go_back: '戻る', my_champion: '{name} が私のチャンピオン！', final: '決勝戦', semi_final: '準決勝', quarter_final: '準々決勝', cat_all_time: '歴代名作', cat_movie: '劇場版映画', cat_shounen: '少年', cat_action: 'アクション・バトル', cat_isekai: '異世界', cat_romance: '恋愛', cat_comedy: 'コメディ', cat_horror: 'ホラー・サスペンス', cat_drama: '感動・ドラマ', cat_seinen: '青年・ダーク', cat_worst_sequels: '最悪の続編', cat_waifu: 'ワイフ', cat_husbando: '夫', total_played: '総プレイ数', your_history: 'あなたの結果', community_winners: 'コミュニティのお気に入り', rate_quiz: 'このクイズを評価', play_again: 'もう一度プレイ', people_played: '{count}回プレイ', no_results_yet: 'まだ結果がありません。最初のクイズをプレイ！', login_to_save: '結果を保存するにはログイン', view_all: 'すべて表示', quizzes: 'クイズ', recent: '最近', top_winner: '最多勝者' },",
  
  ru: "        arena: { title: 'Аниме Арена', choose_category: 'Выберите Категорию', choose_size: 'Выберите Размер', start_button: 'Начать Битву!', your_winner: 'ВАШ ПОБЕДИТЕЛЬ!', share: 'Поделиться Результатом', go_home: 'На Главную', game: 'Арена', result: 'Результат', round: 'Раунд', match: 'Матч', go_back: 'Назад', my_champion: '{name} — мой победитель!', final: 'ФИНАЛ', semi_final: 'ПОЛУФИНАЛ', quarter_final: 'ЧЕТВЕРТЬФИНАЛ', cat_all_time: 'ВСЕ ВРЕМЕНА', cat_movie: 'ЛУЧШИЕ ФИЛЬМЫ', cat_shounen: 'СЁНЭН', cat_action: 'ЭКШЕН И БИТВЫ', cat_isekai: 'ИСЭКАЙ', cat_romance: 'РОМАНТИКА', cat_comedy: 'КОМЕДИЯ', cat_horror: 'ХОРРОР И ТРИЛЛЕР', cat_drama: 'ДРАМА', cat_seinen: 'СЭЙНЭН И ДАРК', cat_worst_sequels: 'ХУДШИЕ СИКВЕЛЫ', cat_waifu: 'ВАЙФУ', cat_husbando: 'ХАСБАНДО', total_played: 'Всего сыграно', your_history: 'Ваши результаты', community_winners: 'Фавориты сообщества', rate_quiz: 'Оценить викторину', play_again: 'Играть снова', people_played: '{count} сыграли', no_results_yet: 'Результатов пока нет. Сыграйте первую викторину!', login_to_save: 'Войдите, чтобы сохранить результаты', view_all: 'Показать все', quizzes: 'викторины', recent: 'Недавние', top_winner: 'Топ победитель' },",
  
  de: "        arena: { title: 'Anime Arena', choose_category: 'Kategorie wählen', choose_size: 'Größe wählen', start_button: 'Kampf beginnen!', your_winner: 'DEIN GEWINNER!', share: 'Ergebnis teilen', go_home: 'Zur Startseite', game: 'Arena', result: 'Ergebnis', round: 'Runde', match: 'Duell', go_back: 'Zurück', my_champion: '{name} ist mein Champion!', final: 'FINALE', semi_final: 'HALBFINALE', quarter_final: 'VIERTELFINALE', cat_all_time: 'ALLE ZEITEN', cat_movie: 'BESTE FILME', cat_shounen: 'SHOUNEN', cat_action: 'ACTION & KÄMPFE', cat_isekai: 'ISEKAI', cat_romance: 'ROMANTIK', cat_comedy: 'KOMÖDIE', cat_horror: 'HORROR & THRILLER', cat_drama: 'DRAMA & EMOTION', cat_seinen: 'SEINEN & DARK', cat_worst_sequels: 'SCHLECHTESTE FORTSETZUNGEN', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', total_played: 'Gesamt gespielt', your_history: 'Deine Ergebnisse', community_winners: 'Community-Favoriten', rate_quiz: 'Quiz bewerten', play_again: 'Nochmal spielen', people_played: '{count} gespielt', no_results_yet: 'Noch keine Ergebnisse. Spiel dein erstes Quiz!', login_to_save: 'Anmelden, um Ergebnisse zu speichern', view_all: 'Alle anzeigen', quizzes: 'Quiz', recent: 'Neueste', top_winner: 'Top Gewinner' },",
  
  ar: "        arena: { title: 'حلبة الأنمي', choose_category: 'اختر الفئة', choose_size: 'اختر الحجم', start_button: 'ابدأ المعركة!', your_winner: 'الفائز الخاص بك!', share: 'مشاركة النتيجة', go_home: 'الرئيسية', game: 'حلبة', result: 'النتيجة', round: 'الجولة', match: 'مباراة', go_back: 'رجوع', my_champion: '{name} هو بطلي!', final: 'النهائي الكبير', semi_final: 'نصف النهائي', quarter_final: 'ربع النهائي', cat_all_time: 'كل الأوقات', cat_movie: 'أفضل الأفلام', cat_shounen: 'شونين', cat_action: 'أكشن وقتال', cat_isekai: 'إيسيكاي', cat_romance: 'رومانسية', cat_comedy: 'كوميديا', cat_horror: 'رعب وإثارة', cat_drama: 'دراما وعواطف', cat_seinen: 'سينين', cat_worst_sequels: 'أسوأ التكملات', cat_waifu: 'وايفو', cat_husbando: 'هوسباندو', total_played: 'مجموع اللعب', your_history: 'نتائجك', community_winners: 'المفضلة لدى المجتمع', rate_quiz: 'قيّم هذا الاختبار', play_again: 'العب مرة أخرى', people_played: '{count} لعبوا', no_results_yet: 'لا توجد نتائج بعد. العب أول اختبار!', login_to_save: 'سجّل الدخول لحفظ النتائج', view_all: 'عرض الكل', quizzes: 'اختبارات', recent: 'الأخيرة', top_winner: 'أكثر فوزاً' },",
  
  es: "        arena: { title: 'Anime Arena', choose_category: 'Elegir Categoría', choose_size: 'Elegir Tamaño', start_button: '¡Comenzar Batalla!', your_winner: '¡TU GANADOR!', share: 'Compartir Resultado', go_home: 'Inicio', game: 'Arena', result: 'Resultado', round: 'Ronda', match: 'Duelo', go_back: 'Volver', my_champion: '¡{name} es mi campeón!', final: 'GRAN FINAL', semi_final: 'SEMIFINAL', quarter_final: 'CUARTOS DE FINAL', cat_all_time: 'TODOS LOS TIEMPOS', cat_movie: 'MEJORES PELÍCULAS', cat_shounen: 'SHOUNEN', cat_action: 'ACCIÓN Y PELEAS', cat_isekai: 'ISEKAI', cat_romance: 'ROMANCE', cat_comedy: 'COMEDIA', cat_horror: 'TERROR Y SUSPENSO', cat_drama: 'DRAMA', cat_seinen: 'SEINEN Y OSCURO', cat_worst_sequels: 'PEORES SECUELAS', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', total_played: 'Total jugado', your_history: 'Tus resultados', community_winners: 'Favoritos de la comunidad', rate_quiz: 'Califica este quiz', play_again: 'Jugar de nuevo', people_played: '{count} jugaron', no_results_yet: 'Sin resultados aún. ¡Juega tu primer quiz!', login_to_save: 'Inicia sesión para guardar resultados', view_all: 'Ver todo', quizzes: 'quizzes', recent: 'Recientes', top_winner: 'Más ganador' },",
  
  pt: "        arena: { title: 'Anime Arena', choose_category: 'Escolher Categoria', choose_size: 'Escolher Tamanho', start_button: 'Iniciar Batalha!', your_winner: 'SEU VENCEDOR!', share: 'Compartilhar Resultado', go_home: 'Início', game: 'Arena', result: 'Resultado', round: 'Rodada', match: 'Duelo', go_back: 'Voltar', my_champion: '{name} é o meu campeão!', final: 'GRANDE FINAL', semi_final: 'SEMIFINAL', quarter_final: 'QUARTAS DE FINAL', cat_all_time: 'TODOS OS TEMPOS', cat_movie: 'MELHORES FILMES', cat_shounen: 'SHOUNEN', cat_action: 'AÇÃO E LUTAS', cat_isekai: 'ISEKAI', cat_romance: 'ROMANCE', cat_comedy: 'COMÉDIA', cat_horror: 'TERROR E SUSPENSE', cat_drama: 'DRAMA', cat_seinen: 'SEINEN E DARK', cat_worst_sequels: 'PIORES SEQUÊNCIAS', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', total_played: 'Total jogado', your_history: 'Seus resultados', community_winners: 'Favoritos da comunidade', rate_quiz: 'Avalie este quiz', play_again: 'Jogar novamente', people_played: '{count} jogaram', no_results_yet: 'Sem resultados ainda. Jogue seu primeiro quiz!', login_to_save: 'Entre para salvar resultados', view_all: 'Ver tudo', quizzes: 'quizzes', recent: 'Recentes', top_winner: 'Mais vencedor' },",
  
  id: "        arena: { title: 'Arena Anime', choose_category: 'Pilih Kategori', choose_size: 'Pilih Ukuran', start_button: 'Mulai Pertarungan!', your_winner: 'PEMENANGMU!', share: 'Bagikan Hasil', go_home: 'Beranda', game: 'Arena', result: 'Hasil', round: 'Ronde', match: 'Pertandingan', go_back: 'Kembali', my_champion: '{name} adalah juara saya!', final: 'FINAL BESAR', semi_final: 'SEMI FINAL', quarter_final: 'PEREMPAT FINAL', cat_all_time: 'SEPANJANG MASA', cat_movie: 'FILM TERBAIK', cat_shounen: 'SHOUNEN', cat_action: 'AKSI & PERTARUNGAN', cat_isekai: 'ISEKAI', cat_romance: 'ROMANSA', cat_comedy: 'KOMEDI', cat_horror: 'HOROR & TEGANG', cat_drama: 'DRAMA', cat_seinen: 'SEINEN & GELAP', cat_worst_sequels: 'SEKUEL TERBURUK', cat_waifu: 'WAIFU', cat_husbando: 'HUSBANDO', total_played: 'Total dimainkan', your_history: 'Hasil Anda', community_winners: 'Favorit komunitas', rate_quiz: 'Nilai kuis ini', play_again: 'Main lagi', people_played: '{count} bermain', no_results_yet: 'Belum ada hasil. Mainkan kuis pertamamu!', login_to_save: 'Masuk untuk menyimpan hasil', view_all: 'Lihat semua', quizzes: 'kuis', recent: 'Terbaru', top_winner: 'Pemenang teratas' },",
  
  hi: "        arena: { title: 'एनीमे एरिना', choose_category: 'श्रेणी चुनें', choose_size: 'आकार चुनें', start_button: 'लड़ाई शुरू करें!', your_winner: 'आपका विजेता!', share: 'परिणाम साझा करें', go_home: 'होम', game: 'एरिना', result: 'परिणाम', round: 'राउंड', match: 'मैच', go_back: 'वापस जाएं', my_champion: '{name} मेरा चैंपियन है!', final: 'भव्य फाइनल', semi_final: 'सेमीफाइनल', quarter_final: 'क्वार्टरफाइनल', cat_all_time: 'हर समय', cat_movie: 'सर्वश्रेष्ठ फिल्में', cat_shounen: 'शोनेन', cat_action: 'एक्शन और लड़ाई', cat_isekai: 'इसेकाई', cat_romance: 'रोमांस', cat_comedy: 'कॉमेडी', cat_horror: 'हॉरर और थ्रिलर', cat_drama: 'ड्रामा', cat_seinen: 'सीनेन', cat_worst_sequels: 'सबसे खराब सीक्वल', cat_waifu: 'वाइफू', cat_husbando: 'हस्बैंडो', total_played: 'कुल खेले गए', your_history: 'आपके परिणाम', community_winners: 'समुदाय के पसंदीदा', rate_quiz: 'इस क्विज़ को रेट करें', play_again: 'फिर से खेलें', people_played: '{count} ने खेला', no_results_yet: 'अभी तक कोई परिणाम नहीं। अपना पहला क्विज़ खेलें!', login_to_save: 'परिणाम सहेजने के लिए लॉगिन करें', view_all: 'सभी देखें', quizzes: 'क्विज़', recent: 'हालिया', top_winner: 'शीर्ष विजेता' },",
};

// Insertion points: after the 'pulse:' line in each language block
const insertionPoints = [
  { lang: 'en', lineNum: 7 },
  { lang: 'tr', lineNum: 386 },
  { lang: 'ja', lineNum: 765 },
  { lang: 'ru', lineNum: 1138 },
  { lang: 'de', lineNum: 1511 },
  { lang: 'ar', lineNum: 1883 },
  { lang: 'es', lineNum: 2256 },
  { lang: 'pt', lineNum: 2589 },
  { lang: 'id', lineNum: 2922 },
  { lang: 'hi', lineNum: 3256 },
];

const lines = content.split('\n');

// Process in reverse order to maintain line numbers
for (let i = insertionPoints.length - 1; i >= 0; i--) {
  const { lang, lineNum } = insertionPoints[i];
  const arenaLine = arenaLines[lang];
  
  // Find pulse line near lineNum
  let insertIdx = -1;
  for (let j = lineNum - 1; j < Math.min(lineNum + 5, lines.length); j++) {
    if (lines[j] && lines[j].includes('pulse:')) {
      insertIdx = j;
      break;
    }
  }
  
  if (insertIdx === -1) {
    // Try wider search
    for (let j = Math.max(0, lineNum - 5); j < Math.min(lineNum + 10, lines.length); j++) {
      if (lines[j] && lines[j].includes('pulse:')) {
        insertIdx = j;
        break;
      }
    }
  }
  
  if (insertIdx !== -1) {
    lines.splice(insertIdx + 1, 0, arenaLine);
    console.log(`Inserted arena for ${lang} after line ${insertIdx + 1}`);
  } else {
    console.error(`Could not find pulse line for ${lang} near line ${lineNum}`);
  }
}

fs.writeFileSync(i18nPath, lines.join('\n'), 'utf8');
console.log('Done! All arena keys inserted.');
