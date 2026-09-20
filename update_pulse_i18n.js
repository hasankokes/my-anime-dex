const fs = require('fs');

let i18n = fs.readFileSync('lib/i18n.ts', 'utf8');

const pulseDict = {
  en: "pulse: { title: 'Community Pulse', watching: '{user} started watching {anime}', completed: '{user} completed {anime}' },",
  tr: "pulse: { title: 'Topluluk Nabzı', watching: '{user}, {anime} izlemeye başladı', completed: '{user}, {anime} serisini tamamladı' },",
  ja: "pulse: { title: 'みんなのアクティビティ', watching: '{user}が{anime}を見始めました', completed: '{user}が{anime}を見終わりました' },",
  ru: "pulse: { title: 'Пульс сообщества', watching: '{user} начал(а) смотреть {anime}', completed: '{user} завершил(а) просмотр {anime}' },",
  de: "pulse: { title: 'Community-Puls', watching: '{user} hat angefangen {anime} zu schauen', completed: '{user} hat {anime} abgeschlossen' },",
  ar: "pulse: { title: 'نبض المجتمع', watching: '{user} بدأ مشاهدة {anime}', completed: '{user} أكمل {anime}' },",
  es: "pulse: { title: 'Actividad de la Comunidad', watching: '{user} empezó a ver {anime}', completed: '{user} completó {anime}' },",
  pt: "pulse: { title: 'Atividade da Comunidade', watching: '{user} começou a assistir {anime}', completed: '{user} completou {anime}' },",
  id: "pulse: { title: 'Aktivitas Komunitas', watching: '{user} mulai menonton {anime}', completed: '{user} menyelesaikan {anime}' },",
  hi: "pulse: { title: 'कम्युनिटी पल्स', watching: '{user} ने {anime} देखना शुरू किया', completed: '{user} ने {anime} पूरा किया' },"
};

const langs = ['tr', 'ja', 'ru', 'de', 'ar', 'es', 'pt', 'id', 'hi'];

for (const lang of langs) {
  // Regex to find `lang: { \n common: {`
  const regex = new RegExp(`(${lang}: \\{\\s*)(common: \\{)`, 'g');
  if (!i18n.includes(`pulse: { title:`)) {
    // Only inject if not already injected manually. Wait, for EN it's already there. For others it's not.
  }
  i18n = i18n.replace(regex, `$1${pulseDict[lang]}\n        $2`);
}

fs.writeFileSync('lib/i18n.ts', i18n);
console.log('Pulse translations added successfully!');
