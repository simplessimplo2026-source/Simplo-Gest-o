import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    console.error('Erro de interface:', error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section className="panel empty-panel error-panel app-error-panel">
        <AlertTriangle size={30} />
        <h2>Não foi possível exibir esta tela</h2>
        <p>O app manteve a sessão protegida. Tente carregar novamente para continuar.</p>
        <div className="button-row">
          <button className="ghost-button" type="button" onClick={this.handleRetry}>
            <RefreshCw size={15} /> Tentar novamente
          </button>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            Recarregar app
          </button>
        </div>
      </section>
    );
  }
}
