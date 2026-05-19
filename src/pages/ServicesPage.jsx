import { useEffect, useRef, useState } from "react";
import { brandService, categoryService, serviceService } from "../api/services";
import {
  formatSpecificationsField,
  formatStringArrayField,
  normalizeListRows,
  parseJsonArrayField,
  parseSpecificationsText,
} from "../utils/catalogForm";

const defaultForm = {
  title: "",
  description: "",
  price: "",
  priceAfterDiscount: "",
  capacity: "",
  duration: "",
  unit: "session",
  category: "",
  subcategory: "",
  brand: "",
  tags: [],
  benefits: "",
  howToUse: "",
  aboutItems: "",
  specifications: "",
  isActive: true,
};

const UNIT_OPTIONS = ["session", "hour", "visit", "package", "other"];
const TAG_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "bestseller", label: "Best Seller" },
  { value: "newly_launched", label: "Newly Launched" },
  { value: "mega_offer", label: "Mega Offer" },
  { value: "combo", label: "Combo" },
  { value: "gift", label: "Gift" },
];

const JSON_FIELDS = {
  benefits: { label: "Benefits", mode: "stringArray", formatter: formatStringArrayField },
  aboutItems: { label: "About This Service", mode: "stringArray", formatter: formatStringArrayField },
  specifications: { label: "Specifications", mode: "specifications", formatter: formatSpecificationsField },
};

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [imgCover, setImgCover] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [existingGallery, setExistingGallery] = useState([]);
  const galleryInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [serviceRows, categoryRows, brandRows] = await Promise.all([
        serviceService.list(),
        categoryService.list(),
        brandService.list(),
      ]);
      setServices(normalizeListRows(serviceRows, "services"));
      setCategories(Array.isArray(categoryRows) ? categoryRows : categoryRows?.data || []);
      setBrands(Array.isArray(brandRows) ? brandRows : brandRows?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearForm = () => {
    setEditing(null);
    setForm(defaultForm);
    setImgCover(null);
    setGallery([]);
    setExistingGallery([]);
  };

  const onSelectGalleryFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setGallery((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      price: item.price ?? "",
      priceAfterDiscount: item.priceAfterDiscount ?? "",
      capacity: item.capacity ?? "",
      duration: item.duration || "",
      unit: item.unit || "session",
      category: item.category?._id || item.category || "",
      subcategory: item.subcategory?._id || item.subcategory || "",
      brand: item.brand?._id || item.brand || "",
      tags: Array.isArray(item.tags) ? item.tags : [],
      benefits: formatStringArrayField(item.benefits || []),
      howToUse: item.howToUse || "",
      aboutItems: formatStringArrayField(item.aboutItems || []),
      specifications: formatSpecificationsField(item.specifications || []),
      isActive: Boolean(item.isActive),
    });
    setImgCover(null);
    setGallery([]);
    setExistingGallery(Array.isArray(item.images) ? item.images : []);
  };

  const toggleTag = (tagValue) => {
    setForm((prev) => {
      const exists = prev.tags.includes(tagValue);
      return {
        ...prev,
        tags: exists ? prev.tags.filter((v) => v !== tagValue) : [...prev.tags, tagValue],
      };
    });
  };

  const onJsonFieldBlur = (fieldName) => {
    try {
      const fieldConfig = JSON_FIELDS[fieldName];
      const parsed = parseJsonArrayField(form[fieldName], fieldConfig);
      setForm((prev) => ({ ...prev, [fieldName]: fieldConfig.formatter(parsed) }));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const buildFormData = () => {
    const payload = new FormData();
    payload.append("title", form.title);
    payload.append("description", form.description);
    payload.append("price", String(form.price || 0));
    payload.append("priceAfterDiscount", String(form.priceAfterDiscount || 0));
    payload.append("capacity", String(form.capacity || 0));
    payload.append("duration", form.duration || "");
    payload.append("unit", form.unit || "session");
    payload.append("category", form.category);
    if (form.subcategory) payload.append("subcategory", form.subcategory);
    if (form.brand) payload.append("brand", form.brand);
    payload.append("tags", JSON.stringify(Array.isArray(form.tags) ? form.tags : []));
    payload.append("benefits", JSON.stringify(parseJsonArrayField(form.benefits, JSON_FIELDS.benefits)));
    payload.append("howToUse", form.howToUse || "");
    payload.append(
      "aboutItems",
      JSON.stringify(parseJsonArrayField(form.aboutItems, JSON_FIELDS.aboutItems))
    );
    payload.append(
      "specifications",
      JSON.stringify(parseJsonArrayField(form.specifications, JSON_FIELDS.specifications))
    );
    payload.append("isActive", String(Boolean(form.isActive)));

    if (imgCover) payload.append("imgCover", imgCover);
    gallery.forEach((file) => payload.append("images", file));
    return payload;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (!editing && !imgCover) {
        setError("Cover image is required for new services.");
        return;
      }
      if (!form.category) {
        setError("Category is required.");
        return;
      }

      const payload = buildFormData();
      if (editing?._id) {
        await serviceService.update(editing._id, payload);
      } else {
        await serviceService.create(payload);
      }
      clearForm();
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await serviceService.remove(id);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  return (
    <section>
      <div className="page-head">
        <h1>Services</h1>
        <button onClick={loadData}>Refresh</button>
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Bookable offerings shown on the storefront under Services / dual catalog.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="grid-two">
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>{editing ? "Edit Service" : "Create Service"}</h3>

          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              required
            />
          </label>
          <label>
            Price
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              required
            />
          </label>
          <label>
            Price After Discount
            <input
              type="number"
              value={form.priceAfterDiscount}
              onChange={(e) => setForm((p) => ({ ...p, priceAfterDiscount: e.target.value }))}
            />
          </label>
          <label>
            Capacity (0 = unlimited slots)
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
            />
          </label>
          <label>
            Duration
            <input
              value={form.duration}
              onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
              placeholder="e.g. 60 min, 3–4 hours"
            />
          </label>
          <label>
            Unit
            <select value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}>
              {UNIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              required
            >
              <option value="">Select category</option>
              {categories.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Subcategory (optional)
            <select
              value={form.subcategory}
              onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
            >
              <option value="">None</option>
              {categories.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Brand (optional)
            <select
              value={form.brand}
              onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
            >
              <option value="">None</option>
              {brands.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p>Tags</p>
            <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {TAG_OPTIONS.map((tag) => (
                <label key={tag.value} className="checkbox-row" style={{ width: "auto" }}>
                  <input
                    type="checkbox"
                    checked={form.tags.includes(tag.value)}
                    onChange={() => toggleTag(tag.value)}
                  />
                  {tag.label}
                </label>
              ))}
            </div>
          </div>

          <label>
            Benefits (one per line)
            <textarea
              rows={2}
              value={form.benefits}
              onChange={(e) => setForm((p) => ({ ...p, benefits: e.target.value }))}
              onBlur={() => onJsonFieldBlur("benefits")}
            />
          </label>

          <label>
            How To Use / What&apos;s included
            <textarea
              rows={2}
              value={form.howToUse}
              onChange={(e) => setForm((p) => ({ ...p, howToUse: e.target.value }))}
            />
          </label>

          <label>
            About (one bullet per line)
            <textarea
              rows={3}
              value={form.aboutItems}
              onChange={(e) => setForm((p) => ({ ...p, aboutItems: e.target.value }))}
              onBlur={() => onJsonFieldBlur("aboutItems")}
            />
          </label>

          <label>
            Specifications (Group | Key | Value)
            <textarea
              rows={4}
              value={form.specifications}
              onChange={(e) => setForm((p) => ({ ...p, specifications: e.target.value }))}
              onBlur={() => onJsonFieldBlur("specifications")}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Is Active
          </label>

          <label>
            Cover Image {editing ? "(optional on update)" : "(required)"}
            <input type="file" accept="image/*" onChange={(e) => setImgCover(e.target.files?.[0] || null)} />
          </label>

          <label>
            Gallery Images
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="secondary" onClick={() => galleryInputRef.current?.click()}>
                + Add Images
              </button>
              <span className="muted">{gallery.length} new selected</span>
            </div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={onSelectGalleryFiles}
            />
          </label>

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
          <h3>Services List</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Capacity</th>
                  <th>Duration</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {item.imgCover ? (
                        <img src={item.imgCover} alt="" width={52} height={52} className="product-thumb" />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{item.title}</td>
                    <td>{item.priceAfterDiscount ?? item.price}</td>
                    <td>{item.capacity ?? 0}</td>
                    <td>{item.duration || "-"}</td>
                    <td>{String(item.isActive)}</td>
                    <td className="row">
                      <button className="secondary" onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      <button className="danger" onClick={() => onDelete(item._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!services.length && (
                  <tr>
                    <td colSpan={7}>No services found.</td>
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

export default ServicesPage;
