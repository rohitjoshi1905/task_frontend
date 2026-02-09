// Depends on firebaseConfig from config.js (loaded in HTML)

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
}

function checkAuth(requiredRole = null) {
    const token = localStorage.getItem("firebaseToken");
    const role = localStorage.getItem("userRole");
    
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    
    if (requiredRole && role !== requiredRole) {
        alert("Access denied");
        if (role === "admin") window.location.href = "admin.html";
        else window.location.href = "dashboard.html";
    }
}

function logout() {
    if (typeof firebase !== 'undefined') {
        const auth = firebase.auth();
        auth.signOut().then(() => {
            clearSession();
        });
    } else {
        clearSession();
    }
}

function clearSession() {
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userUid");
    window.location.href = "login.html";
}
