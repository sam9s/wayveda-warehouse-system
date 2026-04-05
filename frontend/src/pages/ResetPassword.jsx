import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import loginStyles from "./Login.module.css";

function readRecoveryPayload() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);

  return {
    accessToken:
      hashParams.get("access_token") || queryParams.get("access_token") || "",
    errorDescription:
      hashParams.get("error_description") ||
      queryParams.get("error_description") ||
      "",
    type: hashParams.get("type") || queryParams.get("type") || "",
  };
}

function ResetPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [recovery, setRecovery] = useState({
    accessToken: "",
    errorDescription: "",
    type: "",
  });
  const [form, setForm] = useState({
    confirmPassword: "",
    newPassword: "",
  });
  const [state, setState] = useState({
    error: "",
    isSubmitting: false,
    success: "",
  });

  useEffect(() => {
    const nextRecovery = readRecoveryPayload();
    setRecovery(nextRecovery);
  }, []);

  useEffect(() => {
    if (!state.success) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate("/login", {
        replace: true,
        state: {
          message: "Password reset successful. Sign in with your new password.",
          tone: "success",
        },
      });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, state.success]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setState({
        error: "New password and confirmation do not match.",
        isSubmitting: false,
        success: "",
      });
      return;
    }

    setState({
      error: "",
      isSubmitting: true,
      success: "",
    });

    try {
      const result = await resetPassword({
        accessToken: recovery.accessToken,
        newPassword: form.newPassword,
      });

      setState({
        error: "",
        isSubmitting: false,
        success: result.message || "Password reset successful.",
      });
      setForm({
        confirmPassword: "",
        newPassword: "",
      });
    } catch (error) {
      setState({
        error:
          error.response?.data?.message ||
          "Unable to complete password reset.",
        isSubmitting: false,
        success: "",
      });
    }
  }

  const recoveryError =
    recovery.errorDescription ||
    (!recovery.accessToken
      ? "This recovery link is invalid or has expired. Request a new one."
      : recovery.type && recovery.type !== "recovery"
        ? "This recovery link is invalid or has expired. Request a new one."
        : "");

  return (
    <div className={loginStyles.page}>
      <section className={loginStyles.heroPanel}>
        <div className={loginStyles.brand}>
          <div className={loginStyles.brandBadge}>WV</div>
          <div>
            <p>WayVeda</p>
            <span>Password Recovery</span>
          </div>
        </div>

        <div className={loginStyles.heroCopy}>
          <p className={loginStyles.heroEyebrow}>Reset Password</p>
          <h1>Set a new password for your WayVeda account.</h1>
          <p>
            Use this page only from a trusted recovery link issued by the
            system. Once saved, the old password will stop working immediately.
          </p>
        </div>

        <div className={loginStyles.heroNote}>
          <span className={loginStyles.heroNoteLabel}>Security</span>
          <p>
            Choose a password you can remember but that is not shared with
            other systems. Passwords must be at least 8 characters long.
          </p>
        </div>
      </section>

      <section className={loginStyles.formPanel}>
        <div className={loginStyles.formCard}>
          <p className={loginStyles.eyebrow}>Reset Password</p>
          <h2>Create a new password</h2>
          <p className={loginStyles.subline}>
            Save a new password for your WayVeda warehouse account.
          </p>

          {recoveryError ? <div className={loginStyles.errorBanner}>{recoveryError}</div> : null}
          {state.error ? <div className={loginStyles.errorBanner}>{state.error}</div> : null}
          {state.success ? (
            <div className={loginStyles.successBanner}>{state.success}</div>
          ) : null}

          {!recoveryError ? (
            <form className={loginStyles.form} onSubmit={handleSubmit}>
              <label>
                <span>New password</span>
                <input
                  autoComplete="new-password"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  placeholder="Create a new password"
                  type="password"
                  value={form.newPassword}
                />
              </label>

              <label>
                <span>Confirm new password</span>
                <input
                  autoComplete="new-password"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Confirm your new password"
                  type="password"
                  value={form.confirmPassword}
                />
              </label>

              <button className="primaryButton" disabled={state.isSubmitting} type="submit">
                {state.isSubmitting ? "Saving..." : "Save new password"}
              </button>
            </form>
          ) : null}

          <div className={loginStyles.supportRow}>
            <span>Need a fresh recovery email?</span>
            <Link className={loginStyles.inlineLink} to="/forgot-password">
              Request another reset link
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ResetPassword;
