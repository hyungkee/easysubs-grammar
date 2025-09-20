import { esRenderSetings } from "@src/models/settings";
import Service from "./service";
import { parse, subTitleType } from "subtitle";
import { $video } from "@src/models/videos";
import { Captions } from "@src/models/types";
import { esSubsChanged, subsReloadRequested } from "@src/models/subs";

type TSubCache = {
  originalData?: subTitleType[];
  videoId: string;
  title: string;
  url: string;
  data?: subTitleType[];
};

class CoupangPlay implements Service {
  name = "coupangplay";
  private subtitleUrl: string | null = null;
  private subCache: TSubCache[] = [];
  private currentLanguage: string = "ko"; // 기본 한국어

  constructor() {
    console.log("=== CoupangPlay 서비스 생성자 호출됨 ===");
    // 페이지 콘솔에도 로그 전송
    window.postMessage({ type: 'COUPANGPLAY_LOG', message: '=== CoupangPlay 서비스 생성자 호출됨 ===' }, '*');
    
    // 네트워크 요청 감지 시작
    this.interceptNetworkRequests();
    
    // 쿠팡플레이 비디오 플레이어가 로드될 때까지 대기
    waitForElement("video", () => {
      console.log("비디오 요소 발견, 설정 렌더링 시작");
      window.postMessage({ type: 'COUPANGPLAY_LOG', message: '비디오 요소 발견, 설정 렌더링 시작' }, '*');
      esRenderSetings();
    });
    
    this.handleCoupangPlayLoaded = this.handleCoupangPlayLoaded.bind(this);
    this.handleCoupangPlaySubtitleChanged = this.handleCoupangPlaySubtitleChanged.bind(this);
    
    // 주기적으로 설정 렌더링 확인 (넷플릭스 방식)
    setInterval(() => {
      const videoElement = document.querySelector("video");
      const easysubsSettings = document.querySelector(".es-settings");
      if (videoElement && !easysubsSettings) {
        esRenderSetings();
        subsReloadRequested();
      }
    }, 100);
  }

  public init(): void {
    console.log("=== CoupangPlay init() 메서드 호출됨 ===");
    this.injectScript();
    this.hideOriginalSubtitles();
    window.addEventListener("esCoupangPlayLoaded", this.handleCoupangPlayLoaded as EventListener);
    window.addEventListener("esCoupangPlaySubtitleChanged", this.handleCoupangPlaySubtitleChanged as EventListener);
  }

  public async getSubs(language: string) {
    if (language === "") return parse("");
    
    const videoId = this.getVideoId();
    const subCacheItem = this.subCache.find((item) => item.videoId === videoId && item.title === language);
    
    // 캐시에서 자막 데이터 반환
    if (subCacheItem && subCacheItem.data) {
      console.log("쿠팡플레이 자막 캐시에서 반환:", language);
      return subCacheItem.data;
    }
    
    // 캐시에 없으면 새로 다운로드
    console.log("쿠팡플레이 자막 서버에서 다운로드:", language);
    return new Promise<Captions>((resolve) => {
      const checkForSubtitle = () => {
        this.checkExistingNetworkEntries();
        
        if (this.subtitleUrl) {
          // 자막 URL이 있으면 fetch해서 반환
          window.postMessage({ type: 'COUPANGPLAY_LOG', message: '쿠팡플레이 vtt 다운로드 시작: ' + this.subtitleUrl }, '*');
          fetch(this.subtitleUrl)
            .then(res => {
              if (res.ok) {
                return res.text();
              }
              throw new Error('자막 fetch 실패');
            })
            .then(vttText => {
              console.log('쿠팡플레이 .vtt 자막 다운로드 성공, 길이:', vttText.length);
              window.postMessage({ type: 'COUPANGPLAY_LOG', message: '쿠팡플레이 .vtt 자막 다운로드 성공' }, '*');
              
              const subs = parse(vttText);
              
              // 캐시에 저장
              if (subCacheItem) {
                subCacheItem.originalData = subs;
                subCacheItem.data = subs;
              } else {
                this.subCache.push({
                  videoId: videoId,
                  title: language,
                  url: this.subtitleUrl,
                  originalData: subs,
                  data: subs
                });
              }
              
              resolve(subs);
            })
            .catch(e => {
              console.error('쿠팡플레이 .vtt 자막 fetch 실패:', e);
              window.postMessage({ type: 'COUPANGPLAY_LOG', message: '쿠팡플레이 .vtt 자막 fetch 실패' }, '*');
              // fetch 실패 시 DOM fallback 시도
              this.tryDOMFallback().then(resolve);
            });
        } else {
          // 자막 URL이 없으면 3초 후 다시 확인
          setTimeout(checkForSubtitle, 3000);
        }
      };
      
      // 첫 번째 확인 시작
      checkForSubtitle();
    });
  }
  
