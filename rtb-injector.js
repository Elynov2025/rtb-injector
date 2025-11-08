/* rtb-injector.js — адаптивный Yandex.RTB R-A-14383531-4 после 6-го абзаца (Wix/newsefir/zeronum) */

(function () {
  "use strict";

  var BLOCK_ID = "R-A-14383531-4";        // твой RTB-блок (адаптивный)
  var TARGET_PARAGRAPH_INDEX = 5;         // после 6-го абзаца (0..5)
  var MAX_ATTEMPTS = 20;                  // до ~10 секунд ожидания контента
  var INTERVAL_MS = 500;

  // Селекторы возможных контейнеров статьи — можно дополнять под верстку
  var SELECTORS = [
    '[itemprop="articleBody"]',
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

  var injected = false;

  // Подключаем / ждём Яндекс.API
  function ensureYandexContext(callback) {
    window.yaContextCb = window.yaContextCb || [];

    // Если уже загружен — запускаем сразу
    if (window.Ya && window.Ya.Context && window.Ya.Context.AdvManager) {
      callback();
      return;
    }

    // Если скрипт ещё не подключен — подключаем
    var existing = document.querySelector(
      'script[src*="yandex.ru/ads/system/context.js"]'
    );

    if (!existing) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://yandex.ru/ads/system/context.js";
      document.head.appendChild(s);
    }

    // Яндекс при загрузке пробежится по очереди и вызовет callback
    window.yaContextCb.push(callback);
  }

  // Ищем контейнер статьи, где достаточно абзацев
  function findContainer() {
    for (var i = 0; i < SELECTORS.length; i++) {
      var c = document.querySelector(SELECTORS[i]);
      if (!c) continue;

      var paragraphs = c.querySelectorAll("p");
      if (paragraphs.length > TARGET_PARAGRAPH_INDEX) {
        return { container: c, paragraphs: paragraphs };
      }
    }
    return null;
  }

  // Вставляем блок один раз
  function injectOnce() {
    if (injected) return;

    var data = findContainer();
    if (!data) return;

    var targetP = data.paragraphs[TARGET_PARAGRAPH_INDEX];
    if (!targetP) return;

    var divId = "yandex_rtb_" + BLOCK_ID.replace(/[^a-zA-Z0-9_]/g, "_");

    // Если уже вставляли — выходим
    if (document.getElementById(divId)) {
      injected = true;
      return;
    }

    var div = document.createElement("div");
    div.id = divId;
    div.style.width = "100%";      // адаптивный по ширине
    div.style.margin = "20px 0";

    targetP.parentNode.insertBefore(div, targetP.nextSibling);

    ensureYandexContext(function () {
      if (injected) return;
      if (!(window.Ya && window.Ya.Context && window.Ya.Context.AdvManager)) {
        return;
      }

      window.Ya.Context.AdvManager.render({
        blockId: BLOCK_ID,
        renderTo: divId
        // размеры не задаём: блок настроен как адаптивный в РСЯ
      });

      injected = true;
    });
  }

  // Несколько попыток дождаться, пока Wix дорисует контент
  function runWithRetries() {
    var attempts = 0;
    var timer = setInterval(function () {
      if (injected) {
        clearInterval(timer);
        return;
      }
      injectOnce();
      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
      }
    }, INTERVAL_MS);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    runWithRetries();
  } else {
    document.addEventListener("DOMContentLoaded", runWithRetries);
  }
})();
