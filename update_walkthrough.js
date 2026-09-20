const fs = require('fs');

// 1. Update WalkthroughContext.tsx
let ctx = fs.readFileSync('context/WalkthroughContext.tsx', 'utf8');
ctx = ctx.replace(
  "stepKeys: ['logo', 'search', 'discover', 'rollDice', 'myLists', 'trending', 'themeToggle', 'profile'],",
  "stepKeys: ['logo', 'pulse', 'discover', 'rollDice', 'myLists', 'trending', 'themeToggle', 'profile'],"
);
fs.writeFileSync('context/WalkthroughContext.tsx', ctx);

// 2. Update index.tsx
let index = fs.readFileSync('app/(tabs)/index.tsx', 'utf8');
index = index.replace('const searchBarRef = useRef<View>(null);', 'const pulseRef = useRef<View>(null);');
index = index.replace('measureRef(searchBarRef, 1);', 'measureRef(pulseRef, 1);');
// Remove searchBarRef from Search View
index = index.replace('ref={searchBarRef as any}', '');
index = index.replace('onLayout={() => measureRef(searchBarRef, 1)}', '');
// Add pulseRef to Pulse button
index = index.replace(
  'onPress={() => setIsPulseVisible(!isPulseVisible)}',
  'onPress={() => setIsPulseVisible(!isPulseVisible)}\n            ref={pulseRef as any}\n            {...({ collapsable: false } as any)}\n            onLayout={() => measureRef(pulseRef, 1)}'
);
fs.writeFileSync('app/(tabs)/index.tsx', index);

// 3. Update i18n.ts
let i18n = fs.readFileSync('lib/i18n.ts', 'utf8');
const replacements = [
  { old: "search: 'Search for any anime by name. Type and hit enter to find your favorites!',", new: "pulse: 'Check out the Community Pulse to see what other people are watching right now!'," },
  { old: "search: 'Herhangi bir animeyi adıyla arayın. Favorilerinizi bulmak için yazın ve enter\\'a basın!',", new: "pulse: 'Şu an başkalarının ne izlediğini görmek için Topluluk Nabzı\\'na göz atın!'," },
  { old: "search: 'アニメを名前で検索できます。入力してエンターを押してお気に入りを見つけましょう！',", new: "pulse: 'コミュニティパルスをチェックして、他の人が今見ているものを確認してください！'," },
  { old: "search: 'Ищите любое аниме по названию. Введите запрос и нажмите Enter, чтобы найти избранное!',", new: "pulse: 'Загляните в Community Pulse, чтобы узнать, что сейчас смотрят другие!'," },
  { old: "search: 'Suchen Sie nach Anime anhand des Namens. Tippen und Enter drücken!',", new: "pulse: 'Schauen Sie sich den Community Pulse an, um zu sehen, was andere gerade sehen!'," },
  { old: "search: 'ابحث عن أي أنمي بالاسم. اكتب واضغط Enter للعثور على مفضلاتك!',", new: "pulse: 'تحقق من نبض المجتمع لترى ما يشاهده الآخرون الآن!'," },
  { old: "search: 'Busca cualquier anime por nombre. ¡Escribe y presiona Enter para encontrar tus favoritos!',", new: "pulse: '¡Echa un vistazo a Community Pulse para ver qué están viendo otras personas en este momento!'," },
  { old: "search: 'Pesquise qualquer anime pelo nome. Digite e pressione Enter para encontrar seus favoritos!',", new: "pulse: 'Confira o Community Pulse para ver o que outras pessoas estão assistindo no momento!'," },
  { old: "search: 'Cari anime apa pun berdasarkan nama. Ketik dan tekan Enter untuk menemukan favorit Anda!',", new: "pulse: 'Lihat Denyut Komunitas untuk melihat apa yang sedang ditonton orang lain sekarang!'," },
  { old: "search: 'नाम से कोई भी एनीमे खोजें। टाइप करें और अपने पसंदीदा खोजने के लिए एंटर दबाएं!',", new: "pulse: 'अन्य लोग अभी क्या देख रहे हैं, यह देखने के लिए कम्युनिटी पल्स देखें!'," },
];

replacements.forEach(r => {
  i18n = i18n.replace(r.old, r.new);
});
fs.writeFileSync('lib/i18n.ts', i18n);

console.log('Done');