  // DOM fallback 메서드
  private async tryDOMFallback(): Promise<Captions> {
    // DOM에서 <track kind="subtitles"> 태그 찾기
    const track: HTMLTrackElement | null = document.querySelector('track[kind="subtitles"]');
    if (track && track.src && track.src.endsWith('.vtt')) {
      try {
        console.log('DOM에서 .vtt 자막 URL 발견:', track.src);
        const res = await fetch(track.src);
        if (res.ok) {
          const vttText = await res.text();
          return parse(vttText);
        }
      } catch (e) {
        console.error('DOM .vtt 자막 fetch 실패:', e);
      }
    }
    
    // 자막이 없으면 빈 자막
    console.log('쿠팡플레이 자막을 찾을 수 없음');
    return parse("");
  }

  public getSubsContainer() {
    console.log("getSubsContainer 시작");
    window.postMessage({ type: 'COUPANGPLAY_LOG', message: 'getSubsContainer 시작' }, '*');
    
    // 넷플릭스/유튜브와 동일하게 비디오 플레이어 컨테이너를 찾기
    const videoElement = document.querySelector("video");
    if (videoElement) {
      // 비디오 요소의 부모 컨테이너를 찾기 (비디오 플레이어 컨테이너)
      let container = videoElement.parentElement;
      while (container && container !== document.body) {
        // 비디오 플레이어 관련 클래스나 ID가 있는 컨테이너 찾기
        const className = container.className?.toString().toLowerCase() || '';
        const id = container.id?.toLowerCase() || '';
        
        if (className.includes('player') || className.includes('video') || 
            className.includes('media') || id.includes('player') || 
            id.includes('video') || id.includes('media')) {
          console.log("비디오 플레이어 컨테이너 발견:", container);
          window.postMessage({ type: 'COUPANGPLAY_LOG', message: `비디오 플레이어 컨테이너 발견: ${container.className || container.id}` }, '*');
          return container as HTMLElement;
        }
        container = container.parentElement;
      }
      
      // 비디오 요소 자체를 컨테이너로 사용 (유튜브 방식)
      console.log("비디오 요소를 컨테이너로 사용:", videoElement);
      window.postMessage({ type: 'COUPANGPLAY_LOG', message: '비디오 요소를 컨테이너로 사용' }, '*');
      return videoElement as HTMLElement;
    }

    console.log("비디오 요소를 찾을 수 없음, 기본 컨테이너 반환");
    window.postMessage({ type: 'COUPANGPLAY_LOG', message: '비디오 요소를 찾을 수 없음, 기본 컨테이너 반환' }, '*');
    
    // 기본 컨테이너로 body 반환
    return document.body;
  }

