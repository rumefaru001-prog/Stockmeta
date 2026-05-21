import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      let errorMessage = "Something went wrong. Please try refreshing the page.";
      let isPermissionError = false;

      try {
        if (error?.message) {
          const errorData = JSON.parse(error.message);
          if (errorData.error && errorData.error.includes("permission-denied")) {
            isPermissionError = true;
            errorMessage = "You don't have permission to access this data. Please make sure you are logged in with the correct account.";
          }
        }
      } catch (e) {
        // Not a JSON error message, use default
      }

      return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text)] mb-4 tracking-tight">
              {isPermissionError ? "Access Denied" : "Application Error"}
            </h1>
            <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Application
            </button>
            {process.env.NODE_ENV === 'development' && error && (
              <div className="mt-8 p-4 bg-black/20 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-[10px] font-mono text-rose-400 break-all">
                  {error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
