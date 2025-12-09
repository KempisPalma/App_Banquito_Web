import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
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

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                    <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-6 border border-red-100">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Algo salió mal</h1>
                        <p className="text-slate-600 mb-4">La aplicación ha encontrado un error inesperado.</p>
                        <div className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-auto text-xs font-mono mb-4">
                            {this.state.error?.toString()}
                        </div>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Borrar datos y recargar (Intento de reparación)
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
