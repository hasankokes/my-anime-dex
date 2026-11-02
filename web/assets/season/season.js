// Seasonal pages: air times ship in UTC; show them in the visitor's time zone and regroup the shows
// under the weekday they air locally (a Sunday 23:00 UTC show is Monday in Tokyo).
(function () {
  var shows = [].slice.call(document.querySelectorAll('.day[data-day] .show'));
  if (!shows.length) return;
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var fmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  var groups = DAYS.map(function () { return []; });
  shows.forEach(function (li) {
    var t = li.querySelector('time[data-ts]');
    var d = new Date(Number(t.dataset.ts) * 1000);
    t.textContent = fmt.format(d);
    li._mins = d.getHours() * 60 + d.getMinutes();
    groups[d.getDay()].push(li);
  });
  var sections = [].slice.call(document.querySelectorAll('.day[data-day]'));
  var anchor = sections[0];
  var nav = document.querySelector('.days');
  [].slice.call(nav.querySelectorAll('a:not(.other)')).forEach(function (a) { a.remove(); });
  var first = nav.firstChild;
  // Week starts on Monday in the list, like the in-app calendar
  [1, 2, 3, 4, 5, 6, 0].forEach(function (i) {
    if (!groups[i].length) return;
    groups[i].sort(function (a, b) { return a._mins - b._mins; });
    var sec = document.createElement('section');
    sec.className = 'day';
    sec.id = 'd' + i;
    sec.dataset.day = i;
    var h = document.createElement('h2');
    h.textContent = DAYS[i];
    var ol = document.createElement('ol');
    ol.className = 'shows';
    groups[i].forEach(function (li) { ol.append(li); });
    sec.append(h, ol);
    anchor.before(sec);
    var a = document.createElement('a');
    a.href = '#d' + i;
    a.textContent = DAYS[i].slice(0, 3);
    nav.insertBefore(a, first);
  });
  sections.forEach(function (s) { s.remove(); });
  var label = document.querySelector('.tz');
  if (label) label.textContent = 'Times in your time zone' + (tz ? ' (' + tz.replace(/_/g, ' ') + ')' : '');
})();
