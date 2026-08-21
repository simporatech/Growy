import { useState, useEffect } from 'react';

let activeModalCount = 0;
const listeners = new Set();

function notify() {
  const isOpen = activeModalCount > 0;
  if (typeof document !== 'undefined' && document.body) {
    if (isOpen) {
      document.body.setAttribute('data-modal-open', 'true');
      document.body.classList.add('modal-open');
    } else {
      document.body.removeAttribute('data-modal-open');
      document.body.classList.remove('modal-open');
    }
  }
  listeners.forEach(listener => {
    try {
      listener(isOpen);
    } catch (err) {
      console.error('Error in modal state listener:', err);
    }
  });
}

export function registerModal() {
  activeModalCount++;
  notify();
  let closed = false;
  return () => {
    if (!closed) {
      closed = true;
      activeModalCount = Math.max(0, activeModalCount - 1);
      notify();
    }
  };
}

export function isAnyModalOpen() {
  return activeModalCount > 0;
}

export function useIsAnyModalOpen() {
  const [isOpen, setIsOpen] = useState(() => activeModalCount > 0);

  useEffect(() => {
    const handleUpdate = (val) => setIsOpen(val);
    listeners.add(handleUpdate);
    setIsOpen(activeModalCount > 0);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return isOpen;
}
