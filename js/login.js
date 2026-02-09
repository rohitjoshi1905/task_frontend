document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase if not already
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('error-msg');
    
    // Login Handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.textContent = "Logging in...";
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                const token = await user.getIdToken();
                
                // Save token
                localStorage.setItem("firebaseToken", token);
                localStorage.setItem("userUid", user.uid);
                
                // Get User Role from Backend
                const response = await fetchWithAuth("/api/me");
                
                if (response && response.ok) {
                    const userData = response.data;
                    localStorage.setItem("userRole", userData.role);
                    localStorage.setItem("userName", userData.email);
                    
                    // Redirect based on role
                    if (userData.role === 'admin') {
                        window.location.href = "admin.html";
                    } else {
                        window.location.href = "dashboard.html";
                    }
                } else {
                    throw new Error("Failed to fetch user profile");
                }
                
            } catch (error) {
                console.error(error);
                errorMsg.textContent = "Login Failed: " + error.message;
            }
        });
    }

    // Password Toggle
    const togglePassword = document.querySelector('#togglePassword');
    // Re-select password input specifically for toggle to avoid confusion
    const passwordInput = document.querySelector('#password'); 
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function (e) {
            e.preventDefault(); 
            
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle Icon
            const svg = this.querySelector('svg path');
            if (type === 'text') {
                // Slash Icon (Hide)
                svg.setAttribute('d', 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z');
            } else {
                // Eye Icon (Show)
                svg.setAttribute('d', 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z');
            }
        });
    }
});
