import { FC } from "react";
import { useUnit } from "effector-react";

import {
  $chatGPTApiKey,
  $chatGPTModel,
  chatGPTApiKeyModalOpened,
} from "@src/models/settings";
// Removed API Key preview import

export const OpenAISettings: FC = () => {
  const [currentApiKey, currentModel, openModal] = useUnit([
    $chatGPTApiKey,
    $chatGPTModel,
    chatGPTApiKeyModalOpened,
  ]);

  const hasApiKey = currentApiKey && currentApiKey.length > 0;

  return (
    <div className="es-settings-item">
      <div className="es-settings-item__header">
        <h4 className="es-settings-item__title">OpenAI API Settings</h4>
        <p className="es-settings-item__description">
          Configure your OpenAI API key for translation and AI features.
        </p>
      </div>

      <div className="es-settings-item__content">
        <div className="es-openai-settings">
          <div className="es-openai-settings__status">
            <div className="es-openai-settings__status-item">
              <span className="es-openai-settings__label">API Key Status:</span>
              <span 
                className={`es-openai-settings__value ${
                  hasApiKey ? 'es-openai-settings__value--success' : 'es-openai-settings__value--warning'
                }`}
              >
                {hasApiKey ? '✅ Configured' : '⚠️ Not Set'}
              </span>
            </div>

            {hasApiKey && (
              <div className="es-openai-settings__status-item">
                <span className="es-openai-settings__label">Model:</span>
                <span className="es-openai-settings__value">{currentModel}</span>
              </div>
            )}
          </div>

          <div className="es-openai-settings__actions">
            <button
              className="es-openai-settings__button"
              onClick={() => openModal()}
            >
              {hasApiKey ? 'Edit API Key' : 'Set API Key'}
            </button>
          </div>

          {!hasApiKey && (
            <div className="es-openai-settings__notice">
              <p>
                Setting up your OpenAI API key enables more accurate translations and advanced AI features.
              </p>
              <ul>
                <li>• Context-aware translations</li>
                <li>• Natural expression conversion</li>
                <li>• Contextual translation suggestions</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};