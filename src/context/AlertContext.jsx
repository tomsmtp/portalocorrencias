import React, { useState, useCallback } from 'react';
import { AlertCircle, Check, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Context para Alertas Centralizados
 * Permite que qualquer componente dispare alertas sem gerenciar estado local
 */
export const AlertContext = React.createContext();

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [confirming, setConfirming] = useState(null);

  const showAlert = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const newAlert = { id, message, type };
    
    setAlerts(prev => [...prev, newAlert]);

    // Auto-remover após duração
    if (duration > 0) {
      setTimeout(() => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const success = useCallback((message, duration = 3000) => {
    return showAlert(message, 'success', duration);
  }, [showAlert]);

  const error = useCallback((message, duration = 5000) => {
    return showAlert(message, 'error', duration);
  }, [showAlert]);

  const info = useCallback((message, duration = 3000) => {
    return showAlert(message, 'info', duration);
  }, [showAlert]);

  const warning = useCallback((message, duration = 4000) => {
    return showAlert(message, 'warning', duration);
  }, [showAlert]);

  const confirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setConfirming({
        title,
        message,
        onConfirm: () => {
          setConfirming(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirming(null);
          resolve(false);
        }
      });
    });
  }, []);

  const value = {
    showAlert,
    removeAlert,
    success,
    error,
    info,
    warning,
    confirm,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertContainer alerts={alerts} onRemove={removeAlert} />
      {confirming && <ConfirmDialog {...confirming} />}
    </AlertContext.Provider>
  );
}

/**
 * Hook para usar alertas
 */
export function useAlert() {
  const context = React.useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert deve ser usado dentro de <AlertProvider>');
  }
  return context;
}

/**
 * Componente que renderiza os alertas
 */
function AlertContainer({ alerts, onRemove }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <Check size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-amber-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="flex flex-col gap-2 max-w-lg w-full mx-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`${getStyles(alert.type)} px-6 py-4 shadow-lg flex items-center gap-3 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200`}
          >
          <div className="flex items-center gap-3 flex-1">
            {getIcon(alert.type)}
            <p className="font-bold text-sm">{alert.message}</p>
          </div>
          <button
            onClick={() => onRemove(alert.id)}
            className="ml-2 hover:opacity-75 transition-opacity shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      ))}
      </div>
    </div>
  );
}

/**
 * Componente de Diálogo de Confirmação
 */
function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 shadow-xl max-w-sm w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
