import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import BrandsPage from "./pages/BrandsPage";
import CategoriesPage from "./pages/CategoriesPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import ReviewsPage from "./pages/ReviewsPage";
import ServicesPage from "./pages/ServicesPage";
import UsersPage from "./pages/UsersPage";
import WalletsPage from "./pages/WalletsPage";

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center" }}>Loading panel...</div>;
  }

  const role = user?.role;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        {role === "admin" && (
          <>
            <Route path="users" element={<UsersPage />} />
            <Route path="wallets" element={<WalletsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
          </>
        )}

        {(role === "admin" || role === "vendor") && (
          <>
            <Route path="products" element={<ProductsPage />} />
            <Route path="services" element={<ServicesPage />} />
          </>
        )}

        {(role === "admin" || role === "vendor" || role === "delivery") && (
          <Route path="orders" element={<OrdersPage />} />
        )}
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default App;
