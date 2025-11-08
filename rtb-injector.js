/* rtb-injector.js — Yandex RTB R-A-14383531-4 после 6-го абзаца (Wix / SPA) */

(function () {
  "use strict";

  var BLOCK_ID = "R-A-14383531-4";
  var TARGET_IDX = 5;                    // после 6-го абзаца (0..5)
  var ONE_PER_CONTAINER = true;

  var SELECTORS = [
    '[itemprop="articleBody"]',
    '[data-hook="post-body"]',
    '[data-mesh-id*="Post__content"]',
    '[data-mesh-id*="post__content"]',
    'article',
    '.post-content', '.entry-content', '.article-content',
    '.rich-content', '.blog-post-content', '.cms-content',
    'main .content', 'main'
  ];

  // --- очередь для колбэков Яндекса ---
  window.yaContextCb = window.yaContextCb || [];

  // --- подключаем context.js, если его ещё нет ---
  (function ensureScript () {
    if (!document.querySelector('script[src*="yandex.ru/ads/system/context.js"]')) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://yandex.ru/ads/system/context.js";
      document.head.appendChild(s);
    }
  })();

  // --- правильно планируем рендер блока ---
  function scheduleRender(renderId) {
    // Если API уже готово — рендерим сразу
    if (window.Ya && window.Ya.Context && window.Ya.Context.AdvManager) {
      window.Ya.Context.AdvManager.render({
        blockId: BLOCK_ID,
        renderTo: renderId
      });
      return;
    }

    // Если ещё не готово — кладём в очередь до инициализации
    window.yaContextCb.push(function () {
      if (window.Ya && window.Ya.Context && window.Ya.Context.AdvManager) {
        window.Ya.Context.AdvManager.render({
          blockId: BLOCK_ID,
          renderTo: renderId
        });
      }
    });
  }

  // --- ищем контейнеры статьи ---
  function getArticleContainers(root) {
    root = root || document;
    var list = [];

    SELECTORS.forEach(function (sel) {
      root.querySelectorAll(sel).forEach(function (el) {
        var s = (el.id + " " + el.className).toLowerCase();
        if (/header|footer|aside|nav|menu|share|social|related|comments?|promo|banner/.test(s)) return;
        if (el.querySelector("p")) list.push(el);
      });
    });

    // уникализируем
    return list.filter(function (el, i) {
      return list.indexOf(el) === i;
    });
  }

  // --- вставка блока в один контейнер ---
  function injectInto(container) {
    if (!container) return;
    if (ONE_PER_CONTAINER && container.hasAttribute("data-rtb-injected")) return;

    var ps = Array.prototype.filter.call(
      container.querySelectorAll("p"),
      function (p) {
        return (p.textContent || "").trim().length > 0 && p.offsetParent !== null;
      }
    );
    if (!ps.length) return;

    var idx = Math.min(TARGET_IDX, ps.length - 1);
    var anchor = ps[idx];

    var renderId = ("rtb_" + BLOCK_ID + "_" + Math.random())
      .replace(/[^\w]/g, "");

    var host = document.createElement("div");
    host.setAttribute("data-rtb-host", "true");
    host.style.margin = "24px 0";
    host.innerHTML = '<div id="' + renderId + '"></div>';

    anchor.parentNode.insertAdjacentElement("afterend", host);
    container.setAttribute("data-rtb-injected", "true");

    scheduleRender(renderId);
  }

  // --- запуск на текущем DOM ---
  function run(root) {
    getArticleContainers(root || document).forEach(injectInto);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      run(document);
    });
  } else {
    run(document);
  }

  // --- следим за динамическими изменениями (Wix = SPA) ---
  if ("MutationObserver" in window) {
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (!m.addedNodes) return;
        Array.prototype.forEach.call(m.addedNodes, function (node) {
          if (node.nodeType !== 1) return;
          run(node);
        });
      });
    });

    mo.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();
