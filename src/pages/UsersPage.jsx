import EntityCrudPage from "../components/EntityCrudPage";
import { userService } from "../api/services";

const fields = [
  { name: "name", label: "Name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "password", label: "Password", type: "password", required: true },
  {
    name: "role",
    label: "Role",
    type: "select",
    options: [
      { value: "admin", label: "Super Admin" },
      { value: "vendor", label: "Vendor" },
      { value: "delivery", label: "Delivery Partner" },
      { value: "user", label: "Customer" },
    ],
    defaultValue: "user",
    required: true,
  },
  { name: "isActive", label: "Is Active", type: "checkbox", defaultValue: true },
  { name: "verified", label: "Verified", type: "checkbox", defaultValue: false },
  { name: "isOrderAdmin", label: "Order Write Access (Vendor)", type: "checkbox", defaultValue: false },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "referralCode", label: "Referral" },
  {
    key: "sponsor",
    label: "Sponsor",
    render: (item) => item.sponsor?.name || "—",
  },
  { key: "role", label: "Role" },
  {
    key: "isOrderAdmin",
    label: "Order Write",
    render: (item) => (item.role === "vendor" ? (item.isOrderAdmin ? "Yes" : "No") : "—"),
  },
  { key: "blocked", label: "Blocked" },
];

const extraActions = [
  {
    label: "Toggle Block",
    onClick: async (item, reload) => {
      await userService.toggleBlock(item._id);
      await reload();
    },
  },
];

const UsersPage = () => (
  <EntityCrudPage
    title="Users"
    service={userService}
    fields={fields}
    columns={columns}
    extraActions={extraActions}
  />
);

export default UsersPage;
