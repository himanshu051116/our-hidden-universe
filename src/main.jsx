import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App.jsx';
import { GuestAuthProvider } from './context/authContextBase.jsx';
import './styles/index.css';

const PrivateRuntime = lazy(() => import('./PrivateRuntime.jsx'));

function RootRuntime() {
  const location = useLocation();
  // Returning members need session restoration on "/", but a first-time
  // guest should not download Firebase, call signaling or notification code.
  const savedRoom = Boolean(
    localStorage.getItem('ohu-couple-room') || localStorage.getItem('ohu-demo-session')
  );
  const privateRoute = location.pathname !== '/' || savedRoom;

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
