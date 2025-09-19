import { FC, useState, useEffect } from "react";
import { useUnit } from "effector-react";

import {
  $chatGPTApiKeyModalOpen,
  chatGPTApiKeyModalClosed,
  $chatGPTApiKey,
  chatGPTApiKeyChanged,
  $chatGPTModel,
  chatGPTModelChanged,
} from "@src/models/settings";
import { 
  validateOpenAIApiKey, 
  maskApiKey,
  saveOpenAIConfig,
  loadOpenAIConfig 
} from "@src/utils/openaiStorage";

export const ChatGPTApiKeyModal: FC = () => {
  const [
    isModalOpen,
    handleModalClose,
    currentApiKey,
    handleApiKeyChange,
    currentModel,
    handleModelChange,
  ] = useUnit([
    $chatGPTApiKeyModalOpen,
    chatGPTApiKeyModalClosed,
    $chatGPTApiKey,
    chatGPTApiKeyChanged,
    $chatGPTModel,
    chatGPTModelChanged,
  ]);

  const [tempApiKey, setTempApiKey] = useState(currentApiKey);
  const [tempModel, setTempModel] = useState(currentModel);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      setTempApiKey(currentApiKey);
      setTempModel(currentModel);
      setValidationError('');
      setShowApiKey(false);
    }
  }, [isModalOpen, currentApiKey, currentModel]);

  const handleSave = async () => {
    setIsValidating(true);
    setValidationError('');

    try {
      // API key validation
      if (!validateOpenAIApiKey(tempApiKey)) {
        setValidationError('Invalid API key format. OpenAI API keys must start with "sk-".');
        setIsValidating(false);
        return;
      }

      // Save to Chrome storage
      await saveOpenAIConfig({
        apiKey: tempApiKey,
        model: tempModel
      });

      // Update Effector store
      handleApiKeyChange(tempApiKey);
      handleModelChange(tempModel);
      handleModalClose();
    } catch (error) {
      setValidationError('Error occurred while saving settings. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCancel = () => {
    setTempApiKey(currentApiKey);
    setTempModel(currentModel);
    setValidationError('');
    setShowApiKey(false);
    handleModalClose();
  };

  const handleTempApiKeyChange = (value: string) => {
    setTempApiKey(value);
    setValidationError('');
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  if (!isModalOpen) {
    return null;
  }

  return (
    <div className="es-modal-overlay">
      <div className="es-modal-content">
        <div className="es-modal-header">
          <h3>ChatGPT API Key Configuration</h3>
          <button className="es-modal-close" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="es-modal-body">
          {validationError && (
            <div className="es-modal-error">
              {validationError}
            </div>
          )}

          <div className="es-modal-field">
            <label htmlFor="chatgpt-api-key">
              OpenAI API Key:
              <span className="es-modal-required">*</span>
            </label>
            <div className="es-modal-input-group">
              <input
                id="chatgpt-api-key"
                type={showApiKey ? "text" : "password"}
                value={tempApiKey}
                onChange={(e) => handleTempApiKeyChange(e.target.value)}
                placeholder="sk-..."
                className={`es-modal-input ${validationError ? 'es-modal-input--error' : ''}`}
                disabled={isValidating}
              />
              <button
                type="button"
                className="es-modal-toggle-visibility"
                onClick={toggleShowApiKey}
                title={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {currentApiKey && !showApiKey && (
              <div className="es-modal-masked-key">
                Currently saved key: {maskApiKey(currentApiKey)}
              </div>
            )}
          </div>

          <div className="es-modal-field">
            <label htmlFor="chatgpt-model">
              Model:
              <span className="es-modal-required">*</span>
            </label>
            <select
              id="chatgpt-model"
              value={tempModel}
              onChange={(e) => setTempModel(e.target.value)}
              className="es-modal-input"
              disabled={isValidating}
            >
              <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div className="es-modal-info">
            <p>
              OpenAI API key is required for translation features. Please enter your API key and select a model to use.
            </p>
            <p>
              Get your OpenAI API key at{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                platform.openai.com/api-keys
              </a>
            </p>
            <p>
              <strong>Note:</strong> Usage is based on OpenAI's pricing model. 
              Monitor your usage to avoid unexpected charges.
            </p>
            <p>
              <strong>Security:</strong> Your API key is securely stored in local browser storage 
              and is never transmitted externally.
            </p>
          </div>
        </div>

        <div className="es-modal-footer">
          <button
            className="es-modal-button es-modal-button--secondary"
            onClick={handleCancel}
            disabled={isValidating}
          >
            Cancel
          </button>
          <button
            className="es-modal-button es-modal-button--primary"
            onClick={handleSave}
            disabled={isValidating || !tempApiKey.trim() || !tempModel.trim()}
          >
            {isValidating ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
