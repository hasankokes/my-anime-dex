const fs = require('fs');

const file = 'lib/i18n.ts';
let content = fs.readFileSync(file, 'utf8');

const translations = {
    en: "        pulse: { title: 'Community Pulse', watching: '{user} started watching {anime}', completed: '{user} completed {anime}' },",
    tr: "        pulse: { title: 'Topluluk Nabzı', watching: '{user} {anime} izlemeye başladı', completed: '{user} {anime} serisini tamamladı' },",
    ja: "        pulse: { title: 'コミュニティの動き', watching: '{user}さんが{anime}を見始めました', completed: '{user}さんが{anime}を見終わりました' },",
    ru: "        pulse: { title: 'Пульс Сообщества', watching: '{user} начал(а) смотреть {anime}', completed: '{user} посмотрел(а) {anime}' },",
    de: "        pulse: { title: 'Community-Puls', watching: '{user} hat angefangen {anime} zu schauen', completed: '{user} hat {anime} beendet' },",
    ar: "        pulse: { title: 'نبض المجتمع', watching: 'بدأ {user} في مشاهدة {anime}', completed: 'أكمل {user} مشاهدة {anime}' },",
    es: "        pulse: { title: 'Pulso de la Comunidad', watching: '{user} empezó a ver {anime}', completed: '{user} completó {anime}' },",
    pt: "        pulse: { title: 'Pulso da Comunidade', watching: '{user} começou a assistir {anime}', completed: '{user} completou {anime}' },",
    id: "        pulse: { title: 'Nadi Komunitas', watching: '{user} mulai menonton {anime}', completed: '{user} telah menyelesaikan {anime}' },",
    hi: "        pulse: { title: 'समुदाय की धड़कन', watching: '{user} ने {anime} देखना शुरू किया', completed: '{user} ने {anime} पूरा किया' },"
};

for (const [lang, addStr] of Object.entries(translations)) {
    const searchStr = `    ${lang}: {\n`;
    const replaceStr = `    ${lang}: {\n${addStr}\n`;
    if (content.includes(searchStr) && !content.includes("pulse: {")) {
        content = content.replace(searchStr, replaceStr);
    }
}

fs.writeFileSync(file, content);
console.log('Done updating i18n.ts');
