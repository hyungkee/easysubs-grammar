// 쿠팡플레이 자막 추출을 위한 JavaScript 파일

let isPlayerReady = false;

console.log("쿠팡플레이 스크립트 로드됨");

// Content Script에서 오는 로그 메시지 수신
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'COUPANGPLAY_LOG') {
    console.log('[Content Script]', event.data.message);
  }
});

// 쿠팡플레이 플레이어가 준비되었는지 확인
function checkPlayerReady() {
  console.log("플레이어 준비 상태 확인 중...");
  const videoElement = document.querySelector("video");
  console.log("비디오 요소:", videoElement);
  
  // 더 다양한 플레이어 컨테이너 선택자들
  const playerSelectors = [
    ".video-player-container",
    ".player-container",
    "[class*='player']",
    "[class*='video']",
    ".media-player",
    ".video-wrapper",
    ".player-wrapper"
  ];
  
  let playerContainer = null;
  for (const selector of playerSelectors) {
    playerContainer = document.querySelector(selector);
    if (playerContainer) {
      console.log("플레이어 컨테이너 발견:", selector);
      break;
    }
  }
  
  if (videoElement && !isPlayerReady) {
    isPlayerReady = true;
    console.log("쿠팡플레이 플레이어 준비됨");
    window.dispatchEvent(new CustomEvent("esCoupangPlayLoaded"));
    window.dispatchEvent(new CustomEvent("esCoupangPlaySubtitleChanged"));
  } else if (videoElement && !playerContainer) {
    // 비디오는 있지만 특정 컨테이너가 없는 경우
    isPlayerReady = true;
    console.log("비디오 요소만으로 플레이어 준비됨");
    window.dispatchEvent(new CustomEvent("esCoupangPlayLoaded"));
  }
}

// 비디오 이벤트 리스너
function setupVideoEventListeners() {
  const videoElement = document.querySelector("video");
  if (videoElement) {
    videoElement.addEventListener("play", () => {
      window.dispatchEvent(new CustomEvent("esCoupangPlayVideoPlay"));
    });

    videoElement.addEventListener("pause", () => {
      window.dispatchEvent(new CustomEvent("esCoupangPlayVideoPause"));
    });

    videoElement.addEventListener("timeupdate", () => {
      window.dispatchEvent(new CustomEvent("esCoupangPlayTimeUpdate", { 
        detail: videoElement.currentTime 
      }));
    });
  }
}

// 쿠팡플레이 DOM 구조 분석
function analyzeCoupangPlayDOM() {
  console.log("=== 쿠팡플레이 DOM 구조 분석 시작 ===");
  
  // 1. 비디오 요소 분석
  const videoElement = document.querySelector("video");
  if (videoElement) {
    console.log("비디오 요소 발견:", videoElement);
    console.log("비디오 부모 요소들:");
    
    let currentElement = videoElement.parentElement;
    let depth = 0;
    while (currentElement && depth < 10) {
      console.log(`  ${depth}단계: ${currentElement.tagName}.${currentElement.className}`);
      currentElement = currentElement.parentElement;
      depth++;
    }
  }
  
  // 2. 모든 컨트롤 관련 요소 찾기
  const controlSelectors = [
    "[class*='control']",
    "[class*='button']", 
    "[class*='toolbar']",
    "[class*='bar']",
    "[class*='nav']",
    "[class*='header']",
    "[class*='menu']",
    "[class*='player']"
  ];
  
  console.log("=== 컨트롤 관련 요소들 ===");
  controlSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`${selector}: ${elements.length}개`);
      elements.forEach((el, index) => {
        if (index < 3) { // 처음 3개만 상세 출력
          const rect = el.getBoundingClientRect();
          console.log(`  ${index}: ${el.tagName}.${el.className} (${rect.width}x${rect.height} at ${rect.left},${rect.top})`);
        }
      });
    }
  });
  
  // 3. 비디오와 가까운 컨트롤 요소들 찾기
  if (videoElement) {
    console.log("=== 비디오 근처 컨트롤 요소들 ===");
    const allElements = document.querySelectorAll("*");
    const nearbyElements = [];
    
    allElements.forEach(element => {
      const rect1 = element.getBoundingClientRect();
      const rect2 = videoElement.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(rect1.left - rect2.left, 2) + 
        Math.pow(rect1.top - rect2.top, 2)
      );
      
      if (distance < 200 && element !== videoElement) { // 200px 이내
        const className = typeof element.className === 'string' 
          ? element.className.toLowerCase() 
          : (element.className?.toString() || '').toLowerCase();
        if (className.includes('control') || className.includes('button') || 
            className.includes('toolbar') || className.includes('bar') ||
            className.includes('nav') || className.includes('header')) {
          nearbyElements.push({ element, distance });
        }
      }
    });
    
    nearbyElements.sort((a, b) => a.distance - b.distance);
    nearbyElements.slice(0, 5).forEach((item, index) => {
      const rect = item.element.getBoundingClientRect();
      console.log(`  ${index}: ${item.element.tagName}.${item.element.className} (거리: ${item.distance.toFixed(2)}px, ${rect.width}x${rect.height})`);
    });
  }
  
  console.log("=== DOM 구조 분석 완료 ===");
}

// 쿠팡플레이 네비게이션 바 찾기
function findNavigationBar() {
  console.log("쿠팡플레이 네비게이션 바 검색 중...");
  
  const navSelectors = [
    // 일반적인 네비게이션 선택자들
    "nav",
    ".navigation",
    ".navbar",
    ".nav-bar",
    ".header",
    ".top-bar",
    ".toolbar",
    // 쿠팡플레이 특화 선택자들 (추정)
    ".coupang-nav",
    ".coupang-header",
    ".play-nav",
    ".player-nav",
    // 더 일반적인 선택자들
    "[class*='nav']",
    "[class*='header']",
    "[class*='toolbar']",
    "[class*='bar']"
  ];
  
  for (const selector of navSelectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`네비게이션 선택자 ${selector}: ${elements.length}개 요소 발견`);
    if (elements.length > 0) {
      console.log(`네비게이션 바 발견: ${selector}`, elements[0]);
      return elements[0];
    }
  }
  
  // 비디오 요소 주변에서 네비게이션 찾기
  const videoElement = document.querySelector("video");
  if (videoElement) {
    const parentElement = videoElement.parentElement;
    if (parentElement) {
      const navElements = parentElement.querySelectorAll("nav, [class*='nav'], [class*='header'], [class*='toolbar']");
      if (navElements.length > 0) {
        console.log("비디오 주변에서 네비게이션 바 발견:", navElements[0]);
        return navElements[0];
      }
    }
  }
  
  console.log("네비게이션 바를 찾지 못함");
  return null;
}

// DOM 변경 감지를 위한 MutationObserver
const domObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      // 새로운 비디오 요소가 추가되었는지 확인
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const videoElement = node.querySelector ? node.querySelector("video") : null;
          if (videoElement || (node.tagName && node.tagName.toLowerCase() === "video")) {
            checkPlayerReady();
            setupVideoEventListeners();
          }
        }
      });
    }
  });
});

// 페이지 로드 시 초기화
function initialize() {
  checkPlayerReady();
  setupVideoEventListeners();
  
  // DOM 변경 감지 시작
  domObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 페이지가 완전히 로드된 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// 3초 후에 DOM 구조 분석 실행
setTimeout(() => {
  analyzeCoupangPlayDOM();
}, 3000);

// 주기적으로 플레이어 상태 확인
setInterval(() => {
  if (!isPlayerReady) {
    checkPlayerReady();
  }
}, 1000);
