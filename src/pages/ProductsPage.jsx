import { useEffect, useRef, useState } from "react";
import { brandService, categoryService, productService } from "../api/services";

const defaultForm = {
  title: "",
  description: "",
  price: "",
  priceAfterDiscount: "",
  profitAmount: "",
  quantity: "",
  unit: "pcs",
  category: "",
  subcategory: "",
  brand: "",
  tags: [],
  benefits: "",
  ingredients: "",
  howToUse: "",
  soldBy: "",
  useBy: "",
  aboutItems: "",
  specifications: "",
  sizeOptions: "",
  isActive: true,
};

const UNIT_OPTIONS = ["kg", "g", "l", "ml", "pcs", "box", "bag", "bottle", "pack", "set", "other"];
const TAG_OPTIONS = [
  { value: "bestseller", label: "Best Seller" },
  { value: "newly_launched", label: "Newly Launched" },
  { value: "mega_offer", label: "Mega Offer" },
  { value: "combo", label: "Combo" },
  { value: "gift", label: "Gift" },
];

const ensureArray = (parsed) => {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") return [parsed];
  return [];
};

const toBoolean = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const parseLines = (value) =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const parseStringList = (value) => {
  const lines = parseLines(value);
  if (lines.length > 1) return lines;
  if (lines.length === 1 && lines[0].includes(",")) {
    return lines[0]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return lines;
};

const parseSpecificationsText = (value, label) => {
  const lines = parseLines(value);
  return lines.map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 3) {
      throw new Error(`${label} line must be: Group | Key | Value`);
    }
    const [group, key, ...rest] = parts;
    return {
      group: group || "General",
      key: key || "",
      value: rest.join(" | ").trim(),
    };
  });
};

const parseSizeOptionsText = (value, label) => {
  const lines = parseLines(value);
  return lines.map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 2) {
      throw new Error(
        `${label} line must be: Label | Price | MRP | PerUnitPrice | SavingsPercent | IsDefault`
      );
    }
    const [labelText, priceText, mrpText, perUnitText, savingsText, isDefaultText] = parts;
    return {
      label: labelText || "",
      price: Number(priceText || 0),
      mrp: Number(mrpText || 0),
      perUnitPrice: Number(perUnitText || 0),
      savingsPercent: Number(savingsText || 0),
      isDefault: toBoolean(isDefaultText),
    };
  });
};

const parseJsonArrayField = (value, { label, mode }) => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  if (!raw.startsWith("{") && !raw.startsWith("[")) {
    if (mode === "stringArray") return parseStringList(raw);
    if (mode === "specifications") return parseSpecificationsText(raw, label);
    if (mode === "sizeOptions") return parseSizeOptionsText(raw, label);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }

  const asArray = ensureArray(parsed);
  if (!asArray.length && raw) {
    throw new Error(`${label} must be a JSON array/object.`);
  }

  if (mode === "stringArray") {
    return asArray.map((item) => String(item).trim()).filter(Boolean);
  }

  return asArray
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({ ...item }));
};

const normalizeRows = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.products)) return result.products;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const formatStringArrayField = (arr) => (Array.isArray(arr) ? arr.filter(Boolean).join("\n") : "");

const formatSpecificationsField = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((item) => [item?.group || "General", item?.key || "", item?.value || ""].join(" | "))
        .join("\n")
    : "";

const formatSizeOptionsField = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((item) =>
          [
            item?.label || "",
            item?.price ?? "",
            item?.mrp ?? "",
            item?.perUnitPrice ?? "",
            item?.savingsPercent ?? "",
            Boolean(item?.isDefault),
          ].join(" | ")
        )
        .join("\n")
    : "";

