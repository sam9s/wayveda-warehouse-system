import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { StockInForm } from "../components/forms/StockInForm.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useProducts } from "../hooks/useProducts.js";

function StockIn() {
  const { user } = useAuth();
  const { error, loading, products } = useProducts();

  if (loading) {
    return <LoadingSpinner label="Loading stock-in form" />;
  }

  if (error) {
    return <EmptyState message={error} title="Stock In unavailable" />;
  }

  return (
    <div>
      <PageHeader
        description="Record supplier receipts with the same section order operators already know."
        eyebrow="Movement Entry"
        title="Stock In"
      />
      <StockInForm currentUser={user} products={products} />
    </div>
  );
}

export default StockIn;
