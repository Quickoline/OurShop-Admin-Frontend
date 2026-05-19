import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { path: "/", label: "Dashboard", end: true },
  { path: "/users", label: "Users" },
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

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Admin Panel</h2>
        <nav>
          {navItems.map((item) => (
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
