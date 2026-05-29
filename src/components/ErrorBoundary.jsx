import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary - Captura erros globais da aplicação
 * Evita que a app fique com tela branca em caso de crash
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-linear-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white shadow-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={32} className="text-red-600" />
              <h1 className="text-2xl font-bold text-red-900">Algo deu errado</h1>
            </div>
            
            <p className="text-slate-600 mb-4">
              Desculpe, a aplicação encontrou um erro inesperado. Por favor, tente recarregar a página.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 p-3 mb-4">
                <p className="text-xs font-mono text-red-800 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw size={18} />
              Recarregar Página
            </button>

            <p className="text-xs text-slate-500 mt-4 text-center">
              Se o problema persistir, contacte o administrador.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
