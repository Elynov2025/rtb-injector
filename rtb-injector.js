/* rtb-injector.js — адаптивный Yandex.RTB R-A-14383531-4
   Вставка в тело статьи (после 6-го абзаца, если они есть; иначе ближе к концу).
*/

(function () {
  "use strict";

  var BLOCK_ID = "R-A-14383531-4";
  var DIV_ID = "yandex_rtb_" + BLOCK_ID.replace(/[^a-zA-Z0-9_]/g, "_");
  var TARGET_PARAGRAPH_INDEX = 5;   // после 6-го абзаца
  var MAX_ATTEMPTS = 20;           // ~10 секунд ожидания контента
  var INTERVAL_MS = 500;

  // Возможные контейнеры статьи (для Wix/blog)
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

  function log(msg) {
    if (window.console && console.log) {
      console.log("[rtb-injector]", msg);
    }
  }

  // Подключаем / ждём Yandex Context
  function ensureYandexContext(callback) {
    if (!window.yaContextCb) {
      window.yaContextCb = [];
      log("yaContextCb init");
    }

    if (window.Ya && window.Ya.Context && window.Ya.Context.AdvManager) {
      log("Ya.Context готов");
      callback();
      return;
    }

    var existing = document.querySelector(
      'script[src*="yandex.ru/ads/system/context.js"]'
    );

    if (!existing) {
      log("Подключаем context.js");
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://yandex.ru/ads/system/context.js";
      document.head.appendChild(s);
    }

    window.yaContextCb.push(function () {
      log("callback из yaContextCb");
      callback();
    });
  }

  // Находим контейнер статьи
  function detectContainer() {
    for (var i = 0; i < SELECTORS.length; i++) {
      var c = document.querySelector(SELECTORS[i]);
      if (c) {
        log("Контейнер: " + SELECTORS[i]);
        return c;
      }
    }
    var mainEl = document.querySelector("main");
    if (mainEl) {
      log("Контейнер: <main>");
      return mainEl;
    }
    log("Контейнер: <body> (фолбэк)");
    return document.body;
  }

  // Вставляем слот один раз
  function injectOnce() {
    if (injected) return;

    var container = detectContainer();
    if (!container) {
      log("Контейнер не найден");
      return;
    }

    var paragraphs = container.querySelectorAll("p");
    var targetNode;

    if (paragraphs.length > TARGET_PARAGRAPH_INDEX) {
      targetNode = paragraphs[TARGET_PARAGRAPH_INDEX];
      log("После параграфа #" + TARGET_PARAGRAPH_INDEX);
    } else if (paragraphs.length > 0) {
      targetNode = paragraphs[paragraphs.length - 1];
      log("После последнего параграфа");
    } else {
      targetNode = container.lastChild || container;
      log("В конец контейнера (нет <p>)");
    }

    if (document.getElementById(DIV_ID)) {
      log("Слот уже есть");
      injected = true;
      return;
    }

    var slot = document.createElement("div");
    slot.id = DIV_ID;
    slot.style.width = "100%";
    slot.style.margin = "20px 0";

    if (targetNode && targetNode.parentNode) {
      targetNode.parentNode.insertBefore(slot, targetNode.nextSibling);
    } else {
      container.appendChild(slot);
    }
    log("Слот вставлен: #" + DIV_ID);

    ensureYandexContext(function () {
      if (injected) return;
      if (!(window.Ya && window.Ya.Context && window.Ya.Context.AdvManager)) {
        log("Ya.Context.AdvManager недоступен");
        return;
      }

      log("Рендер блока " + BLOCK_ID + " в " + DIV_ID);
      try {
        window.Ya.Context.AdvManager.render({
          blockId: BLOCK_ID,
          renderTo: DIV_ID
        });
        injected = true;
      } catch (e) {
        log("Ошибка render: " + (e && e.message));
      }
    });
  }

  // Делаем несколько попыток — ждём, пока Wix дорисует контент
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
        log("MAX_ATTEMPTS — остановка");
        clearInterval(timer);
      }
    }, INTERVAL_MS);
  }

  log("init");
  if (document.readyState === "complete" || document.readyState === "interactive") {
    runWithRetries();
  } else {
    document.addEventListener("DOMContentLoaded", runWithRetries);
  }
})();
