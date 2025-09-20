import { createRoot } from "react-dom/client";
import refreshOnUpdate from "virtual:reload-on-update-in-view";

import { $streaming, fetchCurrentStreamingFx } from "@src/models/streamings";
import { esRenderSetings } from "@src/models/settings";
import { esSubsChanged } from "@src/models/subs";
import { $video, getCurrentVideoFx, videoTimeUpdate } from "@src/models/videos";
import { Settings } from "@src/pages/content/components/Settings";
import { Subs } from "./components/Subs";
import { ProgressBar } from "./components/ProgressBar";
import { removeKeyboardEventsListeners } from "@src/utils/keyboardHandler";

// 전체화면 버튼을 찾는 헬퍼 함수
function findFullscreenButton(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null;
  
  const fullscreenSelectors = [
    // 일반적인 전체화면 버튼 선택자들
    "[aria-label*='fullscreen']",
    "[aria-label*='전체화면']",
    "[title*='fullscreen']",
    "[title*='전체화면']",
    "[class*='fullscreen']",
    "[class*='expand']",
    "[class*='maximize']",
    // 아이콘 기반 선택자들
    "button[class*='fullscreen']",
    "button[class*='expand']",
    "button[class*='maximize']",
    // SVG 아이콘 선택자들
    "svg[class*='fullscreen']",
    "svg[class*='expand']",
    "svg[class*='maximize']"
  ];
  
  for (const selector of fullscreenSelectors) {
    const button = container.querySelector(selector);
    if (button) {
      return button as HTMLElement;
    }
  }
  
  return null;
}

refreshOnUpdate("pages/content");

fetchCurrentStreamingFx();

const handleTimeUpdate = () => {
  videoTimeUpdate();
};

$streaming.watch((streaming) => {
  console.log("streaming changed", streaming);
  document.body.classList.add("es-" + streaming.name);

  if (streaming == null) {
    return;
  }

  esRenderSetings.watch(() => {
    console.log("Event:", "esRenderSetings");
    console.log("현재 스트리밍 서비스:", streaming.name);
    document.querySelectorAll(".es-settings").forEach((e) => e.remove());
    console.log("설정 버튼 컨테이너 검색 시작...");
    const buttonContainer = streaming.getSettingsButtonContainer();
    console.log("설정 콘텐츠 컨테이너 검색 시작...");
    const contentContainer = streaming.getSettingsContentContainer();

    const parentNode = buttonContainer?.parentNode;
    const settingNode = document.createElement("div");
    settingNode.className = "es-settings";
    
    // 쿠팡플레이의 경우 전체화면 버튼 왼쪽에 ES 버튼들을 삽입
    if (streaming.name === "coupangplay") {
      const fullscreenButton = findFullscreenButton(buttonContainer);
      if (fullscreenButton) {
        console.log("전체화면 버튼 왼쪽에 ES 버튼 삽입");
        fullscreenButton.parentNode?.insertBefore(settingNode, fullscreenButton);
      } else {
        // 전체화면 버튼을 찾지 못한 경우 컨테이너 끝에 추가
        buttonContainer?.appendChild(settingNode);
      }
    } else {
      // 다른 서비스들은 기존 방식 유지
      parentNode?.insertBefore(settingNode, buttonContainer);
    }

    getCurrentVideoFx();
    $video.watch((video) => {
      video?.removeEventListener("timeupdate", handleTimeUpdate as EventListener);
      video?.addEventListener("timeupdate", handleTimeUpdate as EventListener);
    });
    createRoot(settingNode).render(<Settings contentContainer={contentContainer} />);
  });

  streaming.init();
});

esSubsChanged.watch((language) => {
  console.log("Event:", "esSubsChanged");
  console.log("Language:", language);
  removeKeyboardEventsListeners();
  document.querySelectorAll("#es").forEach((e) => e.remove());
  const subsContainer = $streaming.getState().getSubsContainer();
  const subsNode = document.createElement("div");
  subsNode.id = "es";
  subsContainer?.appendChild(subsNode);
  createRoot(subsNode).render(<Subs />);

  if (!$streaming.getState().isOnFlight()) {
    document.querySelectorAll(".es-progress-bar").forEach((e) => e.remove());
    const progressBarNode = document.createElement("div");
    progressBarNode.classList.add("es-progress-bar");
    subsContainer?.appendChild(progressBarNode);
    createRoot(progressBarNode).render(<ProgressBar />);
  }
});
