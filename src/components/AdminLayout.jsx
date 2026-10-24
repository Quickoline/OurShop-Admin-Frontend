import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { path: "/", label: "Dashboard", end: true },
  { path: "/users", label: "Users" },
  { path: "/wallets", label: "Wallets" },
  { path: "/products", label: "Products" },
  { path: "/services", label: "Services" },
  { path: "/categories", label: "Categories" },
  { path: "/brands", label: "Brands" },
  { path: "/reviews", label: "Reviews" },
  { path: "/orders", label: "Orders" },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNavItems = navItems.filter((item) => {
    const role = user?.role;
    if (role === "admin") return true;
    if (role === "vendor") {
      return ["/", "/products", "/services", "/orders"].includes(item.path);
    }
    if (role === "delivery") {
      return ["/", "/orders"].includes(item.path);
    }
    return false;
  });

  const panelTitle =
    user?.role === "admin"
      ? "Super Admin"
      : user?.role === "vendor"
      ? "Vendor Panel"
      : user?.role === "delivery"
      ? "Delivery Panel"
      : "Panel";

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>{panelTitle}</h2>
        <nav>
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <strong>{user?.name || "Admin"}</strong>
            <p>{user?.email || "admin@example.com"}</p>
          </div>
          <button className="danger-outline" onClick={onLogout}>
            Logout
          </button>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </section>
    </div>
  );
};

export default AdminLayout;
