/* rtb-injector.js — Yandex RTB after 6th paragraph (site-wide for Wix) */
(function () {
  "use strict";

  var BLOCK_ID = "R-A-14383531-4";        // ваш ID блока
  var TARGET_IDX = 5;                      // после 6-го абзаца (индексация с 0)
  var ONE_PER_CONTAINER = true;            // по одному блоку в контейнер
  var SELECTORS = [
    '[itemprop="articleBody"]',
    'article',
    '.post-content', '.entry-content', '.article-content',
    '.rich-content', '.blog-post-content', '.cms-content',
    'main .content', 'main'
  ];

  /* ----- загрузка/готовность API Яндекса ----- */
  function ensureContext(cb){
    window.yaContextCb = window.yaContextCb || [];
    if (window.Ya && Ya.Context && Ya.Context.AdvManager) return cb();

    // если контекст ещё не подключен — подключим
    var s = document.querySelector('script[src*="yandex.ru/ads/system/context.js"]');
    if (!s) {
      s = document.createElement('script');
      s.async = true;
      s.src = 'https://yandex.ru/ads/system/context.js';
      // В Wix внешний файл допустим; если CSP блокирует домен, см. инструкцию ниже
      document.head.appendChild(s);
    }

    // ждём готовность API
    var tries = 0, t = setInterval(function(){
      if (window.Ya && Ya.Context && Ya.Context.AdvManager) {
        clearInterval(t); cb();
      } else if (++tries > 120) { // ~14 сек
        clearInterval(t);
        console.warn('[RTB] Ya API not ready (CSP/AdBlock?)');
      }
    }, 120);
  }

  /* ----- поиск контейнеров статьи ----- */
  function getArticleContainers(root){
    var list = [];
    SELECTORS.forEach(function(sel){
      root.querySelectorAll(sel).forEach(function(el){
        var s = (el.id + ' ' + el.className).toLowerCase();
        if (/header|footer|aside|nav|menu|share|social|related|comments?|promo|banner/.test(s)) return;
        if (el.querySelector('p')) list.push(el);
      });
    });
    return Array.from(new Set(list));
  }

  /* ----- вставка блока в конкретный контейнер ----- */
  function injectInto(container){
    if (ONE_PER_CONTAINER && container.hasAttribute('data-rtb-injected')) return false;

    var ps = Array.from(container.querySelectorAll('p'))
      .filter(function(p){ return (p.textContent||'').trim().length>0 && p.offsetParent!==null; });

    if (!ps.length) return false;

    var idx = Math.min(TARGET_IDX, ps.length - 1);
    var anchor = ps[idx];

    // нейтральный id, чтобы не ловить простые правила AdBlock/CSS
    var renderId = ('ad_'+Date.now()+Math.random()).replace(/\W/g,'');
    var host = document.createElement('div');
    host.setAttribute('data-ad-host','true');
    host.style.margin = '24px 0';
    host.innerHTML = '<div id="'+renderId+'"></div>';
    anchor.insertAdjacentElement('afterend', host);
    container.setAttribute('data-rtb-injected','true');

    ensureContext(function(){
      try {
        window.yaContextCb.push(function(){
          if (window.Ya && Ya.Context && Ya.Context.AdvManager) {
            Ya.Context.AdvManager.render({
              blockId: BLOCK_ID,
              renderTo: renderId
            });
          }
        });
      } catch(e) {
        console.warn('[RTB] render error:', e);
      }
    });

    return true;
  }

  function run(root){ getArticleContainers(root||document).forEach(injectInto); }

  // первичный запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ run(document); });
  } else { run(document); }

  // следим за динамически подгружаемым контентом (SPA/«показать ещё»)
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes && m.addedNodes.forEach(function(node){
          if (node.nodeType === 1) run(node);
        });
      });
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }
})();
