import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const TOAST_EVENT = 'simplo:toast';

export function notifyToast(options) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, {
    detail: {
      type: 'success',
      title: 'Tudo certo',
      message: '',
      duration: 3600,
      ...options,
    },
  }));
}

function iconFor(type) {
  if (type === 'error') return <AlertCircle size={18} />;
  if (type === 'info') return <Info size={18} />;
  return <CheckCircle2 size={18} />;
}

export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function handleToast(event) {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast = { id, ...event.detail };
      setToasts((current) => [...current, toast].slice(-4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, toast.duration || 3600);
    }

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <article className={`toast-card ${toast.type || 'success'}`} key={toast.id}>
          <span className="toast-icon">{iconFor(toast.type)}</span>
          <div>
            <strong>{toast.title}</strong>
            {toast.message ? <p>{toast.message}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            aria-label="Fechar aviso"
          >
            <X size={14} />
          </button>
        </article>
      ))}
    </div>
  );
}
