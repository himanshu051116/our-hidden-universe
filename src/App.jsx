import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import StarField from './components/StarField.jsx';
import useNativeApp from './hooks/useNativeApp.js';

const BirthdaySurprise = lazy(() => import('./pages/BirthdaySurprise.jsx'));
const BirthdaySurpriseEditor = lazy(() =>
  import('./pages/BirthdaySurprise.jsx').then((module) => ({ default: module.BirthdaySurpriseEditor })),
);
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Universe = lazy(() => import('./pages/Universe.jsx'));
const UniverseChat = lazy(() => import('./pages/UniverseChat.jsx'));
const UniverseExtras = lazy(() => import('./pages/UniverseExtras.jsx'));
const UniverseHome = lazy(() => import('./pages/UniverseHome.jsx'));
const UniverseMemories = lazy(() => import('./pages/UniverseMemories.jsx'));
const UniverseOpenWhen = lazy(() => import('./pages/UniverseOpenWhen.jsx'));
const UniverseRead = lazy(() => import('./pages/UniverseRead.jsx'));
const UniverseSky = lazy(() => import('./pages/UniverseSky.jsx'));
const UniverseTogether = lazy(() => import('./pages/UniverseTogether.jsx'));
const UniverseUs = lazy(() => import('./pages/UniverseUs.jsx'));
const UniverseWatch = lazy(() => import('./pages/UniverseWatch.jsx'));

function RouteFallback() {
  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-6 text-center text-sm text-pink-100/80">
      Opening your universe…
    </div>
  );
}

export default function App() {
  const location = useLocation();
  useNativeApp();

  useEffect(() => {
    if (!location.hash) return;
    const timer = window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-midnight text-white">
      <StarField />
      <AnimatePresence mode="wait">
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/universe"
              element={
                <ProtectedRoute>
                  <Universe />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<UniverseHome />} />
              <Route path="chat" element={<UniverseChat />} />
              <Route path="together" element={<UniverseTogether />} />
              <Route path="together/watch" element={<UniverseWatch />} />
              <Route path="together/read" element={<UniverseRead />} />
              <Route path="sky" element={<UniverseSky />} />
              <Route path="memories" element={<UniverseMemories />} />
              <Route path="timeline" element={<Navigate to="/universe/memories" replace />} />
              <Route path="open-when" element={<UniverseOpenWhen />} />
              <Route path="extras" element={<UniverseExtras />} />
              <Route path="us" element={<UniverseUs />} />
            </Route>
            <Route
              path="/birthday-surprise"
              element={
                <ProtectedRoute>
                  <BirthdaySurprise />
                </ProtectedRoute>
              }
            />
            <Route
              path="/birthday-surprise/edit"
              element={
                <ProtectedRoute>
                  <BirthdaySurpriseEditor />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </div>
  );
}
