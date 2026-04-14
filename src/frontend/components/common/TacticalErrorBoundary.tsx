import * as React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TacticalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[FATAL_CRASH] Tactical Error Boundary caught:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-slate-200 font-sans">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
              <div className="relative bg-red-500/10 border border-red-500/20 p-6 rounded-[2.5rem] inline-flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Error de Operaciones</h1>
              <p className="text-slate-400 text-sm leading-relaxed px-4">
                Se ha detectado una anomalía crítica en la ejecución del sistema. El comando táctico ha sido notificado para su resolución inmediata.
              </p>
            </div>

            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-left">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Internal Trace</p>
              <code className="text-[10px] text-red-400/80 break-words font-mono line-clamp-3 italic">
                {error?.message || 'Error de origen desconocido'}
              </code>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <RefreshCcw className="w-4 h-4" /> Reintentar
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
              >
                <Home className="w-4 h-4" /> Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
