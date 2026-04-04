import { Menu, ShieldCheck } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { formatDate } from "../../utils/formatters.js";
import { getPageMetadata } from "../../utils/navigation.js";
import layoutStyles from "./Layout.module.css";

export function Header({ onToggleNavigation }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const page = getPageMetadata(location.pathname);

  return (
    <header className={layoutStyles.header}>
      <div className={layoutStyles.headerIntro}>
        <button
          aria-label="Open navigation"
          className={layoutStyles.menuButton}
          onClick={onToggleNavigation}
          type="button"
        >
          <Menu size={20} />
        </button>

        <div>
          <p className={layoutStyles.eyebrow}>{page.eyebrow}</p>
          <h1 className={layoutStyles.pageTitle}>{page.title}</h1>
          <p className={layoutStyles.pageSubtitle}>{page.description}</p>
        </div>
      </div>

      <div className={layoutStyles.headerMeta}>
        <div className={layoutStyles.headerDate}>{formatDate(new Date())}</div>
        <div className={layoutStyles.userChip}>
          <ShieldCheck size={16} />
          <span>{user?.appUser?.displayName || user?.email}</span>
        </div>
        <button className="ghostButton" onClick={logout} type="button">
          Log out
        </button>
      </div>
    </header>
  );
}
