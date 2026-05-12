import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Chargement...</div>;

  // Si l'utilisateur n'est pas connecté, on le renvoie au login
  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;