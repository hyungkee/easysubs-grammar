import { FC, useState } from "react";
import { createPortal } from "react-dom";

import { $streaming } from "@src/models/streamings";
import { $currentSubs, $subs } from "@src/models/subs";
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
  const [streaming, currentSubs, allSubs, chatGPTApiKey, chatGPTModel] = useUnit([
    $streaming,
    $currentSubs,
    $subs,
    $chatGPTApiKey,
    $chatGPTModel,
  ]);

  const handleSettingsClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
  };

  const handleGrammarClick = async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();

    const toNormalized = (s: string) => s.replace(/\s+/g, " ").trim();
    const endsWithSentencePunctuation = (s: string) => /[.!?…]["'”’)]*$/.test(s.trim());
    const splitIntoSentences = (s: string) =>
      (s.match(/[^.!?…]+[.!?…]*\s*/g) || []).map((x) => x.trim()).filter(Boolean);

    let text = "";

    if (currentSubs && currentSubs.length > 0 && allSubs && allSubs.length > 0) {
      const windowSize = 5; // 앞뒤 5개 자막 고려
      const currentIndex = currentSubs[0].id;
      const startIndex = Math.max(0, currentIndex - windowSize);
      const endIndex = Math.min(allSubs.length - 1, currentIndex + windowSize);

      const contextText = allSubs
        .slice(startIndex, endIndex + 1)
        .map((s) => (s?.cleanedText || s?.text || "").trim())
        .filter(Boolean)
        .join(" ");

      const currentText = toNormalized(
        (currentSubs || [])
          .map((s) => (s?.cleanedText || s?.text || "").trim())
          .filter(Boolean)
          .join(" ")
      );

      const sentences = splitIntoSentences(contextText);
      const normalizedSentences = sentences.map(toNormalized);
      const candidateIndexes = normalizedSentences
        .map((sent, idx) => ({ idx, includes: sent.includes(currentText), len: sent.length }))
        .filter((x) => x.includes)
        .sort((a, b) => b.len - a.len);

      if (candidateIndexes.length > 0) {
        text = sentences[candidateIndexes[0].idx];
      } else {
        // 문장 분리가 어렵다면, 구두점 기준으로 좌/우 경계를 확장해서 선택
        let left = startIndex - 1;
        for (let i = currentIndex; i >= startIndex; i -= 1) {
          const s = allSubs[i];
          if (endsWithSentencePunctuation(s?.cleanedText || s?.text || "")) {
            left = i;
            break;
          }
        }

        let right = endIndex;
        for (let i = currentIndex; i <= endIndex; i += 1) {
          const s = allSubs[i];
          if (endsWithSentencePunctuation(s?.cleanedText || s?.text || "")) {
            right = i;
            break;
          }
        }

        const sliceStart = Math.min(endIndex, Math.max(startIndex, left + 1));
        const sliceEnd = Math.max(sliceStart, right);
        text = allSubs
          .slice(sliceStart, sliceEnd + 1)
          .map((s) => (s?.cleanedText || s?.text || "").trim())
          .filter(Boolean)
          .join(" ")
          .trim();

        if (!text) {
          // 최후 수단으로 윈도우 텍스트 사용
          text = toNormalized(contextText);
        }
      }
    }

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
      // 닫기 버튼: 리스너/옵저버 정리 후 제거
      close.onclick = (ev) => {
        ev.stopPropagation();
        try {
          (overlay as any)?._cleanup?.();
        } catch (_) {}
        overlay?.remove();
      };

      const content = document.createElement("div");
      content.className = "es-grammar-overlay__content";

      overlay.appendChild(close);
      overlay.appendChild(content);
      // 오버레이를 서비스별 자막/플레이어 컨테이너에 부착 (없으면 body로 폴백)
      let attachContainer: HTMLElement = document.body;
      try {
        attachContainer = streaming.getSubsContainer() || document.body;
      } catch (_) {
        attachContainer = document.body;
      }
      attachContainer.appendChild(overlay);
    }

    // 기존에 다른 컨테이너에 붙어 있었다면 현재 서비스 컨테이너로 이동
    try {
      const desiredContainer = streaming.getSubsContainer() || document.body;
      if (overlay.parentElement !== desiredContainer) {
        desiredContainer.appendChild(overlay);
      }
    } catch (_) {
      if (overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
      }
    }

    // 영상 기준 상단 중앙으로 오버레이 위치 고정
    const positionOverlay = () => {
      if (!overlay) return;
      try {
        let targetContainer: HTMLElement | null = null;
        try {
          targetContainer = streaming.getSubsContainer();
        } catch (_) {
          targetContainer = null;
        }
        const videoEl = (targetContainer?.querySelector?.("video") as HTMLElement) ||
          (document.querySelector(".html5-main-video") as HTMLElement) ||
          (targetContainer as HTMLElement) ||
          (document.querySelector("video") as HTMLElement) ||
          null;

        if (!videoEl) {
          // 폴백: 기본 CSS로 화면 중앙 상단
          overlay.removeAttribute("style");
          return;
        }

        const rect = videoEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const topY = rect.top + 12; // 영상 상단에서 약간 아래

        overlay.setAttribute(
          "style",
          [
            "position: fixed",
            `left: ${Math.round(centerX)}px`,
            `top: ${Math.round(Math.max(8, topY))}px`,
            "transform: translateX(-50%)",
            "z-index: 2147483647",
            `max-width: ${Math.round(Math.min(Math.max(rect.width - 24, 240), 960))}px`,
          ].join("; ")
        );
      } catch (_) {
        // 폴백: 기본 CSS 유지
        overlay.removeAttribute("style");
      }
    };

    // 최초 위치 계산
    positionOverlay();

    // 리사이즈/스크롤/플레이어 변화에 대응
    const onResize = () => positionOverlay();
    const onScroll = () => positionOverlay();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    // 플레이어 크기 변화 감지 (영상 요소 기준)
    let ro: ResizeObserver | null = null;
    try {
      const roTarget = (document.querySelector(".html5-main-video") as HTMLElement) ||
        (streaming.getSubsContainer?.() as HTMLElement) ||
        null;
      if (roTarget && "ResizeObserver" in window) {
        ro = new ResizeObserver(() => positionOverlay());
        ro.observe(roTarget);
      }
    } catch (_) {}

    (overlay as any)._cleanup = () => {
      window.removeEventListener("resize", onResize as any);
      window.removeEventListener("scroll", onScroll as any);
      try { ro?.disconnect(); } catch (_) {}
    };

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