  public getSettingsButtonContainer() {
    console.log("쿠팡플레이 설정 버튼 컨테이너 검색 중...");
    window.postMessage({ type: 'COUPANGPLAY_LOG', message: '쿠팡플레이 설정 버튼 컨테이너 검색 중...' }, '*');
    
    // 1. 전체화면 버튼을 찾아서 그 왼쪽에 ES 버튼들을 끼워넣기
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
      const fullscreenButton = document.querySelector(selector);
      if (fullscreenButton) {
        console.log("전체화면 버튼 발견:", fullscreenButton);
        window.postMessage({ type: 'COUPANGPLAY_LOG', message: `전체화면 버튼 발견: ${selector}` }, '*');
        
        // 전체화면 버튼의 부모 컨테이너를 찾기
        let container = fullscreenButton.parentElement;
        while (container && container !== document.body) {
          // 컨트롤 관련 클래스가 있는 컨테이너 찾기
          const className = container.className?.toString().toLowerCase() || '';
          if (className.includes('control') || className.includes('button') || 
              className.includes('toolbar') || className.includes('bar')) {
            console.log("전체화면 버튼의 컨트롤 컨테이너 발견:", container);
            window.postMessage({ type: 'COUPANGPLAY_LOG', message: `전체화면 버튼의 컨트롤 컨테이너 발견: ${container.className}` }, '*');
            return container as HTMLElement;
          }
          container = container.parentElement;
        }
        
        // 전체화면 버튼의 직접 부모를 사용
        if (fullscreenButton.parentElement) {
          console.log("전체화면 버튼의 직접 부모 사용:", fullscreenButton.parentElement);
          window.postMessage({ type: 'COUPANGPLAY_LOG', message: '전체화면 버튼의 직접 부모 사용' }, '*');
          return fullscreenButton.parentElement as HTMLElement;
        }
      }
    }
    
    // 2. 기존 컨트롤 버튼들을 찾아서 그 컨테이너에 끼워넣기
    const controlSelectors = [
      // 일반적인 플레이어 컨트롤 선택자들
      ".player-controls",
      ".control-bar", 
      ".video-controls",
      ".player-toolbar",
      ".video-toolbar",
      ".controls",
      ".toolbar",
      // 쿠팡플레이 특화 선택자들
      ".coupang-player-controls",
      ".coupang-controls",
      ".play-controls",
      ".media-controls",
      // 더 일반적인 선택자들
      "[class*='control']",
      "[class*='button']",
      "[class*='toolbar']",
      "[class*='bar']"
    ];
    
