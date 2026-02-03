import axios from "axios";

const apiBaseURL = import.meta.env.VITE_API_URL;

if (!apiBaseURL) {
  throw new Error("VITE_API_URL is not defined. Please set it in your frontend .env file.");
}

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
      // Biarkan ProtectedRoute / AuthProvider menangani state login.
      // Redirect manual hanya jika user berada di luar halaman login.
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
