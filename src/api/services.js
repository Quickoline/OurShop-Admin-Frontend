import { api } from "./http";

const unwrap = (response) => response?.data?.data ?? response?.data;

export const userService = {
  list: () => api.get("/api/user").then(unwrap),
  create: (payload) => api.post("/api/user", payload).then(unwrap),
  update: (id, payload) => api.put(`/api/user/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/api/user/${id}`).then(unwrap),
  toggleBlock: (id) => api.patch(`/api/user/${id}/block`).then(unwrap),
};

export const productService = {
  list: () => api.get("/api/product").then(unwrap),
  create: (payload) => api.post("/api/product", payload).then(unwrap),
  update: (id, payload) => api.put(`/api/product/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/api/product/${id}`).then(unwrap),
};

export const serviceService = {
  list: () => api.get("/api/service").then(unwrap),
  create: (payload) => api.post("/api/service", payload).then(unwrap),
  update: (id, payload) => api.put(`/api/service/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/api/service/${id}`).then(unwrap),
};

export const categoryService = {
  list: () => api.get("/api/category").then(unwrap),
  create: (payload) => api.post("/api/category", payload).then(unwrap),
  update: (id, payload) => api.put(`/api/category/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/api/category/${id}`).then(unwrap),
};

export const brandService = {
  list: () => api.get("/api/brand").then(unwrap),
  create: (payload) => api.post("/api/brand", payload).then(unwrap),
  update: (id, payload) => api.put(`/api/brand/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/api/brand/${id}`).then(unwrap),
};

export const couponService = {
  list: () => api.get("/api/coupon").then(unwrap),
  create: (payload) => api.post("/api/coupon", payload).then(unwrap),
  update: (id, payload) => api.put(`/api/coupon/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/api/coupon/${id}`).then(unwrap),
};

export const reviewService = {
  list: () => api.get("/api/review").then(unwrap),
  create: (payload) => api.post("/api/review", payload).then(unwrap),
  update: (id, payload) => api.put(`/api/review/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/api/review/${id}`).then(unwrap),
};

export const orderService = {
  list: () => api.get("/api/order").then(unwrap),
  update: (id, payload) => api.put(`/api/order/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/api/order/${id}`).then(unwrap),
  cancel: (id) => api.patch(`/api/order/${id}/cancel`).then(unwrap),
  assignDelivery: (id, payload) =>
    api.patch(`/api/order/${id}/assign-delivery`, payload).then(unwrap),
  updateExpectedDelivery: (id, payload) =>
    api.patch(`/api/order/${id}/expected-delivery`, payload).then(unwrap),
};
