import EntityCrudPage from "../components/EntityCrudPage";
import { categoryService } from "../api/services";

const fields = [
  { name: "name", label: "Name", required: true },
  { name: "showInNav", label: "Show In Nav", type: "checkbox", defaultValue: true },
  { name: "isActive", label: "Is Active", type: "checkbox", defaultValue: true },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
  { key: "isActive", label: "Active" },
  { key: "showInNav", label: "In Nav" },
];

const CategoriesPage = () => (
  <EntityCrudPage
    title="Categories"
    service={categoryService}
    fields={fields}
    columns={columns}
  />
);

export default CategoriesPage;
