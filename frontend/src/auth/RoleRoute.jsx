import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();

  const isAllowed =
    !!user &&
    (user.role === "system_admin" || allowedRoles.includes(user.role));

  if (!isAllowed) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
