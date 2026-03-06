(function () {
  const cfg = window.ANALYTICS_CONFIG || {};
  const providers = cfg.providers || {};

  function loadScript(src, attrs = {}) {
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    document.head.appendChild(s);
  }

  // Plausible
  if (providers.plausible?.enabled && providers.plausible?.domain) {
    loadScript(providers.plausible.scriptUrl || 'https://plausible.io/js/script.js', {
      'data-domain': providers.plausible.domain
    });
  }

  // GoatCounter
  if (providers.goatcounter?.enabled && providers.goatcounter?.code) {
    window.goatcounter = window.goatcounter || { path: p => location.host + p };
    loadScript(`https://${providers.goatcounter.code}.goatcounter.com/count.js`, { async: 'true' });
  }

  // Google Analytics 4
  if (providers.ga4?.enabled && providers.ga4?.measurementId) {
    const id = providers.ga4.measurementId;
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }

  // Microsoft Clarity
  if (providers.clarity?.enabled && providers.clarity?.projectId) {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", providers.clarity.projectId);
  }

  // Local metrics (privacy-friendly per-browser counters)
  if (cfg.localMetrics?.enabled) {
    const key = cfg.localMetrics.storageKey || 'site_metrics_v1';
    let m;
    try {
      m = JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      m = {};
    }

    m.firstSeenAt = m.firstSeenAt || new Date().toISOString();
    m.lastSeenAt = new Date().toISOString();
    m.visits = (Number(m.visits) || 0) + 1;
    m.pageViews = (Number(m.pageViews) || 0) + 1;
    localStorage.setItem(key, JSON.stringify(m));

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const sameHost = new URL(a.href, location.href).host === location.host;
      if (!sameHost) {
        m.outboundClicks = (Number(m.outboundClicks) || 0) + 1;
        localStorage.setItem(key, JSON.stringify(m));
      }
    });
  }
})();
