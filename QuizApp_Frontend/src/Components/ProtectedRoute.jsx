import { Navigate } from 'react-router-dom';
import { useQuiz } from '../Context/Context';

export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useQuiz();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};