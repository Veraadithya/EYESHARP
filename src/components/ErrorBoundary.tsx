import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}
interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary][${this.props.moduleName ?? 'Unknown'}]`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-200 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 font-mono mb-2">
            Something went wrong{this.props.moduleName ? ` in ${this.props.moduleName}` : ''}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mb-1">
            An unexpected error occurred while loading this investigation module.
          </p>
          {this.state.errorMessage && (
            <pre className="mt-2 mb-4 px-3 py-2 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600 max-w-lg text-left overflow-auto">
              {this.state.errorMessage}
            </pre>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
