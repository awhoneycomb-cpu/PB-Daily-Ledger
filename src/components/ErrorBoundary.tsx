import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      // Clear app storage keys to recover from corrupt state
      const keysToRemove = [
        'sample_data_loaded_v3',
        'sample_data_loaded_v2',
        'sample_data_loaded',
        'daily_ledger_denominations'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6 text-center space-y-5">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Something went wrong</h1>
              <p className="text-xs text-slate-400">
                The application encountered an unexpected error while rendering.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-rose-300 max-h-32 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="w-full py-2 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                Clear Cached State & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
