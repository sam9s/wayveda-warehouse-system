import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute.jsx";
import { RoleRoute } from "./auth/RoleRoute.jsx";
import { LoadingSpinner } from "./components/common/LoadingSpinner.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const ChangePassword = lazy(() => import("./pages/ChangePassword.jsx"));
const Dispatch = lazy(() => import("./pages/Dispatch.jsx"));
const DispatchAnalysis = lazy(() => import("./pages/DispatchAnalysis.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const InventoryLedger = lazy(() => import("./pages/InventoryLedger.jsx"));
const InwardAnalysis = lazy(() => import("./pages/InwardAnalysis.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const ProductManagement = lazy(() => import("./pages/ProductManagement.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const RTO = lazy(() => import("./pages/RTO.jsx"));
const RTOAnalysis = lazy(() => import("./pages/RTOAnalysis.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const StockIn = lazy(() => import("./pages/StockIn.jsx"));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading screen" page />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate replace to="/dashboard" />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory/ledger" element={<InventoryLedger />} />
            <Route
              path="/inventory/dispatch-analysis"
              element={<DispatchAnalysis />}
            />
            <Route
              path="/inventory/inward-analysis"
              element={<InwardAnalysis />}
            />
            <Route path="/inventory/rto-analysis" element={<RTOAnalysis />} />

            <Route element={<RoleRoute allowedRoles={["admin", "operator"]} />}>
              <Route path="/stock-in" element={<StockIn />} />
              <Route path="/dispatch" element={<Dispatch />} />
              <Route path="/rto" element={<RTO />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={["admin"]} />}>
              <Route path="/products" element={<ProductManagement />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
