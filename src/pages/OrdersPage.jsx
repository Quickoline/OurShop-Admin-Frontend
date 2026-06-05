import { Fragment, useEffect, useState } from "react";
import { orderService, walletService } from "../api/services";

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
  const [orders, setOrders] = useState([]);
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
        MLM on <strong>DELIVERED</strong>: Head = buyer; Levels 1–6 = sponsor upline only (no
        downline). Missing upline slots → company wallet.
      </p>
      {error && <p className="error">{error}</p>}
      {success && <p className="muted" style={{ color: "green", marginBottom: 12 }}>{success}</p>}

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
                <th>MLM</th>
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
                      <td className="row" style={{ flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setExpandedId(expanded ? null : order._id)}
                        >
                          {expanded ? "Hide" : "Details"}
                        </button>
                        {order.orderStatus === "DELIVERED" &&
                          orderHasCommissionableItems(order) &&
                          !order.commissionDistributed && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => runMlmDistribution(order._id)}
                          >
                            Distribute MLM
                          </button>
                        )}
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
                        <td colSpan={9}>
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
                  <td colSpan={9}>No orders found.</td>
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
