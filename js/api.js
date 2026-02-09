// API_BASE_URL is loaded from config.js

async function fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem("firebaseToken");
    
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };
    
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        if (response.status === 401) {
            alert("Session expired. Please login again.");
            logout();
            return null;
        }
        
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error("API Error:", error);
        return { ok: false, error: error.message };
    }
}
