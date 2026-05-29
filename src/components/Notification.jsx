import React from 'react';
import { X } from 'lucide-react';

/**
 * Componente de Notificação Padrão do Sistema
 * 
 * Uso:
 * <Notification
 *   message="Mensagem aqui"
 *   actions={[
 *     { label: 'Confirmar', onClick: handleConfirm, variant: 'danger' },
 *     { label: 'Cancelar', onClick: handleCancel, variant: 'light' }
 *   ]}
 *   onClose={() => setShowNotification(false)}
 * />
 */
export function Notification({ message, actions = [], onClose, title }) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-4 shadow-lg flex items-center gap-4 max-w-lg">
      <div className="flex-1">
        {title && <p className="font-bold text-sm">{title}</p>}
        <p className={`${title ? 'text-xs' : 'text-sm'}`}>{message}</p>
      </div>
      
      {actions.length > 0 && (
        <div className="flex gap-2 shrink-0">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`px-3 py-1 font-bold text-xs transition-all whitespace-nowrap ${
                action.variant === 'danger'
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : action.variant === 'light'
                  ? 'bg-white text-red-600 hover:bg-red-50'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-white hover:text-red-100 transition-all shrink-0"
          title="Fechar"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
