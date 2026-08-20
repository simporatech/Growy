/**
 * Safe LocalStorage access with robust try/catch blocks and generic fallbacks
 */

export const safeGetStorage = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) return fallback;
    const parsed = JSON.parse(item);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from LocalStorage:`, e);
    return fallback;
  }
};

export const safeSetStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to LocalStorage:`, e);
  }
};

export const safeRemoveStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing ${key} from LocalStorage:`, e);
  }
};
