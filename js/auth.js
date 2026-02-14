// Auth utilities - No Firebase dependency

function checkAuth(requiredRole = null) {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");
    
    if (!token) {
        window.location.href = "index.html";
        return;
    }
    
    if (requiredRole && role !== requiredRole) {
        alert("Access denied");
        if (role === "admin") window.location.href = "admin.html";
        else window.location.href = "dashboard.html";
    }
}

function logout() {
    clearSession();
}

function clearSession() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userUid");
    localStorage.removeItem("userName");
    window.location.href = "index.html";
}
