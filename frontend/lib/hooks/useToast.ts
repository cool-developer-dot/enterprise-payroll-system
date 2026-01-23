import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let toastIdCounter = 0;
const toastListeners: Set<(toasts: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

export const toast = {
  success: (message: string, duration = 3000) => {
    const id = `toast-${++toastIdCounter}`;
    toasts = [...toasts, { id, type: 'success', message, duration }];
    notifyListeners();
    
    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }
    
    return id;
  },
  
  error: (message: string, duration = 5000) => {
    const id = `toast-${++toastIdCounter}`;
    toasts = [...toasts, { id, type: 'error', message, duration }];
    notifyListeners();
    
    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }
    
    return id;
  },
  
  warning: (message: string, duration = 4000) => {
    const id = `toast-${++toastIdCounter}`;
    toasts = [...toasts, { id, type: 'warning', message, duration }];
    notifyListeners();
    
    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }
    
    return id;
  },
  
  info: (message: string, duration = 3000) => {
    const id = `toast-${++toastIdCounter}`;
    toasts = [...toasts, { id, type: 'info', message, duration }];
    notifyListeners();
    
    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }
    
    return id;
  },
  
  dismiss: (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  },
  
  dismissAll: () => {
    toasts = [];
    notifyListeners();
  },
};

export function useToast() {
  const [toastList, setToastList] = useState<Toast[]>([]);
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToastList(newToasts);
    };
    
    toastListeners.add(listener);
    setToastList([...toasts]);
    
    return () => {
      toastListeners.delete(listener);
    };
  }, []);
  
  const dismiss = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);
  
  return { toasts: toastList, dismiss };
}
