import { FC, useState } from "react";
import { createPortal } from "react-dom";

import { $streaming } from "@src/models/streamings";
import { $currentSubs } from "@src/models/subs";
import { $chatGPTApiKey, $chatGPTModel } from "@src/models/settings";

import { useUnit } from "effector-react";
import { SettingsContent } from "./SettingsContent";
import { MonoLogo } from "./assets/MonoLogo";
import { GrammarIcon } from "./assets/GrammarIcon";
import { Toaster } from "react-hot-toast";

type TSettingsProps = {
  contentContainer: HTMLElement;
};

export const Settings: FC<TSettingsProps> = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [streaming, currentSubs, chatGPTApiKey, chatGPTModel] = useUnit([
    $streaming,
    $currentSubs,
    $chatGPTApiKey,
    $chatGPTModel,
  ]);

  const handleSettingsClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
  };

  const handleGrammarClick = async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();

    const text = (currentSubs || [])
      .map((s) => (s?.cleanedText || s?.text || "").trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!text) {
      const id = "es-temp-grammar-toast";
      let toast = document.getElementById(id);
      if (!toast) {
        toast = document.createElement("div");
        toast.id = id;
        toast.className = "es-grammar-toast";
        document.body.appendChild(toast);
      }
      toast.textContent = "현재 자막이 없습니다.";
      toast.classList.add("show");
      window.setTimeout(() => {
        toast?.classList.remove("show");
      }, 2000);
      return;
    }

    const overlayId = "es-grammar-overlay";
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = overlayId;
      overlay.className = "es-grammar-overlay";

      const close = document.createElement("button");
      close.className = "es-grammar-overlay__close";
      close.textContent = "×";
      close.setAttribute("aria-label", "닫기");
      close.onclick = (ev) => {
        ev.stopPropagation();
        overlay?.remove();
      };

      const content = document.createElement("div");
      content.className = "es-grammar-overlay__content";

      overlay.appendChild(close);
      overlay.appendChild(content);
      document.body.appendChild(overlay);
    }

    const contentEl = overlay.querySelector(".es-grammar-overlay__content") as HTMLDivElement;
    if (contentEl) {
      contentEl.textContent = "(분석중)";
    } else {
      overlay.textContent = "(분석중)";
    }

    try {
      const resp = await chrome.runtime.sendMessage({
        type: "analyzeGrammar",
        text,
        chatGPTApiKey: chatGPTApiKey,
        chatGPTModel: chatGPTModel,
      });

      const error = resp && typeof resp === "object" && "error" in resp ? resp.error : null;
      const message = error ? "오류가 발생했습니다." : (typeof resp === "string" ? resp : "");

      if (contentEl) {
        contentEl.textContent = message || "오류가 발생했습니다.";
      } else {
        overlay.textContent = message || "오류가 발생했습니다.";
      }
    } catch (err) {
      if (contentEl) {
        contentEl.textContent = "오류가 발생했습니다.";
      } else {
        overlay.textContent = "오류가 발생했습니다.";
      }
    }
  };

  return (
    <>
      <div className="es-settings-icons">
        <div className="es-settings-icon" onClick={handleGrammarClick}>
          <GrammarIcon />
        </div>
        <div className="es-settings-icon" onClick={handleSettingsClick}>
          <MonoLogo />
        </div>
      </div>
      {showSettings &&
        createPortal(
          <SettingsContent onClose={() => setShowSettings(false)} />,
          streaming.getSettingsContentContainer(),
        )}
      {createPortal(
        <div className="es-toast">
          <Toaster />
        </div>,
        document.querySelector("body"),
      )}
    </>
  );
};
