import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {Toaster} from "react-hot-toast"


class ErrorBoundary extends Component {

    constructor(props) {

        super(props);

        this.state = { hasError: false, error: null, errorInfo: null };

    }

    static getDerivedStateFromError(error) {

        return { hasError: true, error };

    }

    componentDidCatch(error, errorInfo) {

        this.setState({ errorInfo });

        console.error('ErrorBoundary caught an error:', error, errorInfo);

    }

    render() {

        if (this.state.hasError) {

            const message = this.state.error ? String(this.state.error) : 'Unknown error';

            const stack = this.state.error?.stack || '';

            const componentStack = this.state.errorInfo?.componentStack || '';

            return (

                <div className="min-h-screen w-full bg-gray-50 text-gray-900 p-6">

                    <div className="max-w-4xl mx-auto">

                        <div className="rounded-xl border border-red-200 bg-white p-6 shadow">

                            <h1 className="text-xl font-semibold text-red-700">Something went wrong</h1>

                            <p className="mt-2 text-sm text-gray-700">{message}</p>

                            {stack ? (

                                <div className="mt-4">

                                    <h2 className="text-sm font-medium text-gray-900">Stack</h2>

                                    <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-100 p-3 text-xs text-gray-800">{stack}</pre>

                                </div>

                            ) : null}

                            {componentStack ? (

                                <div className="mt-4">

                                    <h2 className="text-sm font-medium text-gray-900">Component stack</h2>

                                    <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-100 p-3 text-xs text-gray-800">{componentStack}</pre>

                                </div>

                            ) : null}

                            <div className="mt-6 flex gap-3">

                                <button

                                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500"

                                    onClick={() => window.location.reload()}

                                >

                                    Reload

                                </button>

                                <button

                                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-900 text-sm font-medium hover:bg-gray-200"

                                    onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}

                                >

                                    Try again

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            );

        }

        return this.props.children;

    }

}


createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <App />
        <Toaster 
            position="bottom-center"
        />
    </ErrorBoundary>
)
