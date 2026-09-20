const fs = require('fs');
const path = require('path');

const i18nPath = path.resolve(__dirname, '../lib/i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const heroTranslations = {
  en: {
    hero_tag: '🔥 ULTIMATE ANIME SHOWDOWN',
    hero_title_1: 'CROWN YOUR',
    hero_title_2: 'CHAMPION',
    hero_desc: 'Two legends enter, only one survives. Vote in tournament brackets and crown the ultimate anime!',
    categories_count: '13 Categories',
    tournament_mode: 'Bracket Battles',
    contenders_badge: '+1,000 Contenders',
  },
  tr: {
    hero_tag: '🔥 EFSANELERİN DÜELLOSU',
    hero_title_1: 'ŞAMPİYONUNU',
    hero_title_2: 'ZİRVEYE TAŞI',
    hero_desc: 'İki efsane karşı karşıya. Eşleşmelerde seçimini yap, kendi şampiyonunu belirle!',
    categories_count: '13 Kategori',
    tournament_mode: 'Eleme Usulü',
    contenders_badge: '+1.000 Efsane',
  },
  ja: {
    hero_tag: '🔥 究極のアニメ対決',
    hero_title_1: 'チャンピオンを',
    hero_title_2: '決めろ',
    hero_desc: '2人のレジェンドが激突。トーナメントを勝ち抜き、最強を決定しよう！',
    categories_count: '13カテゴリー',
    tournament_mode: 'トーナメント',
    contenders_badge: '1,000+ キャラ',
  },
  ru: {
    hero_tag: '🔥 ГЛАВНАЯ АНИМЕ БИТВА',
    hero_title_1: 'ВЫБЕРИ СВОЕГО',
    hero_title_2: 'ЧЕМПИОНА',
    hero_desc: 'Две легенды сходятся в дуэли. Голосуй в турнирной сетке и определи лучшего!',
    categories_count: '13 Категорий',
    tournament_mode: 'Турнирный бой',
    contenders_badge: '+1000 Персонажей',
  },
  de: {
    hero_tag: '🔥 ULTIMATIVER ANIME-KAMPF',
    hero_title_1: 'KRÖNE DEINEN',
    hero_title_2: 'CHAMPION',
    hero_desc: 'Zwei Legenden treten an. Stimme im Turnier ab und küre den ultimativen Sieger!',
    categories_count: '13 Kategorien',
    tournament_mode: 'Turnier-Modus',
    contenders_badge: '+1.000 Legenden',
  },
  ar: {
    hero_tag: '🔥 معركة الأنمي الكبرى',
    hero_title_1: 'توج',
    hero_title_2: 'بطلك',
    hero_desc: 'أسطورتان في مواجهة حاسمة. صوّت في الأدوار الإقصائية وتوّج البطل الحقيقي!',
    categories_count: '13 فئة',
    tournament_mode: 'نظام الإقصاء',
    contenders_badge: '+1,000 متنافس',
  },
  es: {
    hero_tag: '🔥 DUELO DEFINITIVO DE ANIME',
    hero_title_1: 'CORONA A TU',
    hero_title_2: 'CAMPEÓN',
    hero_desc: 'Dos leyendas se enfrentan. ¡Vota en el torneo y corona al anime definitivo!',
    categories_count: '13 Categorías',
    tournament_mode: 'Modo Torneo',
    contenders_badge: '+1.000 Rivales',
  },
  pt: {
    hero_tag: '🔥 DUELO DEFINITIVO DE ANIME',
    hero_title_1: 'COROE SEU',
    hero_title_2: 'CAMPEÃO',
    hero_desc: 'Duas lendas entram na arena. Vote no torneio e eleja o maior de todos!',
    categories_count: '13 Categorias',
    tournament_mode: 'Modo Torneio',
    contenders_badge: '+1.000 Rivais',
  },
  id: {
    hero_tag: '🔥 PERTARUNGAN ANIME TERBESAR',
    hero_title_1: 'PILIH JUARA',
    hero_title_2: 'SEJATIMU',
    hero_desc: 'Dua legenda bertarung. Berikan suaramu di turnamen dan tentukan yang terkuat!',
    categories_count: '13 Kategori',
    tournament_mode: 'Sistem Gugur',
    contenders_badge: '+1.000 Karakter',
  },
  hi: {
    hero_tag: '🔥 महा एनीमे द्वंद्वयुद्ध',
    hero_title_1: 'अपना चैंपियन',
    hero_title_2: 'चुनें',
    hero_desc: 'दो दिग्गजों की टक्कर। टूर्नामेंट में वोट करें और अपने पसंदीदा को ताज पहनाएं!',
    categories_count: '13 श्रेणियां',
    tournament_mode: 'नॉकआउट मोड',
    contenders_badge: '+1,000 दावेदार',
  },
};

const lines = content.split('\n');
let currentLang = 'en';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const langMatch = line.match(/^\s{4}([a-z]{2}):\s*\{/);
  if (langMatch) {
    currentLang = langMatch[1];
  }

  if (line.includes('arena: {') && heroTranslations[currentLang]) {
    const extra = heroTranslations[currentLang];
    const extraEntries = Object.entries(extra)
      .map(([k, v]) => `${k}: '${v.replace(/'/g, "\\'")}'`)
      .join(', ');
    
    // Replace the closing " }" of arena line with ", " + extraEntries + " }"
    lines[i] = line.replace(/\s*\}\s*,?$/, `, ${extraEntries} },`);
    console.log(`Successfully added hero keys to ${currentLang} at line ${i + 1}`);
  }
}

fs.writeFileSync(i18nPath, lines.join('\n'), 'utf8');
console.log('Done!');
