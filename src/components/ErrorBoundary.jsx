import React from "react";

class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <div>Wystąpił błąd. Spróbuj odświeżyć stronę.</div>;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
