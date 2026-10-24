import { useEffect, useMemo, useState } from "react";

const toFormState = (fields, item = {}) =>
  fields.reduce((acc, field) => {
    acc[field.name] = item[field.name] ?? field.defaultValue ?? "";
    return acc;
  }, {});

const normalizeRows = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.users)) return result.users;
  if (Array.isArray(result?.products)) return result.products;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const listTotal = (result) => {
  if (Array.isArray(result)) return result.length;
  return result?.pagination?.totalUsers ?? result?.pagination?.total ?? normalizeRows(result).length;
};

const castForSubmit = (value, type) => {
  if (type === "number") return value === "" ? 0 : Number(value);
  if (type === "checkbox") return Boolean(value);
  if (type === "json") {
    try {
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  }
  return value;
};

const EntityCrudPage = ({ title, service, fields, columns, extraActions }) => {
  const [items, setItems] = useState([]);
  const [listMeta, setListMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(toFormState(fields));

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await service.list();
      setItems(normalizeRows(data));
      setListMeta({ total: listTotal(data) });
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const onChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const clearForm = () => {
    setEditing(null);
    setFormData(toFormState(fields));
  };

  const startEdit = (item) => {
    setEditing(item);
    setFormData(
      fields.reduce((acc, field) => {
        if (field.type === "json") {
          acc[field.name] = JSON.stringify(item[field.name] ?? [], null, 2);
        } else if (field.type === "checkbox") {
          acc[field.name] = Boolean(item[field.name]);
        } else {
          acc[field.name] = item[field.name] ?? field.defaultValue ?? "";
        }
        return acc;
      }, {})
    );
  };

  const payload = useMemo(
    () =>
      fields.reduce((acc, field) => {
        acc[field.name] = castForSubmit(formData[field.name], field.type);
        return acc;
      }, {}),
    [fields, formData]
  );

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (editing?._id) {
        await service.update(editing._id, payload);
      } else {
        await service.create(payload);
      }
      clearForm();
      await loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await service.remove(id);
      await loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  return (
    <section>
      <div className="page-head">
        <h1>{title}</h1>
        <button onClick={loadItems}>Refresh</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="grid-two">
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>{editing ? `Edit ${title.slice(0, -1)}` : `Create ${title.slice(0, -1)}`}</h3>
          {fields.map((field) => {
            if (field.type === "checkbox") {
              return (
                <label key={field.name} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={Boolean(formData[field.name])}
                    onChange={(e) => onChange(field.name, e.target.checked)}
                  />
                  {field.label}
                </label>
              );
            }

            if (field.type === "select") {
              return (
                <label key={field.name}>
                  {field.label}
                  <select
                    value={formData[field.name]}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    required={field.required}
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label || opt.name || opt.value}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            if (field.type === "textarea" || field.type === "json") {
              return (
                <label key={field.name}>
                  {field.label}
                  <textarea
                    rows={field.rows || 3}
                    value={formData[field.name]}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </label>
              );
            }

            return (
              <label key={field.name}>
                {field.label}
                <input
                  type={field.type || "text"}
                  value={formData[field.name]}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </label>
            );
          })}
          <div className="row">
            <button type="submit">{editing ? "Update" : "Create"}</button>
            {editing && (
              <button type="button" className="secondary" onClick={clearForm}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="card table-wrap">
          <h3>
            {title} List ({items.length}
            {listMeta.total > items.length ? ` of ${listMeta.total}` : ""})
          </h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {typeof col.render === "function"
                          ? col.render(item)
                          : String(item[col.key] ?? "-")}
                      </td>
                    ))}
                    <td className="row">
                      <button className="secondary" onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      {extraActions?.map((action) => (
                        <button
                          key={action.label}
                          className="secondary"
                          onClick={() => action.onClick(item, loadItems)}
                        >
                          {action.label}
                        </button>
                      ))}
                      <button className="danger" onClick={() => onDelete(item._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={columns.length + 1}>No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};

export default EntityCrudPage;
