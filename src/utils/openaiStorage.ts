/**
 * OpenAI API Key Storage Utility
 * Chrome storage를 사용하여 OpenAI API 키를 안전하게 저장하고 관리하는 유틸리티
 */

const OPENAI_API_KEY_STORAGE_KEY = 'openai_api_key';
const OPENAI_MODEL_STORAGE_KEY = 'openai_model';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
}

/**
 * OpenAI API 키를 Chrome storage에 저장
 */
export const saveOpenAIApiKey = async (apiKey: string): Promise<void> => {
  try {
    await chrome.storage.local.set({
      [OPENAI_API_KEY_STORAGE_KEY]: apiKey
    });
  } catch (error) {
    console.error('Failed to save OpenAI API key:', error);
    throw new Error('Failed to save API key.');
  }
};

/**
 * Save OpenAI model to Chrome storage
 */
export const saveOpenAIModel = async (model: string): Promise<void> => {
  try {
    await chrome.storage.local.set({
      [OPENAI_MODEL_STORAGE_KEY]: model
    });
  } catch (error) {
    console.error('Failed to save OpenAI model:', error);
    throw new Error('Failed to save model.');
  }
};

/**
 * Save all OpenAI configuration
 */
export const saveOpenAIConfig = async (config: OpenAIConfig): Promise<void> => {
  try {
    await chrome.storage.local.set({
      [OPENAI_API_KEY_STORAGE_KEY]: config.apiKey,
      [OPENAI_MODEL_STORAGE_KEY]: config.model
    });
  } catch (error) {
    console.error('Failed to save OpenAI configuration:', error);
    throw new Error('Failed to save configuration.');
  }
};

/**
 * Load OpenAI API key from Chrome storage
 */
export const loadOpenAIApiKey = async (): Promise<string> => {
  try {
    const result = await chrome.storage.local.get([OPENAI_API_KEY_STORAGE_KEY]);
    return result[OPENAI_API_KEY_STORAGE_KEY] || '';
  } catch (error) {
    console.error('Failed to load OpenAI API key:', error);
    return '';
  }
};

/**
 * Load OpenAI model from Chrome storage
 */
export const loadOpenAIModel = async (): Promise<string> => {
  try {
    const result = await chrome.storage.local.get([OPENAI_MODEL_STORAGE_KEY]);
    return result[OPENAI_MODEL_STORAGE_KEY] || 'gpt-4o-mini';
  } catch (error) {
    console.error('Failed to load OpenAI model:', error);
    return 'gpt-4o-mini';
  }
};

/**
 * Load all OpenAI configuration
 */
export const loadOpenAIConfig = async (): Promise<OpenAIConfig> => {
  try {
    const result = await chrome.storage.local.get([
      OPENAI_API_KEY_STORAGE_KEY,
      OPENAI_MODEL_STORAGE_KEY
    ]);
    
    return {
      apiKey: result[OPENAI_API_KEY_STORAGE_KEY] || '',
      model: result[OPENAI_MODEL_STORAGE_KEY] || 'gpt-4o-mini'
    };
  } catch (error) {
    console.error('Failed to load OpenAI configuration:', error);
    return {
      apiKey: '',
      model: 'gpt-4o-mini'
    };
  }
};

/**
 * Remove OpenAI API key
 */
export const removeOpenAIApiKey = async (): Promise<void> => {
  try {
    await chrome.storage.local.remove([OPENAI_API_KEY_STORAGE_KEY]);
  } catch (error) {
    console.error('Failed to remove OpenAI API key:', error);
    throw new Error('Failed to remove API key.');
  }
};

/**
 * Remove all OpenAI configuration
 */
export const removeOpenAIConfig = async (): Promise<void> => {
  try {
    await chrome.storage.local.remove([
      OPENAI_API_KEY_STORAGE_KEY,
      OPENAI_MODEL_STORAGE_KEY
    ]);
  } catch (error) {
    console.error('Failed to remove OpenAI configuration:', error);
    throw new Error('Failed to remove configuration.');
  }
};

/**
 * Check if API key is configured
 */
export const hasOpenAIApiKey = async (): Promise<boolean> => {
  const apiKey = await loadOpenAIApiKey();
  return apiKey.length > 0;
};

/**
 * Validate API key format (basic format check)
 */
export const validateOpenAIApiKey = (apiKey: string): boolean => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // OpenAI API keys typically start with "sk-" and are at least 20 characters long
  return apiKey.startsWith('sk-') && apiKey.length >= 20;
};

/**
 * Mask API key for display (for security)
 */
export const maskApiKey = (apiKey: string): string => {
  if (!apiKey || apiKey.length < 8) {
    return '';
  }
  
  const start = apiKey.substring(0, 8);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = '*'.repeat(Math.max(0, apiKey.length - 12));
  
  return `${start}${middle}${end}`;
};
