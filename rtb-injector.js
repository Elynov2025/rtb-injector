(function () {
  "use strict";

  var BLOCK_ID = "R-A-XXXXXXXXX-1";       // твой RTB-блок
  var TARGET_IDX = 5;                     // после 6-го абзаца
  var SELECTORS = [
    '[itemprop="articleBody"]',
    'article',
    '.post-content', '.entry-content', '.article-content',
    '.rich-content', '.blog-post-content', '.cms-content',
    'main .content', 'main'
  ];

  var MAX_ATTEMPTS = 20;                  // до ~10 секунд
  var INTERVAL = 500;
  var injected = false;

  function ensureContext(cb) {
    window.yaContextCb = window.yaContextCb || [];
    if (window.Ya && Ya.Context && Ya.Context.AdvManager) {
      return cb();
    }
    var s = document.querySelector('script[src*="yandex.ru/ads/system/context.js"]');
    if (!s) {
      s = document.createElement('script');
      s.src = "https://yandex.ru/ads/system/context.js";
      s.async = true;
      document.head.appendChild(s);
    }
    window.yaContextCb.push(cb);
  }

  function findContainer() {
    for (var i = 0; i < SELECTORS.length; i++) {
      var el = document.querySelector(SELECTORS[i]);
      if (el && el.querySelectorAll("p").length > TARGET_IDX) return el;
    }
    return null;
  }

  function insertOnce() {
    if (injected) return;
    var container = findContainer();
    if (!container) return;

    var paragraphs = container.querySelectorAll("p");
    var target = paragraphs[TARGET_IDX];
    if (!target) return;

    var div = document.createElement("div");
    var renderId = "yandex_rtb_" + BLOCK_ID.replace(/[^a-zA-Z0-9_]/g, "_");
    div.id = renderId;
    target.parentNode.insertBefore(div, target.nextSibling);

    ensureContext(function () {
      Ya.Context.AdvManager.render({
        blockId: BLOCK_ID,
        renderTo: renderId,
        async: true
      });
    });

    injected = true;
  }

  function runWithRetries() {
    var attempts = 0;
    var timer = setInterval(function () {
      if (injected) return clearInterval(timer);
      insertOnce();
      if (++attempts >= MAX_ATTEMPTS) clearInterval(timer);
    }, INTERVAL);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    runWithRetries();
  } else {
    document.addEventListener("DOMContentLoaded", runWithRetries);
  }
})();
