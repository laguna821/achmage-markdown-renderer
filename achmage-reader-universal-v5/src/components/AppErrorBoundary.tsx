import {Component, type ErrorInfo, type ReactNode} from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {error};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary captured an application error.', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="home-shell">
          <section className="vault-status vault-status--actionable" data-vault-status-panel="true" data-vault-phase="failed">
            <div className="vault-status__eyebrow">Desktop Runtime Guard</div>
            <h1>Unexpected application error</h1>
            <p className="vault-status__lede">
              The app caught a render-time failure and kept the desktop shell visible instead of leaving a blank screen.
            </p>
            <p className="vault-status__error">{this.state.error.message}</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
