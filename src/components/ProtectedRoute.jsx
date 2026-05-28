import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { firebaseEnabled } from '../services/firebase.js';

export default function ProtectedRoute({ children }) {
  const { user, loading, coupleCode } = useAuth();

  if (loading) {
    return (
      <div className="cinematic-bg grid min-h-screen place-items-center px-6 text-center">
        <div className="glass rounded-3xl px-8 py-6 text-blush">
          <p className="font-display text-2xl text-white">Aligning your stars...</p>
          <p className="mt-2 text-sm text-blush/80">Restoring your private universe.</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (firebaseEnabled && !coupleCode) return <Navigate to="/login" replace />;

  return children;
}
