import { Fragment, useEffect, useState } from "react";
import { orderService } from "../api/services";

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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await orderService.list();
      setOrders(normalizeRows(data));
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (orderId, orderStatus) => {
    try {
      await orderService.update(orderId, { orderStatus });
      await loadOrders();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
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
        Orders are placed from the storefront checkout (Razorpay). Manage status, delivery, and
        cancellations here.
      </p>
      {error && <p className="error">{error}</p>}

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
                <th>Payment</th>
                <th>Paid</th>
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
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
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
                      <td>{order.isPaid ? "Yes" : "No"}</td>
                      <td className="row" style={{ flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setExpandedId(expanded ? null : order._id)}
                        >
                          {expanded ? "Hide" : "Details"}
                        </button>
                        {order.orderStatus !== "CANCELLED" && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => cancelOrder(order._id)}
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => assignDelivery(order._id)}
                        >
                          Delivery
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => updateExpectedDelivery(order._id)}
                        >
                          ETA
                        </button>
                        <button type="button" className="danger" onClick={() => deleteOrder(order._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${order._id}-detail`}>
                        <td colSpan={8}>
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
                            {(order.deliveryPartner || order.trackingId) && (
                              <p style={{ marginTop: 8 }}>
                                <strong>Delivery:</strong> {order.deliveryPartner || "-"} ·{" "}
                                {order.trackingId || "-"}
                                {order.expectedDeliveryDate
                                  ? ` · ETA ${new Date(order.expectedDeliveryDate).toLocaleDateString()}`
                                  : ""}
                              </p>
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
                  <td colSpan={8}>No orders found.</td>
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
