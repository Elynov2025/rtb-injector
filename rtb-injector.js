/* rtb-injector.js — адаптивный Yandex.RTB R-A-14383531-4
   Вставка в тело статьи (после 6-го абзаца, если они есть; иначе ближе к концу текста)
*/

(function () {
  "use strict";

  var BLOCK_ID = "R-A-14383531-4";
  var TARGET_PARAGRAPH_INDEX = 5;   // после 6-го абзаца, если есть
  var MAX_ATTEMPTS = 20;           // до ~10 секунд
  var INTERVAL_MS = 500;

  // Возможные контейнеры статьи (Wix / блог / кастом)
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

  var injected = false;

  // Подключаем / ждём Yandex Context
  function ensureYandexContext(callback) {
    if (!window.yaContextCb) {
      window.yaContextCb = [];
    }

    if (window.Ya && window.Ya.Context && window.Ya.Context.AdvManager) {
      callback();
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

    window.yaContextCb.push(callback);
  }

  // Находим контейнер статьи
  function detectContainer() {
    for (var i = 0; i < SELECTORS.length; i++) {
      var c = document.querySelector(SELECTORS[i]);
      if (c) return c;
    }
    // фолбэк: main или body
    var mainEl = document.querySelector("main");
    return mainEl || document.body;
  }

  // Вставляем блок один раз
  function injectOnce() {
    if (injected) return;

    var container = detectContainer();
    if (!container) return;

    // Ищем параграфы только внутри контейнера
    var paragraphs = container.querySelectorAll("p");
    var targetNode;

    if (paragraphs.length > TARGET_PARAGRAPH_INDEX) {
      // нормальный случай — после 6-го абзаца
      targetNode = paragraphs[TARGET_PARAGRAPH_INDEX];
    } else if (paragraphs.length > 0) {
      // если абзацев мало — после последнего
      targetNode = paragraphs[paragraphs.length - 1];
    } else {
      // если вообще нет <p>, ставим ближе к концу контейнера
      targetNode = container.lastChild || container;
    }

    var divId = "yandex_rtb_" + BLOCK_ID.replace(/[^a-zA-Z0-9_]/g, "_");

    if (document.getElementById(divId)) {
      injected = true;
      return;
    }

    var slot = document.createElement("div");
    slot.id = divId;
    slot.style.width = "100%";
    slot.style.margin = "20px 0";

    if (targetNode && targetNode.parentNode) {
      targetNode.parentNode.insertBefore(slot, targetNode.nextSibling);
    } else {
      container.appendChild(slot);
    }

    ensureYandexContext(function () {
      if (injected) return;
      if (!(window.Ya && window.Ya.Context && window.Ya.Context.AdvManager)) {
        return;
      }

      window.Ya.Context.AdvManager.render({
        blockId: BLOCK_ID,
        renderTo: divId
        // блок адаптивный — размеры задаются в кабинете
      });

      injected = true;
    });
  }

  // Многократные попытки, чтобы дождаться Wix-контента
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
