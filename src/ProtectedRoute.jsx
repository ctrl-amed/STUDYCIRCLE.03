import { Navigate } from 'react-router-dom';
import { usePlayer } from './context/PlayerContext';

export default function ProtectedRoute({ children }) {
  const { playerData } = usePlayer();
  const storedUser = localStorage.getItem('user');

  // Kung walang username sa context AT walang naka-save sa localStorage, ibalik sa login
  if (!playerData?.username && !storedUser) {
    return <Navigate to="/auth#login" replace />;
  }

  return children;
}