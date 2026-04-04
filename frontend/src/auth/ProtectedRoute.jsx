import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { useAuth } from "./AuthContext.jsx";

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, status } = useAuth();

  if (status === "restoring") {
    return <LoadingSpinner label="Restoring your session" page />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}
