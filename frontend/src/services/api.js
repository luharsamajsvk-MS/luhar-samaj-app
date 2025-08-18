import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Attach JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log("🔑 Sending token:", token); 
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------- AUTH ------------------- */
export const registerUser = (data) => api.post("/auth/register", data);

export const loginUser = async (data) => {
  const res = await api.post("/auth/login", data);
  console.log("🟢 Login response from backend:", res.data);

  if (res.data?.token) {
    localStorage.setItem("token", res.data.token);
    console.log("💾 Token saved to localStorage:", res.data.token);
  } else {
    console.warn("⚠️ No token found in login response:", res.data);
  }

  return res;
};

export const getProfile = () => api.get("/auth/me");

/* ------------------- MEMBERS ------------------- */
export const publicRegisterMember = (data) =>
  api.post("/members/register", data);

export const getMembers = () => api.get("/members");
export const getPendingMembers = () => api.get("/members/pending");
export const approveMember = (id) => api.post(`/members/${id}/approve`);
export const rejectMember = (id) => api.post(`/members/${id}/reject`);
export const updateMember = (id, data) => api.put(`/members/${id}`, data);
export const deleteMember = (id) => api.delete(`/members/${id}`);
export const downloadMemberPdf = (id) =>
  api.get(`/members/${id}/pdf`, { responseType: "blob" });
export const verifyCard = (cardId) => api.get(`/members/verify/${cardId}`);

/* ------------------- ZONES ------------------- */
export const getPublicZones = () => api.get("/zones/public");
export const getZones = () => api.get("/zones");
export const createZone = (data) => api.post("/zones", data);
export const updateZone = (id, data) => api.put(`/zones/${id}`, data);
export const deleteZone = (id) => api.delete(`/zones/${id}`);

/* ------------------- REQUESTS ------------------- */
export const getRequests = () => api.get("/requests");

// ✅ FIXED: Send uniqueNumber in body
export const approveRequest = (id, uniqueNumber) =>
  api.post(`/requests/${id}/approve`, { uniqueNumber });

export const declineRequest = (id) => api.post(`/requests/${id}/decline`);

export default api;
