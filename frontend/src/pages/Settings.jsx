import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";
import api from "../utils/api.js";
import adminStyles from "./Admin.module.css";

function Settings() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [health, setHealth] = useState({
    database: "checking",
    now: "",
    status: "checking",
  });

  useEffect(() => {
    api.get("/health").then(({ data }) => setHealth(data));
  }, []);

  return (
    <div className={adminStyles.page}>
      <PageHeader
        description="Quick reference for current user context and backend health."
        eyebrow="Admin"
        title="Settings"
      />

      <div className={adminStyles.grid}>
        <section className={adminStyles.card}>
          <h3>Current user</h3>
          <div className={adminStyles.statusGrid}>
            <div className={adminStyles.statusRow}>
              <strong>Display name</strong>
              <span>{user?.appUser?.displayName || "--"}</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Email</strong>
              <span>{user?.email || "--"}</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Role</strong>
              <span>{user?.role || "--"}</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Account status</strong>
              <span>{user?.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Password status</strong>
              <span>
                {user?.mustChangePassword ? "Change required" : "Up to date"}
              </span>
            </div>
          </div>
        </section>

        <section className={adminStyles.card}>
          <h3>System health</h3>
          <div className={adminStyles.statusGrid}>
            <div className={adminStyles.statusRow}>
              <strong>API status</strong>
              <span>{health.status}</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Database</strong>
              <span>{health.database}</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Server time</strong>
              <span>{health.now || "--"}</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Balance rule</strong>
              <span>Opening + Stock In + RTO Right - Dispatch</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Theme</strong>
              <span>{theme}</span>
            </div>
          </div>
        </section>

        <section className={adminStyles.card}>
          <h3>Security</h3>
          <p className={adminStyles.note}>
            Temporary passwords must be replaced on first login. You can rotate
            your password again from the dedicated change-password screen.
          </p>
          <div className={adminStyles.actionRow}>
            <Link className="primaryButton" to="/change-password">
              Open password settings
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Settings;
