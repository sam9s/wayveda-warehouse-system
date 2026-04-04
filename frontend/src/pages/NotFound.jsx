import { Link } from "react-router-dom";
import { EmptyState } from "../components/common/EmptyState.jsx";

function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <EmptyState
        action={
          <Link className="primaryButton" to="/dashboard">
            Return to dashboard
          </Link>
        }
        message="The page you opened does not exist in the current Phase D shell."
        title="Page not found"
      />
    </div>
  );
}

export default NotFound;
