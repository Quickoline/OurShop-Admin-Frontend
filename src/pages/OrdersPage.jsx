import { Fragment, useEffect, useState } from "react";
import { orderService, walletService, userService } from "../api/services";
import { useAuth } from "../context/AuthContext";

const statusOptions = [
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
];

const PAYMENT_METHODS = ["RAZORPAY", "UPI", "CARD", "NETBANKING"];

const normalizeRows = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const formatAddress = (address) => {
  if (!address || typeof address !== "object") return "-";
  const parts = [
    address.fullName,
    address.addressLine,
    [address.city, address.state, address.pincode].filter(Boolean).join(", "),
    address.country,
    address.phone ? `Phone: ${address.phone}` : "",
  ].filter(Boolean);
  return parts.join(" · ") || "-";
};

const orderHasCommissionableItems = (order) =>
  Array.isArray(order.orderItems) &&
  order.orderItems.some(
    (item) =>
      item.itemType === "product" ||
      item.product ||
      item.itemType === "service" ||
      item.service
  );

const lineItemLabel = (item) => {
  const type = item.itemType === "service" || item.service ? "Service" : "Product";
  const title =
    item.title ||
    item.product?.title ||
    item.service?.title ||
  "Untitled";
  return `[${type}] ${title} × ${item.quantity || 1} — ₹${item.price ?? 0}`;
};

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const apiMessage = (err) =>
    err?.response?.data?.message ||
    err?.response?.data?.details ||
    err?.message ||
    "Request failed";

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await orderService.list();
      setOrders(normalizeRows(data));
      if (user?.role === "admin") {
        const dpRows = await userService.list({ role: "delivery" });
        const dpList = Array.isArray(dpRows) ? dpRows : dpRows?.data || [];
        setDeliveryPartners(dpList);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const getStatusOptions = (currentStatus) => {
    const role = user?.role;
    let allowed = [];
    if (role === "admin") allowed = statusOptions;
    else if (role === "vendor") {
      allowed = ["CONFIRMED", "PACKED", "SHIPPED", "CANCELLED"];
    } else if (role === "delivery") {
      allowed = ["OUT_FOR_DELIVERY", "DELIVERED"];
    }
    
    if (currentStatus && !allowed.includes(currentStatus)) {
      return [currentStatus, ...allowed];
    }
    return allowed;
  };

  const updateStatus = async (orderId, orderStatus) => {
    setError("");
    setSuccess("");
    try {
      const res = await orderService.update(orderId, { orderStatus });
      setSuccess(res?.message || "Order updated");
      await loadOrders();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  const togglePaid = async (order) => {
    try {
      await orderService.markPaid(order._id, !order.isPaid);
      await loadOrders();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const runMlmDistribution = async (orderId) => {
    setError("");
    setSuccess("");
    try {
      const res = await walletService.distributeOrder(orderId);
      if (res?.skipped) {
        setError(`MLM not applied: ${res.reason}`);
        return;
      }
      setSuccess(
        res?.message ||
          `MLM distributed — profit ₹${res?.totalProfit ?? res?.data?.totalProfit ?? 0}`
      );
      await loadOrders();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Cancel this order?")) return;
    try {
      await orderService.cancel(orderId);
      await loadOrders();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const assignDelivery = async (orderId) => {
    const deliveryPartner = window.prompt("Delivery partner:");
    const trackingId = window.prompt("Tracking ID:");
    const expectedDeliveryDate = window.prompt("Expected date (YYYY-MM-DD):");
    if (!deliveryPartner || !trackingId || !expectedDeliveryDate) return;

    try {
      await orderService.assignDelivery(orderId, {
        deliveryPartner,
        trackingId,
        expectedDeliveryDate,
      });
      await loadOrders();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const updateExpectedDelivery = async (orderId) => {
    const expectedDeliveryDate = window.prompt("Expected date (YYYY-MM-DD):");
    if (!expectedDeliveryDate) return;
    try {
      await orderService.updateExpectedDelivery(orderId, { expectedDeliveryDate });
      await loadOrders();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await orderService.remove(orderId);
      await loadOrders();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  return (
    <section>
      <div className="page-head">
        <h1>Orders</h1>
        <button onClick={loadOrders}>Refresh</button>
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        MLM on <strong>DELIVERED</strong>: 6-hop window — direct sponsor 30%, then 20/20/10/10/10.
        Hop 7+ exits (no upline payout). Depth 7+ from head = level 6. Missing hops → company
        wallet.
      </p>
      {error && <p className="error">{error}</p>}
      {success && <p className="success" style={{ color: "green", marginBottom: 12 }}>{success}</p>}

      <div className="card table-wrap">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                {user?.role === "admin" && (
                  <>
                    <th>Payment</th>
                    <th>Paid</th>
                    <th>MLM</th>
                  </>
                )}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const items = Array.isArray(order.orderItems) ? order.orderItems : [];
                const expanded = expandedId === order._id;
                return (
                  <Fragment key={order._id}>
                    <tr>
                      <td>{order.invoiceNumber || order._id?.slice(-8) || "-"}</td>
                      <td>{order.user?.email || order.user?.name || "-"}</td>
                      <td>{items.length}</td>
                      <td>₹{order.totalPrice ?? 0}</td>
                      <td>
                        <select
                          value={order.orderStatus || "PLACED"}
                          onChange={(e) => updateStatus(order._id, e.target.value)}
                        >
                          {getStatusOptions(order.orderStatus).map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      {user?.role === "admin" && (
                        <>
                          <td>
                            <span
                              className={
                                PAYMENT_METHODS.includes(order.paymentMethod)
                                  ? ""
                                  : "error"
                              }
                            >
                              {order.paymentMethod || "-"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => togglePaid(order)}
                            >
                              {order.isPaid ? "Paid ✓" : "Mark paid"}
                            </button>
                          </td>
                          <td>{order.commissionDistributed ? "Done ✓" : "Pending"}</td>
                        </>
                      )}
                      <td className="row" style={{ flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setExpandedId(expanded ? null : order._id)}
                        >
                          {expanded ? "Hide" : "Details"}
                        </button>
                        {user?.role === "admin" && order.orderStatus === "DELIVERED" &&
                          orderHasCommissionableItems(order) &&
                          !order.commissionDistributed && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => distributeCommission(order._id)}
                          >
                            Wallet Dist.
                          </button>
                        )}
                        {order.orderStatus !== "CANCELLED" && (user?.role === "admin" || user?.role === "vendor") && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => cancelOrder(order._id)}
                          >
                            Cancel
                          </button>
                        )}
                        {user?.role === "admin" && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => assignDelivery(order._id)}
                          >
                            Delivery
                          </button>
                        )}
                        {(user?.role === "admin" || user?.role === "delivery") && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => updateExpectedDelivery(order._id)}
                          >
                            ETA
                          </button>
                        )}
                        {user?.role === "admin" && (
                          <button type="button" className="danger" onClick={() => deleteOrder(order._id)}>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${order._id}-detail`}>
                        <td colSpan={user?.role === "admin" ? 9 : 6}>
                          <div
                            style={{
                              padding: "12px 8px",
                              background: "var(--surface-muted, #f8fafc)",
                              borderRadius: 8,
                            }}
                          >
                            <p>
                              <strong>Shipping:</strong> {formatAddress(order.shippingAddress)}
                            </p>
                            <p style={{ marginTop: 8 }}>
                              <strong>Line items:</strong>
                            </p>
                            <ul style={{ margin: "6px 0 0 18px" }}>
                              {items.map((item, idx) => (
                                <li key={idx}>{lineItemLabel(item)}</li>
                              ))}
                              {!items.length && <li>No items</li>}
                            </ul>
                            {order.commissionDistributed && (
                              <p style={{ marginTop: 8 }}>
                                <strong>MLM:</strong> distributed · profit ₹
                                {order.mlmProfitTotal ?? 0}
                              </p>
                            )}
                            {(order.deliveryPartner || order.trackingId) && (
                              <p style={{ marginTop: 8 }}>
                                <strong>Delivery:</strong> {order.deliveryPartner || "-"} ·{" "}
                                {order.trackingId || "-"}
                                {order.expectedDeliveryDate
                                  ? ` · ETA ${new Date(order.expectedDeliveryDate).toLocaleDateString()}`
                                  : ""}
                                {order.deliveryPartnerEarning
                                  ? ` · Earning ₹${order.deliveryPartnerEarning}`
                                  : ""}
                              </p>
                            )}
                            
                            {user?.role === "vendor" && order.assignedDeliveryPartner && (
                              <div
                                style={{
                                  marginTop: 12,
                                  padding: 12,
                                  border: "1px solid var(--border, #e2e8f0)",
                                  borderRadius: 6,
                                  background: "#ffffff",
                                }}
                              >
                                <h4 style={{ marginBottom: 8 }}>Delivery Partner Earning</h4>
                                <form
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const earning = formData.get("deliveryPartnerEarning");
                                    if (earning === null || earning === "") return;
                                    
                                    setError("");
                                    setSuccess("");
                                    try {
                                      await orderService.update(order._id, {
                                        deliveryPartnerEarning: Number(earning),
                                      });
                                      setSuccess("Delivery partner earning updated and wallet credited!");
                                      await loadOrders();
                                    } catch (err) {
                                      setError(apiMessage(err));
                                    }
                                  }}
                                >
                                  <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
                                    <label style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                                      Earning Amount (₹):
                                      <input
                                        type="number"
                                        name="deliveryPartnerEarning"
                                        required
                                        min="0"
                                        step="0.01"
                                        defaultValue={order.deliveryPartnerEarning || ""}
                                        style={{ marginTop: 4 }}
                                      />
                                    </label>
                                    <button type="submit" style={{ height: 38, padding: "0 16px" }}>Save Earning</button>
                                  </div>
                                </form>
                              </div>
                            )}

                            {user?.role === "vendor" && !order.assignedDeliveryPartner && (
                              <p style={{ marginTop: 8, color: "var(--foreground-muted, #64748b)", fontSize: "14px" }}>
                                * No delivery partner assigned to this order yet.
                              </p>
                            )}
                            
                            {user?.role === "admin" && (
                              <div
                                style={{
                                  marginTop: 12,
                                  padding: 12,
                                  border: "1px solid var(--border, #e2e8f0)",
                                  borderRadius: 6,
                                  background: "#ffffff",
                                }}
                              >
                                <h4 style={{ marginBottom: 8 }}>Assign Delivery Partner</h4>
                                <form
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const dpId = formData.get("assignedDeliveryPartner");
                                    const tracking = formData.get("trackingId");
                                    const eta = formData.get("expectedDeliveryDate");
                                    if (!dpId || !tracking || !eta) return;
                                    
                                    const selectedPartner = deliveryPartners.find((p) => p._id === dpId);
                                    
                                    setError("");
                                    setSuccess("");
                                    try {
                                      await orderService.assignDelivery(order._id, {
                                        deliveryPartner: selectedPartner ? selectedPartner.name : "Partner",
                                        trackingId: tracking,
                                        expectedDeliveryDate: eta,
                                        assignedDeliveryPartner: dpId,
                                      });
                                      setSuccess("Delivery details assigned successfully!");
                                      await loadOrders();
                                    } catch (err) {
                                      setError(apiMessage(err));
                                    }
                                  }}
                                >
                                  <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                                    <label style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column" }}>
                                      Delivery Partner:
                                      <select name="assignedDeliveryPartner" required defaultValue={order.assignedDeliveryPartner?._id || order.assignedDeliveryPartner || ""} style={{ marginTop: 4 }}>
                                        <option value="">Select Delivery Partner...</option>
                                        {deliveryPartners.map((p) => (
                                          <option key={p._id} value={p._id}>
                                            {p.name} ({p.email})
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column" }}>
                                      Tracking ID:
                                      <input type="text" name="trackingId" required defaultValue={order.trackingId || ""} style={{ marginTop: 4 }} />
                                    </label>
                                    <label style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column" }}>
                                      ETA (YYYY-MM-DD):
                                      <input type="date" name="expectedDeliveryDate" required defaultValue={order.expectedDeliveryDate ? String(order.expectedDeliveryDate).slice(0, 10) : ""} style={{ marginTop: 4 }} />
                                    </label>
                                    <button type="submit" style={{ height: 38, padding: "0 16px" }}>Save</button>
                                  </div>
                                </form>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!orders.length && (
                <tr>
                  <td colSpan={user?.role === "admin" ? 9 : 6}>No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default OrdersPage;
