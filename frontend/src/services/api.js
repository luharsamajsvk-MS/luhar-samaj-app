import axios from "axios";

const api = axios.create({
  // Use env var in prod (Vercel), fallback to local in dev
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

// Attach JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------- AUTH ------------------- */
export const registerUser = (data) => api.post("/auth/register", data);
export const loginUser = (data) => api.post("/auth/login", data);
export const getProfile = () => api.get("/auth/me");

/* ------------------- MEMBERS ------------------- */
export const publicRegisterMember = (data) => api.post("/members/register", data);
export const getMembers = () => api.get("/members");
export const getPendingMembers = () => api.get("/members/pending");
export const approveMember = (id) => api.post(`/members/${id}/approve`);
export const rejectMember = (id) => api.post(`/members/${id}/reject`);
export const updateMember = (id, data) => api.put(`/members/${id}`, data);
export const deleteMember = (id) => api.delete(`/members/${id}`);
export const downloadMemberPdf = (id) =>
  api.get(`/members/${id}/pdf`, { responseType: "blob" });
export const verifyCard = (cardId) => api.get(`/members/verify/${cardId}`);

export default api;
