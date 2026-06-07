import { useCallback, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

function ConfirmDialog({ title, message, details, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <header>
          <span className="confirm-icon"><AlertTriangle size={21} /></span>
          <div>
            <h2 id="confirm-title">{title}</h2>
            <p>{message}</p>
          </div>
          <button type="button" className="icon-button dark" onClick={onCancel} aria-label="Fechar"><X size={17} /></button>
        </header>
        {details ? <div className="confirm-details">{details}</div> : null}
        <footer>
          <button type="button" className="ghost-button" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="confirm-danger-button" onClick={onConfirm}>{confirmLabel}</button>
        </footer>
      </section>
    </div>
  );
}

export function useConfirmDialog() {
  const [request, setRequest] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequest({
      title: 'Confirmar ação',
      message: 'Deseja continuar?',
      details: '',
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
      ...options,
      resolve,
    });
  }), []);

  function close(result) {
    request?.resolve(result);
    setRequest(null);
  }

  const confirmDialog = request ? (
    <ConfirmDialog
      title={request.title}
      message={request.message}
      details={request.details}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
