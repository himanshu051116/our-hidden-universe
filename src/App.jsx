import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import StarField from './components/StarField.jsx';

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
const UniverseOpenWhen = lazy(() => import('./pages/UniverseOpenWhen.jsx'));
const UniverseSky = lazy(() => import('./pages/UniverseSky.jsx'));
const UniverseTimeline = lazy(() => import('./pages/UniverseTimeline.jsx'));

function RouteFallback() {
  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-6 text-center text-sm text-pink-100/80">
      Loading...
    </div>
  );
}

export default function App() {
  const location = useLocation();

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
              <Route path="sky" element={<UniverseSky />} />
              <Route path="timeline" element={<UniverseTimeline />} />
              <Route path="open-when" element={<UniverseOpenWhen />} />
              <Route path="extras" element={<UniverseExtras />} />
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
