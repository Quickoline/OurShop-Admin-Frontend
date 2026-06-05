import { useCallback, useEffect, useState } from "react";
import { walletService } from "../api/services";

const formatMoney = (n) => `₹${Number(n || 0).toFixed(2)}`;

const TYPE_LABELS = {
  admin_share: "Catalog profit share (50%)",
  unallocated: "Unallocated MLM (no upline)",
  admin_adjustment: "Manual adjustment",
  mlm_commission: "MLM commission",
  withdrawal: "Withdrawal",
  refund: "Refund",
};

const LEVEL_LABELS = {
  head: "Head",
  level1: "Level 1",
  level2: "Level 2",
  level3: "Level 3",
  level4: "Level 4",
  level5: "Level 5",
  level6: "Level 6",
};

const WalletsPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [company, setCompany] = useState(null);
  const [companyPage, setCompanyPage] = useState(1);

  const loadCompany = useCallback(async (page = 1) => {
    setCompanyLoading(true);
    try {
      const data = await walletService.getCompanyWallet({ page, limit: 25 });
      setCompany(data);
      setCompanyPage(page);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await walletService.listUsers({ search, limit: 50 });
      setUsers(data?.users || (Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadCompany(companyPage), loadUsers()]);
  };

  useEffect(() => {
    loadCompany(1);
    loadUsers();
  }, [loadCompany]);

  const openUser = async (user) => {
    setSelected(user);
    setAdjustAmount("");
    setAdjustNote("");
    try {
      const data = await walletService.getTransactions(user._id, { limit: 30 });
      setTransactions(data?.transactions || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const onAdjust = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await walletService.adjust(selected._id, {
        amount: Number(adjustAmount),
        description: adjustNote || "Admin wallet adjustment",
      });
      setAdjustAmount("");
      setAdjustNote("");
      await refreshAll();
      await openUser(
        (await walletService.listUsers({ search: selected.email, limit: 1 }))?.users?.[0] ||
          selected
      );
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const summary = company?.summary;
  const account = company?.account;

  return (
    <section>
      <div className="page-head">
        <h1>Wallets</h1>
        <button type="button" onClick={refreshAll}>
          Refresh
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginBottom: 20, border: "2px solid #0f172a" }}>
        <div className="page-head" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 20 }}>Company wallet</h2>
            <p className="muted" style={{ marginTop: 4 }}>
              Admin account receives catalog profit share and unallocated MLM levels (missing
              upline).
            </p>
          </div>
        </div>

        {companyLoading && !company ? (
          <p>Loading company wallet...</p>
        ) : account ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div className="stat-pill" style={{ background: "#0f172a", color: "#fff" }}>
                <span className="muted" style={{ color: "#94a3b8", fontSize: 12 }}>
                  Current balance
                </span>
                <strong style={{ fontSize: 22 }}>{formatMoney(summary?.balance)}</strong>
              </div>
              <div className="stat-pill">
                <span className="muted" style={{ fontSize: 12 }}>
                  Catalog profit (50%)
                </span>
                <strong>{formatMoney(summary?.catalogProfitShare)}</strong>
              </div>
              <div className="stat-pill">
                <span className="muted" style={{ fontSize: 12 }}>
                  Unallocated MLM
                </span>
                <strong>{formatMoney(summary?.unallocatedMlm)}</strong>
              </div>
              <div className="stat-pill">
                <span className="muted" style={{ fontSize: 12 }}>
                  Manual adjustments
                </span>
                <strong>{formatMoney(summary?.manualAdjustments)}</strong>
              </div>
              <div className="stat-pill">
                <span className="muted" style={{ fontSize: 12 }}>
                  All user wallets (sum)
                </span>
                <strong>{formatMoney(summary?.totalUserWallets)}</strong>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <h4 style={{ marginBottom: 8 }}>Account</h4>
                <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <strong>{account.name}</strong>
                  <br />
                  {account.email}
                  <br />
                  Role: {account.role}
                  {account.referralCode && (
                    <>
                      <br />
                      Code: {account.referralCode}
                    </>
                  )}
                </p>
              </div>
              <div>
                <h4 style={{ marginBottom: 8 }}>Unallocated MLM by level</h4>
                {company?.unallocatedByLevel?.length ? (
                  <ul style={{ fontSize: 13, paddingLeft: 18, margin: 0 }}>
                    {company.unallocatedByLevel.map((row) => (
                      <li key={row.level} style={{ marginBottom: 4 }}>
                        {LEVEL_LABELS[row.level] || row.level}: {formatMoney(row.total)} (
                        {row.count} txn)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted" style={{ fontSize: 13 }}>
                    No unallocated level payouts yet.
                  </p>
                )}
              </div>
            </div>

            <h4 style={{ marginBottom: 8 }}>Company transaction history</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Level</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Balance after</th>
                  </tr>
                </thead>
                <tbody>
                  {(company?.transactions || []).map((tx) => (
                    <tr key={tx._id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td>{TYPE_LABELS[tx.type] || tx.type}</td>
                      <td>{tx.mlmLevel ? LEVEL_LABELS[tx.mlmLevel] || tx.mlmLevel : "—"}</td>
                      <td style={{ fontSize: 12, maxWidth: 280 }}>{tx.description || "—"}</td>
                      <td
                        style={{
                          fontWeight: 600,
                          color: Number(tx.amount) >= 0 ? "#15803d" : "#b91c1c",
                        }}
                      >
                        {Number(tx.amount) >= 0 ? "+" : ""}
                        {formatMoney(tx.amount)}
                      </td>
                      <td>{formatMoney(tx.balanceAfter)}</td>
                    </tr>
                  ))}
                  {!company?.transactions?.length && (
                    <tr>
                      <td colSpan={6}>No transactions</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {company?.pagination?.totalPages > 1 && (
              <div className="row" style={{ marginTop: 12, gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={companyPage <= 1 || companyLoading}
                  onClick={() => loadCompany(companyPage - 1)}
                >
                  Previous
                </button>
                <span className="muted" style={{ fontSize: 13 }}>
                  Page {companyPage} of {company.pagination.totalPages} (
                  {company.pagination.total} total)
                </span>
                <button
                  type="button"
                  className="secondary"
                  disabled={
                    companyPage >= company.pagination.totalPages || companyLoading
                  }
                  onClick={() => loadCompany(companyPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="muted">Company wallet unavailable.</p>
        )}
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 8 }}>User wallets</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        View balances, MLM referral codes, and credit or debit user wallets manually.
      </p>

      <div className="row" style={{ marginBottom: 12, gap: 8 }}>
        <input
          placeholder="Search name, email, referral code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="button" onClick={loadUsers}>
          Search
        </button>
      </div>

      <div className="grid-two">
        <div className="card table-wrap">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Referral</th>
                  <th>Balance</th>
                  <th>Sponsor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.referralCode || "—"}</td>
                    <td>{formatMoney(u.walletBalance)}</td>
                    <td>{u.sponsor?.name || "—"}</td>
                    <td>
                      <button type="button" className="secondary" onClick={() => openUser(u)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={6}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card form-grid">
            <h3>{selected.name}</h3>
            <p>
              <strong>Balance:</strong> {formatMoney(selected.walletBalance)}
            </p>
            <p>
              <strong>Referral code:</strong> {selected.referralCode || "—"}
            </p>

            <form onSubmit={onAdjust}>
              <h4>Adjust wallet</h4>
              <label>
                Amount (+ credit / − debit)
                <input
                  type="number"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  required
                />
              </label>
              <label>
                Note
                <input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Reason for adjustment"
                />
              </label>
              <button type="submit">Apply adjustment</button>
            </form>

            <div>
              <h4>Recent transactions</h4>
              <ul style={{ fontSize: 13, paddingLeft: 18 }}>
                {transactions.map((tx) => (
                  <li key={tx._id} style={{ marginBottom: 6 }}>
                    {tx.description || tx.type}: {formatMoney(tx.amount)} (
                    {new Date(tx.createdAt).toLocaleString()})
                  </li>
                ))}
                {!transactions.length && <li>No transactions</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default WalletsPage;
