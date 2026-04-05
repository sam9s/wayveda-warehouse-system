import { useEffect, useState } from "react";
import { DataTable } from "../components/common/DataTable.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import api from "../utils/api.js";
import { formatDate } from "../utils/formatters.js";
import adminStyles from "./Admin.module.css";

const TEMPORARY_PASSWORD_LABEL = "Wayveda@123";

function roleDescription(role) {
  switch (role) {
    case "admin":
      return "Full warehouse operations, product management, settings, and user creation.";
    case "operator":
      return "Dashboard, ledger, analysis, and movement-entry rights without admin settings.";
    case "viewer":
      return "Read-only visibility across dashboard, ledger, and analysis screens.";
    default:
      return "--";
  }
}

function roleLabel(role) {
  return String(role || "--")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sortUsers(users) {
  return [...users].sort((left, right) => {
    const leftDate = new Date(left.createdAt || 0).getTime();
    const rightDate = new Date(right.createdAt || 0).getTime();
    return rightDate - leftDate;
  });
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    role: "operator",
  });
  const [state, setState] = useState({
    error: "",
    loading: true,
    submitting: false,
    success: "",
  });

  useEffect(() => {
    let isCancelled = false;

    api
      .get("/admin/users")
      .then(({ data }) => {
        if (isCancelled) {
          return;
        }

        setUsers(sortUsers(data.users || []));
        setState({
          error: "",
          loading: false,
          submitting: false,
          success: "",
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: error.response?.data?.message || "Unable to load users.",
          loading: false,
          submitting: false,
          success: "",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setState((current) => ({
      ...current,
      error: "",
      submitting: true,
      success: "",
    }));

    try {
      const { data } = await api.post("/admin/users", {
        displayName: form.displayName,
        email: form.email,
        role: form.role,
      });

      setUsers((currentUsers) => sortUsers([data.user, ...currentUsers]));
      setForm({
        displayName: "",
        email: "",
        role: "operator",
      });
      setState((current) => ({
        ...current,
        error: "",
        submitting: false,
        success: `User created. Temporary password is ${TEMPORARY_PASSWORD_LABEL} and first-login password change is required.`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.response?.data?.message || "Unable to create user.",
        submitting: false,
        success: "",
      }));
    }
  }

  if (state.loading) {
    return <LoadingSpinner label="Loading users" />;
  }

  if (state.error && !users.length) {
    return <EmptyState message={state.error} title="User management unavailable" />;
  }

  return (
    <div className={adminStyles.page}>
      <PageHeader
        description="Create business users, assign access roles, and onboard them with the standard temporary-password policy."
        eyebrow="Admin"
        title="User Management"
      />

      <div className={adminStyles.grid}>
        <section className={adminStyles.card}>
          <h3>Create user</h3>
          <p className={adminStyles.note}>
            New users are provisioned with the standard temporary password and
            must change it on first login.
          </p>

          <div className={adminStyles.forceCard}>
            <div className={adminStyles.forceIcon}>PW</div>
            <div>
              <strong>Temporary password policy</strong>
              <p>
                Current standard temporary password: <strong>{TEMPORARY_PASSWORD_LABEL}</strong>
              </p>
            </div>
          </div>

          {state.error ? <div className={adminStyles.error}>{state.error}</div> : null}
          {state.success ? <div className={adminStyles.success}>{state.success}</div> : null}

          <form className={adminStyles.stack} onSubmit={handleSubmit}>
            <label className={adminStyles.field}>
              <span>Display name</span>
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                placeholder="Shubham Sharma"
                value={form.displayName}
              />
            </label>

            <label className={adminStyles.field}>
              <span>Official email</span>
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="name@company.com"
                type="email"
                value={form.email}
              />
            </label>

            <label className={adminStyles.field}>
              <span>Role</span>
              <select
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                value={form.role}
              >
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>

            <button
              className="primaryButton"
              disabled={state.submitting}
              type="submit"
            >
              {state.submitting ? "Creating..." : "Create user"}
            </button>
          </form>
        </section>

        <section className={adminStyles.card}>
          <h3>Role guide</h3>
          <div className={adminStyles.statusGrid}>
            <div className={adminStyles.statusRow}>
              <strong>Admin</strong>
              <span>{roleDescription("admin")}</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Operator</strong>
              <span>{roleDescription("operator")}</span>
            </div>
            <div className={adminStyles.statusRow}>
              <strong>Viewer</strong>
              <span>{roleDescription("viewer")}</span>
            </div>
          </div>
        </section>
      </div>

      <section className={adminStyles.card}>
        <div className={adminStyles.toolbar}>
          <div>
            <h3>Current users</h3>
            <p className={adminStyles.note}>
              Password status shows whether the user still needs to replace the temporary password.
            </p>
          </div>
        </div>

        <DataTable
          columns={[
            {
              header: "User",
              key: "displayName",
              render: (row) => (
                <div className={adminStyles.entityCell}>
                  <strong>{row.displayName || "--"}</strong>
                  <span>{row.email || "--"}</span>
                </div>
              ),
            },
            {
              header: "Role",
              key: "role",
              render: (row) => roleLabel(row.role),
            },
            {
              header: "Account",
              key: "isActive",
              render: (row) => (row.isActive ? "Active" : "Inactive"),
            },
            {
              header: "Password",
              key: "mustChangePassword",
              render: (row) =>
                row.mustChangePassword ? "Change required" : "Updated",
            },
            {
              header: "Created",
              key: "createdAt",
              render: (row) => formatDate(row.createdAt),
            },
          ]}
          rows={users}
        />
      </section>
    </div>
  );
}

export default UserManagement;
