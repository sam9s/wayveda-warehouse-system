import { Box, Warehouse } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useTheme } from "../../theme/ThemeContext.jsx";
import { getNavigationForRole } from "../../utils/navigation.js";
import layoutStyles from "./Layout.module.css";

export function Sidebar({ isOpen, onNavigate }) {
  const { user } = useAuth();
  const { setTheme, theme, themes } = useTheme();
  const navigationGroups = getNavigationForRole(user?.role);

  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={`${layoutStyles.overlay} ${isOpen ? layoutStyles.overlayVisible : ""}`}
        onClick={onNavigate}
      />

      <aside
        className={`${layoutStyles.sidebar} ${isOpen ? layoutStyles.sidebarOpen : ""}`}
      >
        <div className={layoutStyles.brandBlock}>
          <div className={layoutStyles.brandBadge}>
            <Warehouse size={18} />
          </div>
          <div>
            <p className={layoutStyles.brandName}>WayVeda</p>
            <p className={layoutStyles.brandSubline}>Warehouse Operations</p>
          </div>
        </div>

        <div className={layoutStyles.themePanel}>
          <p className={layoutStyles.themeLabel}>Theme</p>
          <div className={layoutStyles.themeRail}>
            {themes.map((themeOption) => (
              <button
                className={`${layoutStyles.themeButton} ${
                  theme === themeOption.id ? layoutStyles.themeButtonActive : ""
                }`}
                key={themeOption.id}
                onClick={() => setTheme(themeOption.id)}
                type="button"
              >
                <span
                  className={`${layoutStyles.themeSwatch} ${layoutStyles[`themeSwatch${themeOption.id}`]}`}
                />
                <span>{themeOption.label}</span>
              </button>
            ))}
          </div>
        </div>

        {navigationGroups.map((group) => (
          <div className={layoutStyles.navGroup} key={group.label}>
            <p className={layoutStyles.navGroupLabel}>{group.label}</p>

            <nav className={layoutStyles.navList}>
              {group.items.map((item) => {
                const Icon = item.icon || Box;

                return (
                  <NavLink
                    className={({ isActive }) =>
                      `${layoutStyles.navLink} ${isActive ? layoutStyles.navLinkActive : ""}`
                    }
                    key={item.to}
                    onClick={onNavigate}
                    to={item.to}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}

        <div className={layoutStyles.sidebarFooter}>
          <p className={layoutStyles.footerCaption}>Phase 1</p>
          <p className={layoutStyles.footerText}>
            Inventory, ledger, movement entry, and analytics on the live Phase C API.
          </p>
        </div>
      </aside>
    </>
  );
}
