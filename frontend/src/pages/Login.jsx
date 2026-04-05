import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import loginStyles from "./Login.module.css";

function Login() {
  const { isAuthenticated, login, status, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  if (status === "restoring") {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate replace to={user?.mustChangePassword ? "/change-password" : "/dashboard"} />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const nextUser = await login({ email, password });
      navigate(nextUser?.mustChangePassword ? "/change-password" : "/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const bannerMessage = location.state?.message || "";
  const bannerTone = location.state?.tone === "error" ? "error" : "success";

  return (
    <div className={loginStyles.page}>
      <section className={loginStyles.heroPanel}>
        <div className={loginStyles.brand}>
          <div className={loginStyles.brandBadge}>
            <Warehouse size={20} />
          </div>
          <div>
            <p>WayVeda</p>
            <span>Warehouse Operations</span>
          </div>
        </div>

        <div className={loginStyles.heroCopy}>
          <p className={loginStyles.heroEyebrow}>WayVeda Warehouse System</p>
          <h1>Secure access to live warehouse operations.</h1>
          <p>
            Use your approved WayVeda account to monitor stock position, record
            stock inwards, manage dispatches, and reconcile returns from one
            operational workspace.
          </p>
        </div>

        <div className={loginStyles.calloutGrid}>
          <article className={loginStyles.calloutCard}>
            <Boxes size={18} />
            <div>
              <strong>Live inventory position</strong>
              <span>Track current stock, movement history, and balance accuracy.</span>
            </div>
          </article>
          <article className={loginStyles.calloutCard}>
            <Truck size={18} />
            <div>
              <strong>Dispatch and return control</strong>
              <span>Keep dispatch, RTO, and inward records aligned in one flow.</span>
            </div>
          </article>
          <article className={loginStyles.calloutCard}>
            <ClipboardCheck size={18} />
            <div>
              <strong>Daily operational visibility</strong>
              <span>Review dashboard summaries, ledger movement, and analysis screens.</span>
            </div>
          </article>
          <article className={loginStyles.calloutCard}>
            <ShieldCheck size={18} />
            <div>
              <strong>Role-based access</strong>
              <span>Only provisioned users can work inside the live WayVeda environment.</span>
            </div>
          </article>
        </div>

        <div className={loginStyles.heroNote}>
          <span className={loginStyles.heroNoteLabel}>Operational Notice</span>
          <p>
            This login is for authorized WayVeda warehouse and admin users only.
            Inventory actions in the application affect live operational records.
          </p>
        </div>
      </section>

      <section className={loginStyles.formPanel}>
        <div className={loginStyles.formCard}>
          <p className={loginStyles.eyebrow}>Sign In</p>
          <h2>Use your WayVeda account</h2>
          <p className={loginStyles.subline}>
            Enter your approved email address and password to continue to the
            warehouse workspace.
          </p>

          {bannerMessage ? (
            <div
              className={
                bannerTone === "error"
                  ? loginStyles.errorBanner
                  : loginStyles.successBanner
              }
            >
              {bannerMessage}
            </div>
          ) : null}

          <form className={loginStyles.form} onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@wayveda.com"
                type="email"
                value={email}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />
            </label>

            <div className={loginStyles.linkRow}>
              <span className={loginStyles.helperText}>
                Temporary passwords must be changed after first login.
              </span>
              <Link className={loginStyles.inlineLink} to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            {error ? <div className={loginStyles.errorBanner}>{error}</div> : null}

            <button className="primaryButton" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className={loginStyles.supportRow}>
            <span>Need access to the system?</span>
            <span>Contact the WayVeda system administrator.</span>
          </div>

          <Link className={loginStyles.secondaryAction} to="/forgot-password">
            Recover account access <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Login;
