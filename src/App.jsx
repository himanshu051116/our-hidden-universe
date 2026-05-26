import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import StarField from './components/StarField.jsx';
import BirthdaySurprise from './pages/BirthdaySurprise.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Universe from './pages/Universe.jsx';
import UniverseChat from './pages/UniverseChat.jsx';
import UniverseExtras from './pages/UniverseExtras.jsx';
import UniverseHome from './pages/UniverseHome.jsx';
import UniverseOpenWhen from './pages/UniverseOpenWhen.jsx';
import UniverseTimeline from './pages/UniverseTimeline.jsx';

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen overflow-x-hidden bg-midnight text-white">
      <StarField />
      <AnimatePresence mode="wait">
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
