import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// 1. Axios ka custom instance
const api = axios.create({
  baseURL: `${API_URL}/api`, // 🌟 Added /api here so you don't have to type it in every component!
});

// 2. REQUEST INTERCEPTOR: Token attach karna
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. RESPONSE INTERCEPTOR: The Auto-Refresh Magic
api.interceptors.response.use(
  (response) => {
    return response; 
  },
  async (error) => {
    const originalRequest = error.config;

    // Agar 401 Unauthorized aaya hai aur is request ko pehle retry nahi kiya gaya
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark kar diya ki retry chal raha hai

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error("No refresh token");

        // 🌟 Chupchaap backend se naya token maango
        const res = await axios.post(`${API_URL}/api/auth/refresh/`, {
            refresh: refreshToken,
        });

        // Naya token save karo
        localStorage.setItem('access_token', res.data.access);

        // Purani fail hui request mein naya token lagao aur wapas bhej do!
        originalRequest.headers['Authorization'] = `Bearer ${res.data.access}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Agar refresh token bhi expire ho gaya hai, TAB user ko bahar nikalo
        if (typeof window !== 'undefined') {
          console.log("Global Gatekeeper: Session expired. Redirecting to login...");
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_profile');
          window.location.href = '/login'; 
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;