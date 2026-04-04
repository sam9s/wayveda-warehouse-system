import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { RTOForm } from "../components/forms/RTOForm.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useProducts } from "../hooks/useProducts.js";

function RTO() {
  const { user } = useAuth();
  const { error, loading, products } = useProducts();

  if (loading) {
    return <LoadingSpinner label="Loading RTO form" />;
  }

  if (error) {
    return <EmptyState message={error} title="RTO unavailable" />;
  }

  return (
    <div>
      <PageHeader
        description="Classify returns as right, wrong, or fake without breaking the approved balance rule."
        eyebrow="Movement Entry"
        title="RTO"
      />
      <RTOForm currentUser={user} products={products} />
    </div>
  );
}

export default RTO;
