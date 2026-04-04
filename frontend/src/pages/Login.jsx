import { KeyRound, ShieldCheck, Warehouse } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import loginStyles from "./Login.module.css";

function Login() {
  const { isAuthenticated, login, status } = useAuth();
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
    return <Navigate replace to={location.state?.from?.pathname || "/dashboard"} />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <h1>Inventory flows that warehouse staff can read in seconds.</h1>
          <p>
            Login gives you access to the same stock, dispatch, and RTO backbone
            already verified in Phase C.
          </p>
        </div>

        <div className={loginStyles.calloutGrid}>
          <article className={loginStyles.calloutCard}>
            <ShieldCheck size={18} />
            <div>
              <strong>Role-aware access</strong>
              <span>Operator and admin screens stay separated.</span>
            </div>
          </article>
          <article className={loginStyles.calloutCard}>
            <KeyRound size={18} />
            <div>
              <strong>Backend-authenticated</strong>
              <span>Sessions are issued by the live Express + Supabase stack.</span>
            </div>
          </article>
        </div>
      </section>

      <section className={loginStyles.formPanel}>
        <div className={loginStyles.formCard}>
          <p className={loginStyles.eyebrow}>Sign In</p>
          <h2>Enter your warehouse account</h2>
          <p className={loginStyles.subline}>
            Use an active WayVeda inventory account to continue.
          </p>

          <form className={loginStyles.form} onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                onChange={(event) => setEmail(event.target.value)}
                placeholder="warehouse@wayveda.com"
                type="email"
                value={email}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />
            </label>

            {error ? <div className={loginStyles.errorBanner}>{error}</div> : null}

            <button className="primaryButton" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Open Warehouse"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Login;
