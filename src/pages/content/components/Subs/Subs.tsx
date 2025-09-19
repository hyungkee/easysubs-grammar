import { FC, useEffect, useRef, useState } from "react";
import { useUnit } from "effector-react";
import Draggable from "react-draggable";

import { $currentSubs } from "@src/models/subs";
import { $video, $wasPaused, wasPausedChanged } from "@src/models/videos";
import { TSub, TSubItem } from "@src/models/types";
import {
  $autoStopEnabled,
  $moveBySubsEnabled,
  $subsBackground,
  $subsBackgroundOpacity,
  $subsFontSize,
} from "@src/models/settings";
import {
  $findPhrasalVerbsPendings,
  subItemMouseEntered,
  subItemMouseLeft,
  $currentPhrasalVerb,
} from "@src/models/translations";
import { addKeyboardEventsListeners, removeKeyboardEventsListeners } from "@src/utils/keyboardHandler";
import { SubItemTranslation } from "./SubItemTranslation";
import { PhrasalVerbTranslation } from "./PhrasalVerbTranslation";
import { SubFullTranslation } from "./SubFullTranslation";

type TSubsProps = {};

export const Subs: FC<TSubsProps> = () => {
  const [video, currentSubs, subsFontSize, moveBySubsEnabled, wasPaused, handleWasPausedChanged, autoStopEnabled] =
    useUnit([$video, $currentSubs, $subsFontSize, $moveBySubsEnabled, $wasPaused, wasPausedChanged, $autoStopEnabled]);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (moveBySubsEnabled) {
      addKeyboardEventsListeners();
    }
    return () => {
      removeKeyboardEventsListeners();
    };
  }, []);

  const handleOnMouseLeave = () => {
    if (wasPaused) {
      video.play();
      console.log("handleWasPausedChanged false");
      handleWasPausedChanged(false);
    }
  };

  const handleOnMouseEnter = () => {
    if (!autoStopEnabled) {
      return;
    }
    if (!video.paused) {
      console.log("handleWasPausedChanged true");

      handleWasPausedChanged(true);
      video.pause();
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyAll = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const text = currentSubs.map((s) => s.cleanedText).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // noop
    }
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Draggable>
      <div
        id="es-subs"
        onMouseLeave={handleOnMouseLeave}
        onMouseEnter={handleOnMouseEnter}
        style={{
          fontSize: `${(((video?.clientWidth ?? window.innerWidth) / 100) * subsFontSize) / 43}px`,
        }}
      >
        {currentSubs.map((sub) => (
          <Sub sub={sub} />
        ))}
        {currentSubs.length > 0 && (
          <>
            <button className="es-subs-copy-btn" title="Copy all subtitles" onClick={handleCopyAll}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </button>
            {copied && <span className="es-subs-copied" aria-live="polite">Copied to Clipboard</span>}
          </>
        )}
      </div>
    </Draggable>
  );
};

const Sub: FC<{ sub: TSub }> = ({ sub }) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [subsBackground, subsBackgroundOpacity, findPhrasalVerbsPendings] = useUnit([
    $subsBackground,
    $subsBackgroundOpacity,
    $findPhrasalVerbsPendings,
  ]);

  const handleOnClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setShowTranslation(true);
  };

  if (findPhrasalVerbsPendings[sub.text]) {
    return null;
  }

  return (
    <div
      className="es-sub"
      onClick={handleOnClick}
      onMouseLeave={() => setShowTranslation(false)}
      style={{
        background: `rgba(0, 0, 0, ${subsBackground ? subsBackgroundOpacity / 100 : 0})`,
      }}
    >
      {sub.items.map((item, index) => (
        <SubItem subItem={item} index={index} />
      ))}
      {showTranslation && <SubFullTranslation text={sub.cleanedText} />}
    </div>
  );
};

type TSubItemProps = {
  subItem: TSubItem;
  index: number;
};

const SubItem: FC<TSubItemProps> = ({ subItem, index }) => {
  const [currentPhrasalVerb, handleSubItemMouseEntered, handleSubItemMouseLeft, findPhrasalVerbsPendings] = useUnit([
    $currentPhrasalVerb,
    subItemMouseEntered,
    subItemMouseLeft,
    $findPhrasalVerbsPendings,
  ]);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleOnMouseLeave = () => {
    setShowTranslation(false);
    handleSubItemMouseLeft();
  };

  const handleOnMouseEnter = () => {
    setShowTranslation(true);
    handleSubItemMouseEntered(subItem.cleanedText);
  };

  const handleClick = () => {
    setShowTranslation(false);
    handleSubItemMouseLeft();
  };

  return (
    <>
      <pre
        onMouseEnter={handleOnMouseEnter}
        onMouseLeave={handleOnMouseLeave}
        className={`es-sub-item ${subItem.tag} ${
          currentPhrasalVerb?.indexes?.includes(index) ? "es-sub-item-highlighted" : ""
        }`}
        onClick={handleClick}
      >
        {subItem.text}
        {!findPhrasalVerbsPendings[subItem.cleanedText] && showTranslation && (
          <>
            {currentPhrasalVerb ? (
              <PhrasalVerbTranslation phrasalVerb={currentPhrasalVerb} />
            ) : (
              <SubItemTranslation text={subItem.cleanedText} />
            )}
          </>
        )}
      </pre>
      <pre className="es-sub-item-space"> </pre>
    </>
  );
};