const JSON_FIELDS = {
  benefits: { label: "Benefits", mode: "stringArray", formatter: formatStringArrayField },
  ingredients: { label: "Ingredients", mode: "stringArray", formatter: formatStringArrayField },
  aboutItems: { label: "About This Item", mode: "stringArray", formatter: formatStringArrayField },
  specifications: { label: "Specifications", mode: "specifications", formatter: formatSpecificationsField },
  sizeOptions: { label: "Size/Pack Options", mode: "sizeOptions", formatter: formatSizeOptionsField },
};

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [imgCover, setImgCover] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [existingGallery, setExistingGallery] = useState([]);
  const [showGalleryManager, setShowGalleryManager] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const galleryInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [productRows, categoryRows, brandRows] = await Promise.all([
        productService.list(),
        categoryService.list(),
        brandService.list(),
      ]);
      setProducts(normalizeRows(productRows));
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

  const removeGalleryFile = (index) => {
    setGallery((prev) => prev.filter((_, idx) => idx !== index));
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      price: item.price ?? "",
      priceAfterDiscount: item.priceAfterDiscount ?? "",
      profitAmount: item.profitAmount ?? "",
      quantity: item.quantity ?? "",
      unit: item.unit || "pcs",
      category: item.category?._id || item.category || "",
      subcategory: item.subcategory?._id || item.subcategory || "",
      brand: item.brand?._id || item.brand || "",
      tags: Array.isArray(item.tags) ? item.tags : [],
      benefits: formatStringArrayField(item.benefits || []),
      ingredients: formatStringArrayField(item.ingredients || []),
      howToUse: item.howToUse || "",
      soldBy: item.soldBy || "",
      useBy: item.useBy ? String(item.useBy).slice(0, 10) : "",
      aboutItems: formatStringArrayField(item.aboutItems || []),
      specifications: formatSpecificationsField(item.specifications || []),
      sizeOptions: formatSizeOptionsField(item.sizeOptions || []),
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
        tags: exists
          ? prev.tags.filter((value) => value !== tagValue)
          : [...prev.tags, tagValue],
      };
    });
  };

  const normalizeJsonFieldInput = (fieldName, value) => {
    const fieldConfig = JSON_FIELDS[fieldName];
    if (!fieldConfig) return String(value || "");
    const parsed = parseJsonArrayField(value, fieldConfig);
    return fieldConfig.formatter(parsed);
  };

  const onJsonFieldBlur = (fieldName) => {
    try {
      setForm((prev) => ({
        ...prev,
        [fieldName]: normalizeJsonFieldInput(fieldName, prev[fieldName]),
      }));
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
    payload.append("profitAmount", String(form.profitAmount || 0));
    payload.append("quantity", String(form.quantity || 0));
    payload.append("unit", form.unit || "pcs");
    payload.append("category", form.category);
    payload.append("subcategory", form.subcategory);
    payload.append("brand", form.brand);
    payload.append("tags", JSON.stringify(Array.isArray(form.tags) ? form.tags : []));
    payload.append("benefits", JSON.stringify(parseJsonArrayField(form.benefits, JSON_FIELDS.benefits)));
    payload.append("ingredients", JSON.stringify(parseJsonArrayField(form.ingredients, JSON_FIELDS.ingredients)));
    payload.append("howToUse", form.howToUse || "");
    payload.append("soldBy", form.soldBy || "");
    payload.append("useBy", form.useBy || "");
    payload.append("aboutItems", JSON.stringify(parseJsonArrayField(form.aboutItems, JSON_FIELDS.aboutItems)));
    payload.append("specifications", JSON.stringify(parseJsonArrayField(form.specifications, JSON_FIELDS.specifications)));
    payload.append("sizeOptions", JSON.stringify(parseJsonArrayField(form.sizeOptions, JSON_FIELDS.sizeOptions)));
    payload.append("isActive", String(Boolean(form.isActive)));

    if (imgCover) {
      payload.append("imgCover", imgCover);
    }

    gallery.forEach((file) => payload.append("images", file));
    return payload;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (!editing && !imgCover) {
        setError("Cover image is required for new products.");
        return;
      }

      const payload = buildFormData();
      if (editing?._id) {
        await productService.update(editing._id, payload);
      } else {
        await productService.create(payload);
      }
      clearForm();
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await productService.remove(id);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const openViewer = (images, index = 0) => {
    if (!images.length) return;
    setViewerImages(images);
    setViewerIndex(index);
  };

  const closeViewer = () => {
    setViewerImages([]);
    setViewerIndex(0);
  };

  const showNext = () => {
    setViewerIndex((prev) => (prev + 1) % viewerImages.length);
  };

  const showPrev = () => {
    setViewerIndex((prev) => (prev - 1 + viewerImages.length) % viewerImages.length);
  };

  return (
    <section>
      <div className="page-head">
        <h1>Products</h1>
        <button onClick={loadData}>Refresh</button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="grid-two">
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>{editing ? "Edit Product" : "Create Product"}</h3>

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
            Profit Amount (per unit, MLM)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.profitAmount}
              onChange={(e) => setForm((p) => ({ ...p, profitAmount: e.target.value }))}
            />
            <span className="muted" style={{ fontSize: 12 }}>
              Paid on delivery (products & services) · 50% admin / 50% upline
            </span>
          </label>
          <label>
            Quantity
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              required
            />
          </label>
          <label>
            Unit
            <select
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            >
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
            Subcategory
            <select
              value={form.subcategory}
              onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
              required
            >
              <option value="">Select subcategory</option>
              {categories.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Brand
            <select
              value={form.brand}
              onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
              required
            >
              <option value="">Select brand</option>
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
              placeholder={"Fast absorption\nSupports recovery"}
            />
          </label>

          <label>
            Ingredients (one per line)
            <textarea
              rows={2}
              value={form.ingredients}
              onChange={(e) => setForm((p) => ({ ...p, ingredients: e.target.value }))}
              onBlur={() => onJsonFieldBlur("ingredients")}
              placeholder={"Salmon Fish Oil\nEPA\nDHA"}
            />
          </label>

          <label>
            How To Use
            <textarea
              rows={2}
              value={form.howToUse}
              onChange={(e) => setForm((p) => ({ ...p, howToUse: e.target.value }))}
            />
          </label>

          <label>
            Sold By
            <input
              value={form.soldBy}
              onChange={(e) => setForm((p) => ({ ...p, soldBy: e.target.value }))}
              placeholder="Seller name"
            />
          </label>

          <label>
            Use By
            <input
              type="date"
              value={form.useBy}
              onChange={(e) => setForm((p) => ({ ...p, useBy: e.target.value }))}
            />
          </label>

          <label>
            About This Item (one bullet per line)
            <textarea
              rows={4}
              value={form.aboutItems}
              onChange={(e) => setForm((p) => ({ ...p, aboutItems: e.target.value }))}
              onBlur={() => onJsonFieldBlur("aboutItems")}
              placeholder={"Omega-3 for men and women\nMercury-free formula\nSupports heart health"}
            />
          </label>

          <label>
            Specifications (Group | Key | Value)
            <textarea
              rows={6}
              value={form.specifications}
              onChange={(e) => setForm((p) => ({ ...p, specifications: e.target.value }))}
              onBlur={() => onJsonFieldBlur("specifications")}
              placeholder={"Measurements | Unit Count | 150 Count\nFeatures & Specs | Brand | Carbamide Forte"}
            />
          </label>

          <label>
            Size/Pack Options (Label | Price | MRP | PerUnitPrice | SavingsPercent | IsDefault)
            <textarea
              rows={6}
              value={form.sizeOptions}
              onChange={(e) => setForm((p) => ({ ...p, sizeOptions: e.target.value }))}
              onBlur={() => onJsonFieldBlur("sizeOptions")}
              placeholder={
                "150 count (Pack of 1) | 749 | 995 | 4.99 | 25 | true\n60 count (Pack of 1) | 339 | 540 | 5.65 | 37 | false"
              }
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
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImgCover(e.target.files?.[0] || null)}
            />
          </label>

          <label>
            Gallery Images
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setShowGalleryManager(true)}
              >
                Manage Gallery
              </button>
              <span className="muted">
                {gallery.length} new image{gallery.length !== 1 ? "s" : ""} selected
              </span>
            </div>
          </label>

          {(existingGallery.length > 0 || gallery.length > 0) && (
            <div>
              <p>Gallery Preview</p>
              <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {existingGallery.map((img, idx) => (
                  <img
                    key={`existing-${idx}`}
                    src={img}
                    alt={`Existing ${idx + 1}`}
                    width={56}
                    height={56}
                    className="product-thumb"
                    onClick={() => openViewer(existingGallery, idx)}
                  />
                ))}
                {gallery.map((file, idx) => (
                  <img
                    key={`new-${idx}`}
                    src={URL.createObjectURL(file)}
                    alt={`New ${idx + 1}`}
                    width={56}
                    height={56}
                    className="product-thumb"
                  />
                ))}
              </div>
            </div>
          )}

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
          <h3>Products List</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {item.imgCover ? (
                        <div className="media-cell">
                          <img
                            src={item.imgCover}
                            alt={item.title}
                            width="52"
                            height="52"
                            className="product-thumb"
                            onClick={() =>
                              openViewer(
                                [item.imgCover, ...(Array.isArray(item.images) ? item.images : [])],
                                0
                              )
                            }
                          />
                          {Array.isArray(item.images) && item.images.length > 0 && (
                            <span className="media-badge">+{item.images.length}</span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{item.title}</td>
                    <td>{item.price}</td>
                    <td>{item.quantity}</td>
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
                {!products.length && (
                  <tr>
                    <td colSpan={6}>No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewerImages.length > 0 && (
        <div className="media-viewer-backdrop" onClick={closeViewer}>
          <div className="media-viewer" onClick={(e) => e.stopPropagation()}>
            <button className="secondary media-close" onClick={closeViewer}>
              Close
            </button>
            {viewerImages.length > 1 && (
              <button className="secondary media-nav media-prev" onClick={showPrev}>
                Prev
              </button>
            )}
            <img
              src={viewerImages[viewerIndex]}
              alt={`Product media ${viewerIndex + 1}`}
              className="media-full-image"
            />
            {viewerImages.length > 1 && (
              <button className="secondary media-nav media-next" onClick={showNext}>
                Next
              </button>
            )}
            <p className="media-counter">
              {viewerIndex + 1} / {viewerImages.length}
            </p>
          </div>
        </div>
      )}

      {showGalleryManager && (
        <div className="media-viewer-backdrop" onClick={() => setShowGalleryManager(false)}>
          <div className="media-viewer" onClick={(e) => e.stopPropagation()}>
            <button
              className="secondary media-close"
              onClick={() => setShowGalleryManager(false)}
            >
              Close
            </button>

            <h3 style={{ marginBottom: 8 }}>Gallery Manager</h3>
            <p className="muted" style={{ marginBottom: 12 }}>
              Add multiple images with + button. New upload replaces gallery on update.
            </p>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={onSelectGalleryFiles}
            />

            <div className="row" style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
              >
                + Add Images
              </button>
              {!!gallery.length && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setGallery([])}
                >
                  Clear New
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
              {existingGallery.map((img, idx) => (
                <img
                  key={`existing-popup-${idx}`}
                  src={img}
                  alt={`Existing ${idx + 1}`}
                  className="product-thumb"
                  style={{ width: "100%", height: 90, objectFit: "cover" }}
                />
              ))}

              {gallery.map((file, idx) => (
                <div key={`new-popup-${idx}`} style={{ position: "relative" }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`New ${idx + 1}`}
                    className="product-thumb"
                    style={{ width: "100%", height: 90, objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryFile(idx)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      border: "none",
                      background: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      borderRadius: 6,
                      padding: "2px 6px",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProductsPage;
