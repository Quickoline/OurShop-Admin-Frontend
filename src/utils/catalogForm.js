export const toBoolean = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

export const parseLines = (value) =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const parseStringList = (value) => {
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

export const ensureArray = (parsed) => {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") return [parsed];
  return [];
};

export const parseSpecificationsText = (value, label) => {
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

export const parseJsonArrayField = (value, { label, mode }) => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  if (!raw.startsWith("{") && !raw.startsWith("[")) {
    if (mode === "stringArray") return parseStringList(raw);
    if (mode === "specifications") return parseSpecificationsText(raw, label);
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

export const formatStringArrayField = (arr) =>
  Array.isArray(arr) ? arr.filter(Boolean).join("\n") : "";

export const formatSpecificationsField = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((item) => [item?.group || "General", item?.key || "", item?.value || ""].join(" | "))
        .join("\n")
    : "";

export const normalizeListRows = (result, collectionKey) => {
  if (Array.isArray(result)) return result;
  if (collectionKey && Array.isArray(result?.[collectionKey])) return result[collectionKey];
  if (Array.isArray(result?.products)) return result.products;
  if (Array.isArray(result?.services)) return result.services;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};
