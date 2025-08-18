// frontend/src/services/requestService.js
import axios from "axios";

// Create axios instance
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// ✅ Attach token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ---------------- PUBLIC API ---------------- */

// Submit a new registration request
export const submitRequest = async (payload) => {
  const res = await API.post("/requests", payload);
  return res.data;
};

/* ---------------- ADMIN APIS ---------------- */

// Get all pending requests
export const fetchPendingRequests = async () => {
  const res = await API.get("/requests");
  return res.data;
};

// ✅ Approve a request with uniqueNumber
export const approveRequest = async (id, uniqueNumber) => {
  const res = await API.post(`/requests/${id}/approve`, { uniqueNumber });
  return res.data;
};

// Decline (delete) a request
export const declineRequest = async (id) => {
  const res = await API.delete(`/requests/${id}`);
  return res.data;
};

export default {
  submitRequest,
  fetchPendingRequests,
  approveRequest,
  declineRequest,
};
