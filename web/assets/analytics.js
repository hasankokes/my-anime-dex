// Website analytics: PostHog EU, the same project as the app (token = EXPO_PUBLIC_POSTHOG_KEY in .env;
// it is a public client key). persistence 'memory' keeps nothing in cookies or browser storage, so the
// site needs no consent banner; every page load counts as a new anonymous visitor. Autocapture, session
// replay and surveys are off: only page views, page leaves and the events below are sent.
// Runs on myanimedex.com only; add ?ph_debug=1 to test it elsewhere. Event list: docs/analytics.md.
(function () {
  var debug = /[?&]ph_debug=1/.test(location.search);
  if (location.hostname !== 'myanimedex.com' && !debug) return;

  // PostHog loader snippet (https://posthog.com/docs/libraries/js)
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init('phc_ragWy5ZfWtJ8V85w7g5qisA4f7kchxGjzWHR9UtdMPxj', {
    api_host: 'https://eu.i.posthog.com',
    defaults: '2026-08-30',
    persistence: 'memory',
    person_profiles: 'never',
    autocapture: false,
    capture_dead_clicks: false,
    disable_session_recording: true,
    disable_surveys: true,
    debug: debug,
  });
  posthog.register({ site_locale: document.documentElement.lang || 'en' });

  var placement = function (el) {
    if (el.closest('.hero, .anime-hero')) return 'hero';
    if (el.closest('#download, .cta')) return 'cta';
    if (el.closest('.nav, header')) return 'nav';
    if (el.closest('footer')) return 'footer';
    return 'body';
  };

  // Campaign tags so the store consoles attribute installs to the site: Google Play reads the UTM referrer,
  // App Store Connect needs the provider token (App Store Connect > Analytics > Campaigns) plus `ct`.
  var APPLE_PROVIDER_TOKEN = '';
  var page = (location.pathname.split('/')[1] || 'home').replace('.html', '');
  var tagStoreLink = function (a, where) {
    try {
      var url = new URL(a.href);
      if (url.hostname === 'play.google.com') {
        url.searchParams.set('referrer', 'utm_source=myanimedex.com&utm_medium=' + where + '&utm_campaign=' + page);
      } else if (APPLE_PROVIDER_TOKEN) {
        url.searchParams.set('pt', APPLE_PROVIDER_TOKEN);
        url.searchParams.set('ct', (page + '-' + where).slice(0, 40));
        url.searchParams.set('mt', '8');
      }
      a.href = url.toString();
    } catch (err) { }
  };

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var store = e.target.closest('a[href*="apps.apple.com"], a[href*="play.google.com"]');
    if (store) {
      var where = placement(store);
      tagStoreLink(store, where);
      // The badge navigates away at once; sendBeacon survives the page unload.
      posthog.capture('web_store_clicked', {
        store: store.href.indexOf('apps.apple.com') > -1 ? 'ios' : 'android',
        placement: where,
      }, { transport: 'sendBeacon' });
      return;
    }
    var trailer = e.target.closest('[data-trailer]');
    if (trailer) posthog.capture('web_trailer_opened', { placement: placement(trailer) });
  }, true);
})();
