import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import adminStyles from "./Admin.module.css";

function ChangePassword() {
  const navigate = useNavigate();
  const { changePassword, user } = useAuth();
  const [form, setForm] = useState({
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
  });
  const [state, setState] = useState({
    error: "",
    isSubmitting: false,
    success: "",
  });

  useEffect(() => {
    if (state.success && !user?.mustChangePassword) {
      const timeoutId = window.setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 900);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [navigate, state.success, user?.mustChangePassword]);

  async function handleSubmit(event) {
    event.preventDefault();
    setState({
      error: "",
      isSubmitting: true,
      success: "",
    });

    if (form.newPassword !== form.confirmPassword) {
      setState({
        error: "New password and confirmation do not match.",
        isSubmitting: false,
        success: "",
      });
      return;
    }

    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setState({
        error: "",
        isSubmitting: false,
        success: "Password updated. Redirecting to the dashboard...",
      });
      setForm({
        confirmPassword: "",
        currentPassword: "",
        newPassword: "",
      });
    } catch (error) {
      setState({
        error:
          error.response?.data?.message || "Unable to update your password.",
        isSubmitting: false,
        success: "",
      });
    }
  }

  return (
    <div className={adminStyles.page}>
      <PageHeader
        description={
          user?.mustChangePassword
            ? "Your temporary password must be replaced before you can use the rest of the system."
            : "Update your password here any time you want to rotate access."
        }
        eyebrow="Security"
        title="Change Password"
      />

      {user?.mustChangePassword ? (
        <section className={adminStyles.forceCard}>
          <div className={adminStyles.forceIcon}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <strong>First-login password change required</strong>
            <p>
              Use your temporary password once here, then set the password you
              actually want to remember.
            </p>
          </div>
        </section>
      ) : null}

      <section className={adminStyles.card}>
        <h3>Password update</h3>

        {state.error ? <div className={adminStyles.error}>{state.error}</div> : null}
        {state.success ? <div className={adminStyles.success}>{state.success}</div> : null}

        <form className={adminStyles.stack} onSubmit={handleSubmit}>
          <label className={adminStyles.field}>
            <span>Current password</span>
            <input
              autoComplete="current-password"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
              type="password"
              value={form.currentPassword}
            />
          </label>

          <label className={adminStyles.field}>
            <span>New password</span>
            <input
              autoComplete="new-password"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
              type="password"
              value={form.newPassword}
            />
          </label>

          <label className={adminStyles.field}>
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              type="password"
              value={form.confirmPassword}
            />
          </label>

          <p className={adminStyles.note}>
            Passwords must be at least 8 characters long.
          </p>

          <div className={adminStyles.actionRow}>
            <button className="primaryButton" disabled={state.isSubmitting} type="submit">
              {state.isSubmitting ? "Updating..." : "Save new password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ChangePassword;
