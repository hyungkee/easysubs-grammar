import { FC, useState } from "react";
import { createPortal } from "react-dom";

import { $streaming } from "@src/models/streamings";

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
  const streaming = useUnit($streaming);

  const handleSettingsClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
  };

  const handleGrammarClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    // 임시: 화면 상단에 "Test" 자막 표시
    const id = "es-temp-grammar-toast";
    let toast = document.getElementById(id);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = id;
      toast.className = "es-grammar-toast";
      toast.textContent = "Test";
      document.body.appendChild(toast);
    }
    // 2초 뒤 사라짐
    toast.classList.add("show");
    window.setTimeout(() => {
      toast?.classList.remove("show");
    }, 2000);
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
