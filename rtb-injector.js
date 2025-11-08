/* rtb-injector.js — Yandex RTB R-A-14383531-4 для Wix/SPA: после 6-го абзаца */

(function () {
  "use strict";

  var BLOCK_ID = "R-A-14383531-4";
  var TARGET_IDX = 5;                 // после 6-го абзаца (0..5)
  var ONE_PER_CONTAINER = true;

  var SELECTORS = [
    '[itemprop="articleBody"]',
    '[data-hook="post-body"]',
    '[data-mesh-id*="Post__content"]',
    '[data-mesh-id*="post__content"]',
    'article',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.rich-content',
    '.blog-post-content',
    '.cms-content',
    'main .content',
    'main'
  ];

  // --- загрузка/готовность API Яндекса ---
  function ensureContext(cb) {
    window.yaContextCb = window.yaContextCb || [];

    if (window.Ya && window.Ya.Context && window.Ya.Context.AdvManager) {
      cb();
      return;
    }

    var existing = document.querySelector(
      'script[src*="yandex.ru/ads/system/context.js"]'
    );
    if (!existing) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://yandex.ru/ads/system/context.js";
      document.head.appendChild(s);
    }

    window.yaContextCb.push(function () {
      if (window.Ya && Ya.Context && Ya.Context.AdvManager) {
        cb();
      }
    });
  }

  // --- вставка блока в конкретный контейнер ---
  function injectInto(container) {
    if (!container || (ONE_PER_CONTAINER && container._rtbInjected)) return;

    var paragraphs = container.querySelectorAll("p");
    if (!paragraphs.length) return;

    var idx = Math.min(TARGET_IDX, paragraphs.length - 1);
    var after = paragraphs[idx];

    var divId = "yandex_rtb_" + BLOCK_ID.replace(/[^a-zA-Z0-9_]/g, "_")
               + "_" + Math.random().toString(16).slice(2);

    var slot = document.createElement("div");
    slot.id = divId;
    slot.style.width = "100%";
    slot.style.margin = "20px 0";

    after.parentNode.insertBefore(slot, after.nextSibling);

    ensureContext(function () {
      Ya.Context.AdvManager.render({
        blockId: BLOCK_ID,
        renderTo: divId
      });
    });

    if (ONE_PER_CONTAINER) {
      container._rtbInjected = true;
    }
  }

  // --- начальное сканирование ---
  function scan() {
    var containers = document.querySelectorAll(SELECTORS.join(","));
    for (var i = 0; i < containers.length; i++) {
      injectInto(containers[i]);
    }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(scan, 0);
  } else {
    document.addEventListener("DOMContentLoaded", scan);
  }

  // --- наблюдение за изменениями DOM (важно для Wix SPA) ---
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes && m.addedNodes.forEach(function (node) {
        if (!(node instanceof HTMLElement)) return;

        // Если сам узел — контейнер статьи
        if (node.matches && SELECTORS.some(function (sel) { return node.matches(sel); })) {
          injectInto(node);
        }

        // Или внутри него появились контейнеры
        if (node.querySelectorAll) {
          var found = node.querySelectorAll(SELECTORS.join(","));
          for (var i = 0; i < found.length; i++) {
            injectInto(found[i]);
          }
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
