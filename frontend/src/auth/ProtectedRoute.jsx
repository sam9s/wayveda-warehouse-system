import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { useAuth } from "./AuthContext.jsx";

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, status, user } = useAuth();

  if (status === "restoring") {
    return <LoadingSpinner label="Restoring your session" page />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (user?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate replace to="/change-password" />;
  }

  return <Outlet />;
}
