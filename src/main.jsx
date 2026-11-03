import React, { lazy, Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App.jsx';
import { GuestAuthProvider } from './context/authContextBase.jsx';
import './styles/index.css';

const PrivateRuntime = lazy(() => import('./PrivateRuntime.jsx'));

function RootRuntime() {
  const location = useLocation();
  const savedRoom = Boolean(
    localStorage.getItem('ohu-couple-room') || localStorage.getItem('ohu-demo-session')
  );
  // Render guest landing immediately, but probe Firebase Auth when idle:
  // losing localStorage must not permanently hide a still-signed-in member.
  const [restoreStarted, setRestoreStarted] = useState(false);
  useEffect(() => {
    if (restoreStarted || location.pathname !== '/' || savedRoom) return undefined;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setRestoreStarted(true), { timeout: 1600 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setRestoreStarted(true), 600);
    return () => window.clearTimeout(id);
  }, [restoreStarted, location.pathname, savedRoom]);
  const privateRoute = location.pathname !== '/' || savedRoom || restoreStarted;

  if (!privateRoute) {
    return (
      <GuestAuthProvider>
        <App />
      </GuestAuthProvider>
    );
  }

  return (
    <Suspense fallback={
      <div className="grid min-h-screen place-items-center bg-midnight px-6 text-center text-sm text-pink-100/75" role="status">
        Opening your universe…
      </div>
    }>
      <PrivateRuntime />
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <RootRuntime />
    </BrowserRouter>
  </React.StrictMode>,
);
