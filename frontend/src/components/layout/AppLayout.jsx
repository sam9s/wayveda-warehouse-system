import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header.jsx";
import layoutStyles from "./Layout.module.css";
import { Sidebar } from "./Sidebar.jsx";

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
