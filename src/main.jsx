import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import './styles/index.css';

const CallRuntime = lazy(() => import('./calls/CallRuntime.jsx'));

function SessionRuntime() {
  const { user, loading } = useAuth();

  // Guest landing/login must not download active-calling dependencies.
  if (!user || loading) return <App />;

  return (
    <Suspense fallback={
      <div className="grid min-h-screen place-items-center bg-midnight px-6 text-center text-sm text-pink-100/75" role="status">
        Opening your private universe…
      </div>
    }>
      <CallRuntime>
        <App />
      </CallRuntime>
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SessionRuntime />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
