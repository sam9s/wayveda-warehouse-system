import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import loginStyles from "./Login.module.css";

function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState({
    error: "",
    isSubmitting: false,
    success: "",
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setState({
      error: "",
      isSubmitting: true,
      success: "",
    });

    try {
      const result = await requestPasswordReset({ email });
      setState({
        error: "",
        isSubmitting: false,
        success:
          result.message ||
          "If an active WayVeda account exists for that email, password reset instructions have been sent.",
      });
    } catch (error) {
      setState({
        error:
          error.response?.data?.message ||
          "Unable to start password recovery right now.",
        isSubmitting: false,
        success: "",
      });
    }
  }

  return (
    <div className={loginStyles.page}>
      <section className={loginStyles.heroPanel}>
        <div className={loginStyles.brand}>
          <div className={loginStyles.brandBadge}>
            <ArrowLeft size={20} />
          </div>
          <div>
            <p>WayVeda</p>
            <span>Password Recovery</span>
          </div>
        </div>

        <div className={loginStyles.heroCopy}>
          <p className={loginStyles.heroEyebrow}>Account Recovery</p>
          <h1>Recover access without involving manual admin resets.</h1>
          <p>
            Enter your official WayVeda email address and the system will issue
            password recovery instructions for that account.
          </p>
        </div>

        <div className={loginStyles.heroNote}>
          <span className={loginStyles.heroNoteLabel}>Recovery Policy</span>
          <p>
            Recovery instructions are only sent for provisioned accounts. The
            response remains generic for security, even if the email is not
            recognized.
          </p>
        </div>
      </section>

      <section className={loginStyles.formPanel}>
        <div className={loginStyles.formCard}>
          <p className={loginStyles.eyebrow}>Forgot Password</p>
          <h2>Send a recovery link</h2>
          <p className={loginStyles.subline}>
            Use the same email address you use to sign in to the WayVeda
            warehouse system.
          </p>

          {state.success ? (
            <div className={loginStyles.successBanner}>{state.success}</div>
          ) : null}
          {state.error ? <div className={loginStyles.errorBanner}>{state.error}</div> : null}

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

            <button className="primaryButton" disabled={state.isSubmitting} type="submit">
              {state.isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className={loginStyles.supportRow}>
            <span>Remembered your password?</span>
            <Link className={loginStyles.inlineLink} to="/login">
              <ArrowLeft size={16} />
              Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ForgotPassword;
