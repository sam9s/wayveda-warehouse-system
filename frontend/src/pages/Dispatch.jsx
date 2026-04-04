import { useState } from "react";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { Tabs } from "../components/common/Tabs.jsx";
import { DispatchForm } from "../components/forms/DispatchForm.jsx";
import formStyles from "../components/forms/MovementForms.module.css";
import { useAuth } from "../auth/AuthContext.jsx";
import { useProducts } from "../hooks/useProducts.js";

function Dispatch() {
  const { user } = useAuth();
  const { error, loading, products } = useProducts();
  const [activeTab, setActiveTab] = useState("manual");

  if (loading) {
    return <LoadingSpinner label="Loading dispatch form" />;
  }

  if (error) {
    return <EmptyState message={error} title="Dispatch unavailable" />;
  }

  return (
    <div>
      <PageHeader
        actions={
          <Tabs
            items={[
              { label: "Manual Entry", value: "manual" },
              { label: "Shiprocket Synced", value: "shiprocket" },
            ]}
            onChange={setActiveTab}
            value={activeTab}
          />
        }
        description="Manual dispatch is available now; the Shiprocket shell is already reserved for Phase E."
        eyebrow="Movement Entry"
        title="Dispatch"
      />

      {activeTab === "manual" ? (
        <DispatchForm currentUser={user} products={products} />
      ) : (
        <div className={formStyles.placeholderPanel}>
          <h3>Shiprocket is not connected yet.</h3>
          <p>
            This tab is intentionally live now so Phase E can drop in without restructuring
            the dispatch screen. Once credentials are configured, synced dispatch rows and last
            sync state will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

export default Dispatch;
