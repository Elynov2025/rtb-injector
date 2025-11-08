/* rtb-injector.js — адаптивный Yandex.RTB R-A-14383531-4 после 6-го абзаца */

(function () {
  "use strict";

  // --- настройки под баннер ---
  var BLOCK_ID = "R-A-14383531-4";        // ID твоего адаптивного блока
  var TARGET_PARAGRAPH_INDEX = 5;         // после 6-го абзаца (индексация с 0)
  var MAX_ATTEMPTS = 20;                  // максимум попыток найти контент
  var INTERVAL_MS = 500;                  // интервал между попытками (мс)

  // контейнеры, где ищем текст статьи
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

  // --- подключаем/ждём API Яндекса ---
  function ensureYandexContext(callback) {
    window.yaContextCb = window.yaContextCb || [];

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

  // --- ищем контейнер с достаточным числом абзацев ---
  function findContainer() {
    for (var i = 0; i < SELECTORS.length; i++) {
      var container = document.querySelector(SELECTORS[i]);
      if (!container) continue;

      var paragraphs = container.querySelectorAll("p");
      if (paragraphs.length > TARGET_PARAGRAPH_INDEX) {
        return { container: container, paragraphs: paragraphs };
      }
    }
    return null;
  }

  // --- вставка блока один раз ---
  function injectOnce() {
    if (injected) return;

    var data = findContainer();
    if (!data) return;

    var targetP = data.paragraphs[TARGET_PARAGRAPH_INDEX];
    if (!targetP) return;

    // id рендера — на основе BLOCK_ID (чтобы не конфликтовать)
    var divId = "yandex_rtb_" + BLOCK_ID.replace(/[^a-zA-Z0-9_]/g, "_");

    // если блок уже есть — ничего не делаем
    if (document.getElementById(divId)) {
      injected = true;
      return;
    }

    var div = document.createElement("div");
    div.id = divId;
    div.style.width = "100%";       // адаптив по ширине контейнера
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
        // размеры не задаём: в кабинете РСЯ блок настроен как адаптивный
      });

      injected = true;
    });
  }

  // --- несколько попыток дождаться контента Wix ---
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
