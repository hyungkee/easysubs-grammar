import reloadOnUpdate from "virtual:reload-on-update-in-background-script";

import {
  TWordTranslate,
  googleTranslateBatchFetcher,
} from "@src/utils/googleTranslateBatchFetcher";
import { googleTranslateSingleFetcher } from "@src/utils/googleTranslateSingleFetcher";
import { deeplTranslateFetcher } from "@src/utils/deeplTranslateFetcher";
import { bingTranslateFetcher } from "@src/utils/bingTranslateFetcher";
import { yandexTranslateFetcher } from "@src/utils/yandexTranslateFetcher";
import { chatGPTTranslateFetcher } from "@src/utils/chatGPTTranslateFetcher";

import "webext-dynamic-content-scripts";

reloadOnUpdate("pages/background");

/**
 * Extension reloading is necessary because the browser automatically caches the css.
 * If you do not use the css of the content script, please delete it.
 */
reloadOnUpdate("pages/content/style.scss");

console.log("background loaded");

chrome.runtime.onInstalled.addListener(function (object) {
  const onboardingUrl = "https://easysubs.cc/onboarding/";

  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: onboardingUrl }, function (tab) {
      console.log("New tab launched with options page");
    });
  }
});

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  console.log("read: ", message);

  if (message.type === "translateWord") {
    googleTranslateBatchFetcher
      .getWordTranslation({ text: message.text, lang: message.language })
      .then((respData: TWordTranslate) => sendResponse(respData));
  }
  if (message.type === "translateWordFull") {
    googleTranslateBatchFetcher
      .getWordFullTranslation({ text: message.text, lang: message.language })
      .then((respData: unknown) => sendResponse(respData));
  }
  if (message.type === "translateFullText") {
    const translationService = message.translationService || "google";

    if (translationService === "deepl") {
      deeplTranslateFetcher.setApiKey(message.deeplApiKey);
      deeplTranslateFetcher
        .getFullTextTranslation({ text: message.text, lang: message.language })
        .then((respData: string) => sendResponse(respData))
        .catch((error: Error) => sendResponse({ error: error.message }));
    } else if (translationService === "bing") {
      bingTranslateFetcher
        .getFullTextTranslation({ text: message.text, lang: message.language })
        .then((respData: string) => sendResponse(respData))
        .catch((error: Error) => sendResponse({ error: error.message }));
    } else if (translationService === "yandex") {
      yandexTranslateFetcher
        .getFullTextTranslation({ text: message.text, lang: message.language })
        .then((respData: string) => sendResponse(respData))
        .catch((error: Error) => sendResponse({ error: error.message }));
    } else if (translationService === "chatgpt") {
      chatGPTTranslateFetcher.setApiKey(message.chatGPTApiKey, message.chatGPTModel);
      chatGPTTranslateFetcher
        .getFullTextTranslation({ text: message.text, lang: message.language })
        .then((respData: string) => sendResponse(respData))
        .catch((error: Error) => sendResponse({ error: error.message }));
    } else {
      googleTranslateSingleFetcher
        .getFullTextTranslation({ text: message.text, lang: message.language })
        .then((respData: unknown) => sendResponse(respData));
    }
  }
  if (message.type === "getTextLanguage") {
    googleTranslateBatchFetcher
      .getTextLanguage({ text: message.text, lang: message.language })
      .then((respData: unknown) => sendResponse(respData));
  }

  if (message.type === "postFormDataRequest") {
    console.log("postFormDataRequest: ", message);

    const formData = new FormData();
    for (const key in message.data) {
      formData.append(key, message.data[key].toString());
    }

    fetch(message.url, {
      method: "POST",
      body: formData,
    })
      .then((resp) => resp.json())
      .then((data) => sendResponse(data));
  }
  if (message.type === "post") {
    console.log("Post request: ", message);

    fetch(message.url, {
      method: "POST",
      body: JSON.stringify(message.data),
    })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }
        return resp.json();
      })
      .then((data) => sendResponse(data))
      .catch((error) => {
        sendResponse({ error: error.message || error });
      });
  }

  if (message.type === "analyzeGrammar") {
    const apiKey: string = message.chatGPTApiKey || "";
    const model: string = message.chatGPTModel || "gpt-4o-mini";
    const text: string = message.text || "";

    if (!apiKey) {
      sendResponse({ error: "OPENAI_API_KEY_MISSING" });
      return true;
    }

    const prompt = chrome.i18n.getMessage("grammar_prompt", text);

    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          const errorText = await resp.text().catch(() => "");
          throw new Error(`HTTP ${resp.status}: ${errorText}`);
        }
        return resp.json();
      })
      .then((data) => {
        const content = data?.choices?.[0]?.message?.content || "";
        sendResponse(content);
      })
      .catch((error) => {
        console.error("analyzeGrammar error:", error);
        sendResponse({ error: error.message || String(error) });
      });

    return true;
  }

  return true;
});
