import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { Header } from "./Header.jsx";
import layoutStyles from "./Layout.module.css";
import { Sidebar } from "./Sidebar.jsx";

export function AppLayout() {
  const hasHandledInitialRoute = useRef(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (hasHandledInitialRoute.current) {
      return;
    }

    hasHandledInitialRoute.current = true;

    const keepCurrentRoute =
      location.pathname === "/dashboard"
      || (user?.mustChangePassword && location.pathname === "/change-password");

    if (!keepCurrentRoute) {
      navigate("/dashboard", { replace: true });
    }
  }, [location.pathname, navigate, user?.mustChangePassword]);

  return (
    <div className={layoutStyles.shell}>
      <Sidebar
        isOpen={isSidebarOpen}
        onNavigate={() => setIsSidebarOpen(false)}
      />

      <div className={layoutStyles.contentArea}>
        <Header onToggleNavigation={() => setIsSidebarOpen((value) => !value)} />
        <main className={layoutStyles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