    for (const selector of controlSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // 비디오와 가까운 컨트롤 요소 찾기
        const videoElement = document.querySelector("video");
        if (videoElement) {
          let closestElement = null;
          let minDistance = Infinity;
          
          for (const element of elements) {
            const rect1 = element.getBoundingClientRect();
            const rect2 = videoElement.getBoundingClientRect();
            const distance = Math.sqrt(
              Math.pow(rect1.left - rect2.left, 2) + 
              Math.pow(rect1.top - rect2.top, 2)
            );
            
            if (distance < minDistance) {
              minDistance = distance;
              closestElement = element;
            }
          }
          
          if (closestElement) {
            console.log("컨트롤 컨테이너 발견:", closestElement);
            window.postMessage({ type: 'COUPANGPLAY_LOG', message: `컨트롤 컨테이너 발견: ${selector} (거리: ${minDistance.toFixed(2)}px)` }, '*');
            return closestElement as HTMLElement;
          }
        } else {
          console.log("컨트롤 컨테이너 발견:", elements[0]);
          window.postMessage({ type: 'COUPANGPLAY_LOG', message: `컨트롤 컨테이너 발견: ${selector}` }, '*');
          return elements[0] as HTMLElement;
        }
      }
    }
    
    // 3. 비디오 플레이어 컨테이너를 찾아서 그 안에 설정 버튼을 배치
    const videoElement = document.querySelector("video");
    if (videoElement) {
      // 비디오 요소의 부모 컨테이너를 찾기 (비디오 플레이어 컨테이너)
      let container = videoElement.parentElement;
      while (container && container !== document.body) {
        // 비디오 플레이어 관련 클래스나 ID가 있는 컨테이너 찾기
        const className = container.className?.toString().toLowerCase() || '';
        const id = container.id?.toLowerCase() || '';
        
        if (className.includes('player') || className.includes('video') || 
            className.includes('media') || id.includes('player') || 
            id.includes('video') || id.includes('media')) {
          console.log("비디오 플레이어 컨테이너 발견:", container);
          window.postMessage({ type: 'COUPANGPLAY_LOG', message: `비디오 플레이어 컨테이너 발견: ${container.className || container.id}` }, '*');
          return container as HTMLElement;
        }
        container = container.parentElement;
      }
      
      // 비디오 요소 자체를 컨테이너로 사용
      console.log("비디오 요소를 컨테이너로 사용:", videoElement);
      window.postMessage({ type: 'COUPANGPLAY_LOG', message: '비디오 요소를 컨테이너로 사용' }, '*');
      return videoElement as HTMLElement;
    }

    console.log("비디오 요소를 찾을 수 없음, 기본 컨테이너 반환");
    window.postMessage({ type: 'COUPANGPLAY_LOG', message: '비디오 요소를 찾을 수 없음, 기본 컨테이너 반환' }, '*');
    
    // 기본 컨테이너로 body 반환
    return document.body;
  }

  public getSettingsContentContainer() {
    // 쿠팡플레이의 설정 콘텐츠 컨테이너 선택자
    const selectors = [
      ".video-player-container",
      ".player-container",
      "[class*='player']",
      "[class*='video']",
      ".media-player",
      ".video-wrapper",
      ".player-wrapper"
    ];
    
    let selector = null;
    for (const sel of selectors) {
      selector = document.querySelector(sel);
      if (selector) break;
    }
    
    if (!selector) {
      selector = document.querySelector("video")?.parentElement;
    }
    
    if (!selector) {
      selector = document.body;
    }
    
    if (selector === null) throw new Error("Settings content container not found");
    return selector as HTMLElement;
  }

  public isOnFlight() {
    // 더 이상 onflight/실시간 자막 감지 사용 안함
    return false;
  }

  private injectScript(): void {
    console.log("Injecting CoupangPlay script");
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("assets/js/coupangplay.js");
    script.type = "module";
    document.head.prepend(script);
  }

  private hideOriginalSubtitles() {
    console.log("기존 자막 숨기기 시작");
    window.postMessage({ type: 'COUPANGPLAY_LOG', message: '기존 자막 숨기기 시작' }, '*');
    
    // 기존 자막을 숨기는 CSS 스타일 주입
    const style = document.createElement("style");
    style.id = "easysubs-coupangplay-hide-original";
    style.textContent = `
      /* 쿠팡플레이 기존 자막 숨기기 */
      .vjs-text-track-display {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      
      /* 추가 자막 요소들도 숨기기 */
      [class*="subtitle"],
      [class*="caption"],
      [class*="subtitle-text"],
      [class*="caption-text"],
      [class*="video-subtitle"],
      [class*="player-subtitle"],
      [class*="overlay-text"],
      [class*="video-overlay"],
      [class*="player-overlay"],
      .subtitle,
      .caption,
      .subtitle-text,
      .caption-text,
      .video-subtitle,
      .player-subtitle,
      .overlay-text,
      .video-overlay,
      .player-overlay {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `;
    
    // 기존 스타일이 있다면 제거
    const existingStyle = document.getElementById("easysubs-coupangplay-hide-original");
    if (existingStyle) {
      existingStyle.remove();
    }
    
    document.head.appendChild(style);
    console.log("기존 자막 숨기기 CSS 주입 완료");
    window.postMessage({ type: 'COUPANGPLAY_LOG', message: '기존 자막 숨기기 CSS 주입 완료' }, '*');
  }

  private handleCoupangPlayLoaded(): void {
    console.log("=== CoupangPlay loaded 이벤트 수신 ===");
    esRenderSetings();
  }

  private handleCoupangPlaySubtitleChanged(event: CustomEvent): void {
    console.log("CoupangPlay subtitle changed:", event.detail);
    this.currentLanguage = event.detail || "ko";
    esSubsChanged(this.currentLanguage);
  }

  // 비디오 ID 추출 (쿠팡플레이 URL에서)
  private getVideoId(): string {
    // 쿠팡플레이 URL 패턴에서 비디오 ID 추출
    const url = window.location.href;
    const match = url.match(/\/play\/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    // URL에서 추출할 수 없으면 현재 시간 기반 ID 생성
    return `coupang_${Date.now()}`;
  }

  // 네트워크 요청을 감지해서 .vtt 자막 URL 찾기
  private interceptNetworkRequests(): void {
    console.log('쿠팡플레이 네트워크 요청 감지 시작');
    
    // Performance API로 네트워크 요청 감지 (쿠팡에서 덮어씌울 수 없음)
    this.observeNetworkRequests();
    
    // DOM 변경 감지로 자막 URL 찾기
    // this.observeDOMForSubtitleUrls();
  }
  
  // Performance API로 네트워크 요청 감지
  private observeNetworkRequests(): void {
    // 1. 먼저 기존에 이미 발생한 네트워크 요청들 확인
    this.checkExistingNetworkEntries();
    
    // 2. Performance Observer로 새로운 네트워크 요청 감지
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            const url = resourceEntry.name;
                        
            // .vtt 파일 요청 감지
            if (url.includes('.vtt') && url.includes('coupangstreaming') && url.includes('/subtitle/')) {
              console.log('쿠팡플레이 .vtt 자막 URL 감지 (새로운 요청):', url);
              this.subtitleUrl = url;
              window.postMessage({ type: 'COUPANGPLAY_LOG', message: `자막 URL 감지 (새로운 요청): ${url}` }, '*');
            }
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
    
    // 3. 주기적으로 새로운 네트워크 요청 확인 (백업)
    // setInterval(() => {
    //   this.checkExistingNetworkEntries();
    // }, 3000);
  }
  
  // 기존 네트워크 요청 엔트리 확인
  private checkExistingNetworkEntries(): void {
    if ('getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      resources.forEach((resource) => {
        const url = resource.name;
        
        // .vtt 파일 요청 감지
        if (url.includes('.vtt') && url.includes('coupangstreaming') && url.includes('/subtitle/')) {
          console.log('쿠팡플레이 .vtt 자막 URL 감지 (기존 엔트리):', url);
          this.subtitleUrl = url;
          window.postMessage({ type: 'COUPANGPLAY_LOG', message: `자막 URL 감지 (기존 엔트리): ${url}` }, '*');
        }
      });
    }
  }
  
  // DOM 변경을 감지해서 자막 URL 찾기
  private observeDOMForSubtitleUrls(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // track 태그 찾기
              if (element.tagName === 'TRACK' && element.getAttribute('kind') === 'subtitles') {
                const src = element.getAttribute('src');
                if (src && src.includes('.vtt')) {
                  console.log('DOM에서 .vtt 자막 URL 발견:', src);
                  this.subtitleUrl = src;
                  window.postMessage({ type: 'COUPANGPLAY_LOG', message: `DOM 자막 URL 발견: ${src}` }, '*');
                }
              }
              
              // 자식 요소들도 검사
              const tracks = element.querySelectorAll('track[kind="subtitles"]');
              tracks.forEach((track) => {
                const src = track.getAttribute('src');
                if (src && src.includes('.vtt')) {
                  console.log('DOM에서 .vtt 자막 URL 발견 (자식):', src);
                  this.subtitleUrl = src;
                  window.postMessage({ type: 'COUPANGPLAY_LOG', message: `DOM 자막 URL 발견 (자식): ${src}` }, '*');
                }
              });
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

}

function waitForElement(selector: string, callBack: () => void) {
  window.setTimeout(function () {
    const element = document.querySelector(selector);
    if (element) {
      callBack();
    } else {
      waitForElement(selector, callBack);
    }
  }, 300);
}

export default CoupangPlay;
