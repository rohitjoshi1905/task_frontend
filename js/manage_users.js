// Load Users List
async function loadUsers() {
    const tbody = document.getElementById('user-list-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading users...</td></tr>';

    const res = await fetchWithAuth('/api/admin/users');
    if (res.ok) {
        const users = res.data;
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td style="padding:15px; font-weight:bold;">${u.name}</td>
                <td style="padding:15px;">${u.email}</td>
                <td style="padding:15px; font-family:monospace;">${u.password || 'N/A'}</td>
                <td style="padding:15px; font-size:12px; color:#666;">${u.uid}</td>
                <td style="text-align:center;">
                    <button onclick="deleteUser('${u.uid}')" class="btn btn-danger btn-sm" style="padding:8px 15px; font-size:14px;">DELETE</button>
                </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Failed to load users.</td></tr>';
    }
}

async function deleteUser(uid) {
    if (!confirm("Are you sure you want to PERMANENTLY delete this user? This cannot be undone.")) return;
    
    const res = await fetchWithAuth(`/api/admin/user/${uid}`, { method: 'DELETE' });
    if (res.ok) {
        alert("User deleted.");
        loadUsers(); // Refresh list
    } else {
        alert("Failed to delete user: " + (res.data ? res.data.detail : "Unknown error"));
    }
}

// Create User Logic
function openCreateUser() {
    document.getElementById('create-user-modal').style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function createUser() {
    const name = document.getElementById('new-name').value;
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value;
    
    if (!name || !email || !password) {
        alert("Please fill all fields");
        return;
    }
    
    const res = await fetchWithAuth('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    
    if (res.ok) {
        alert("User created successfully!");
        closeModal('create-user-modal');
        document.getElementById('new-name').value = '';
        document.getElementById('new-email').value = '';
        document.getElementById('new-password').value = '';
        loadUsers(); // Refresh list
    } else {
         alert("Error: " + (res.data ? res.data.detail : "Unknown error"));
    }
}


function togglePasswordVisibility() {
    const passwordInput = document.getElementById('new-password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
}

document.addEventListener('DOMContentLoaded', loadUsers);
