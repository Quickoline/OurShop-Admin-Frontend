import { useEffect, useState } from "react";
import {
  brandService,
  categoryService,
  orderService,
  productService,
  reviewService,
  serviceService,
  userService,
  walletService,
} from "../api/services";
import { useAuth } from "../context/AuthContext";

const normalizeRows = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.users)) return result.users;
  if (Array.isArray(result?.products)) return result.products;
  if (Array.isArray(result?.services)) return result.services;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Stats states
  const [adminStats, setAdminStats] = useState({});
  
  // Vendor specific states
  const [vendorProducts, setVendorProducts] = useState([]);
  const [vendorServices, setVendorServices] = useState([]);
  const [vendorRevenue, setVendorRevenue] = useState(0);
  const [vendorProfits, setVendorProfits] = useState(0);
  const [vendorReviews, setVendorReviews] = useState([]);

  // Delivery partner specific states
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [deliveryDeliveredCount, setDeliveryDeliveredCount] = useState(0);
  const [deliveryEarnings, setDeliveryEarnings] = useState(0);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      if (user?.role === "admin") {
        const cardConfig = [
          { key: "users", service: userService },
          { key: "products", service: productService },
          { key: "services", service: serviceService },
          { key: "categories", service: categoryService },
          { key: "brands", service: brandService },
          { key: "reviews", service: reviewService },
          { key: "orders", service: orderService },
        ];
        const results = await Promise.all(
          cardConfig.map(async (item) => {
            const rows = normalizeRows(await item.service.list());
            return [item.key, rows.length];
          })
        );
        setAdminStats(Object.fromEntries(results));
      } else if (user?.role === "vendor") {
        const [prodRows, servRows, ordRows, revRows] = await Promise.all([
          productService.list(),
          serviceService.list(),
          orderService.list(),
          reviewService.list(),
        ]);

        const productsList = normalizeRows(prodRows);
        const servicesList = normalizeRows(servRows);
        const ordersList = normalizeRows(ordRows);
        const allReviewsList = normalizeRows(revRows);

        setVendorProducts(productsList);
        setVendorServices(servicesList);

        // Calculate Revenue and Profits based on Vendor items only
        let totalRev = 0;
        let totalProf = 0;
        const myUserId = String(user.id || user._id);

        ordersList.forEach((order) => {
          const items = Array.isArray(order.orderItems) ? order.orderItems : [];
          items.forEach((item) => {
            const itemVendorId = String(item.vendor?._id || item.vendor || "");
            if (itemVendorId === myUserId) {
              const qty = Number(item.quantity || 0);
              totalRev += Number(item.price || 0) * qty;
              totalProf += Number(item.profitAmount || 0) * qty;
            }
          });
        });

        setVendorRevenue(Number(totalRev.toFixed(2)));
        setVendorProfits(Number(totalProf.toFixed(2)));

        // Filter reviews that belong to vendor's products
        const myProductIds = productsList.map((p) => String(p._id));
        const filteredReviews = allReviewsList.filter((rev) => {
          const revProdId = String(rev.productId?._id || rev.productId || "");
          return myProductIds.includes(revProdId);
        });
        setVendorReviews(filteredReviews);

      } else if (user?.role === "delivery") {
        const [ordRows, walletSummary] = await Promise.all([
          orderService.list(),
          walletService.getMyWallet(),
        ]);

        const ordersList = normalizeRows(ordRows);
        setDeliveryOrders(ordersList);
        setDeliveryDeliveredCount(ordersList.filter((o) => o.orderStatus === "DELIVERED").length);
        setDeliveryEarnings(walletSummary?.walletBalance || 0);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center" }}>Loading stats dashboard...</div>;
  }

  // Render Admin Dashboard
  if (user?.role === "admin") {
    const cardConfig = [
      { key: "users", label: "Users" },
      { key: "products", label: "Products" },
      { key: "services", label: "Services" },
      { key: "categories", label: "Categories" },
      { key: "brands", label: "Brands" },
      { key: "reviews", label: "Reviews" },
      { key: "orders", label: "Orders" },
    ];
    return (
      <section>
        <div className="page-head">
          <h1>Super Admin Dashboard</h1>
          <button onClick={loadData}>Refresh</button>
        </div>
        {error && <p className="error">{error}</p>}

        <div className="stats-grid">
          {cardConfig.map((item) => (
            <div className="card stat-card" key={item.key}>
              <h3>{item.label}</h3>
              <p>{adminStats[item.key] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Render Vendor Dashboard
  if (user?.role === "vendor") {
    return (
      <section>
        <div className="page-head">
          <h1>Vendor Dashboard</h1>
          <button onClick={loadData}>Refresh</button>
        </div>
        {error && <p className="error">{error}</p>}

        <div className="stats-grid">
          <div className="card stat-card">
            <h3>Products</h3>
            <p>{vendorProducts.length}</p>
          </div>
          <div className="card stat-card">
            <h3>Services</h3>
            <p>{vendorServices.length}</p>
          </div>
          <div className="card stat-card">
            <h3>Total Revenue</h3>
            <p>₹{vendorRevenue}</p>
          </div>
          <div className="card stat-card">
            <h3>Total Profits</h3>
            <p>₹{vendorProfits}</p>
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <h3>Product Reviews ({vendorReviews.length})</h3>
          <div style={{ marginTop: 12 }}>
            {vendorReviews.map((rev) => {
              const stars = "⭐".repeat(Number(rev.rating || 0));
              return (
                <div key={rev._id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{rev.productId?.title || "Product"}</strong>
                    <span style={{ fontSize: "14px" }}>{stars}</span>
                  </div>
                  <p style={{ margin: "4px 0", color: "var(--foreground-muted, #64748b)" }}>{rev.comment}</p>
                  <div style={{ fontSize: "12px", color: "var(--foreground-subtle, #94a3b8)" }}>
                    By {rev.userId?.name || "Anonymous"} · {new Date(rev.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
            {!vendorReviews.length && <p className="muted">No reviews found for your products.</p>}
          </div>
        </div>
      </section>
    );
  }

  // Render Delivery Partner Dashboard
  if (user?.role === "delivery") {
    return (
      <section>
        <div className="page-head">
          <h1>Delivery Dashboard</h1>
          <button onClick={loadData}>Refresh</button>
        </div>
        {error && <p className="error">{error}</p>}

        <div className="stats-grid">
          <div className="card stat-card">
            <h3>Total Orders</h3>
            <p>{deliveryOrders.length}</p>
          </div>
          <div className="card stat-card">
            <h3>Delivered Orders</h3>
            <p>{deliveryDeliveredCount}</p>
          </div>
          <div className="card stat-card">
            <h3>Total Earnings</h3>
            <p>₹{deliveryEarnings}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1>Dashboard</h1>
      <p className="muted">No role specific stats to show.</p>
    </section>
  );
};

export default DashboardPage;
