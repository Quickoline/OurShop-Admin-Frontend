import { useEffect, useState } from "react";
import {
  brandService,
  categoryService,
  orderService,
  productService,
  reviewService,
  serviceService,
  userService,
} from "../api/services";

const cardConfig = [
  { key: "users", label: "Users", service: userService },
  { key: "products", label: "Products", service: productService },
  { key: "services", label: "Services", service: serviceService },
  { key: "categories", label: "Categories", service: categoryService },
  { key: "brands", label: "Brands", service: brandService },
  { key: "reviews", label: "Reviews", service: reviewService },
  { key: "orders", label: "Orders", service: orderService },
];

const normalizeRows = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.users)) return result.users;
  if (Array.isArray(result?.products)) return result.products;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const DashboardPage = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError("");
      try {
        const results = await Promise.all(
          cardConfig.map(async (item) => {
            const rows = normalizeRows(await item.service.list());
            return [item.key, rows.length];
          })
        );
        setStats(Object.fromEntries(results));
      } catch (err) {
        setError(err?.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <section>
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="stats-grid">
        {cardConfig.map((item) => (
          <div className="card stat-card" key={item.key}>
            <h3>{item.label}</h3>
            <p>{loading ? "..." : stats[item.key] ?? 0}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DashboardPage;
