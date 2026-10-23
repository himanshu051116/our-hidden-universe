import { lazy, Suspense } from 'react';
import App from './App.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

const CallRuntime = lazy(() => import('./calls/CallRuntime.jsx'));

function AuthenticatedSession() {
  const { user, loading } = useAuth();
  if (loading || !user) return <App />;
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

export default function PrivateRuntime() {
  return <AuthProvider><AuthenticatedSession /></AuthProvider>;
}
