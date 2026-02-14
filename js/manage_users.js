// Load Users List
async function loadUsers() {
    const tbody = document.getElementById('user-list-body');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Loading users...</td></tr>';

    try {
        const [usersRes, tasksRes] = await Promise.all([
            fetchWithAuth('/api/admin/users'),
            fetchWithAuth(`/api/admin/tasks?date=${new Date().toISOString().split('T')[0]}`)
        ]);

        if (usersRes && usersRes.ok) {
            const users = usersRes.data;
            const tasksMap = {};
            if (tasksRes && tasksRes.ok) {
                tasksRes.data.forEach(t => {
                    tasksMap[t.user_id] = t;
                });
            }
            
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No users found.</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => {
                const task = tasksMap[u.uid] || {};
                
                // Fallback to User Persistence if Task is empty
                const website = task.assign_website || u.assign_website || '';
                const taskNo = task.task_assign_no || u.task_assign_no || '';
                const other = task.other_tasks || u.other_tasks || '';
                
                const hasData = website || taskNo || other;
                const btnText = hasData ? "Edit Task" : "Save";
                
                return `
                <tr id="row-${u.uid}">
                    <td style="padding:10px; font-weight:bold;">${u.name}</td>
                    <td style="padding:10px;">${u.email}</td>
                    <td style="padding:10px;">${u.password || 'N/A'}</td>
                    
                    <!-- Assignment Inputs -->
                    <td class="admin-column" style="padding:5px;">
                        <textarea id="web-${u.uid}" rows="2" style="width:100%; border:1px solid #ddd; border-radius:4px; padding:4px;">${website}</textarea>
                    </td>
                    <td class="admin-column" style="padding:5px;">
                        <textarea id="task-${u.uid}" rows="2" style="width:100%; border:1px solid #ddd; border-radius:4px; padding:4px;">${taskNo}</textarea>
                    </td>
                    <td class="admin-column" style="padding:5px;">
                        <textarea id="other-${u.uid}" rows="2" style="width:100%; border:1px solid #ddd; border-radius:4px; padding:4px;">${other}</textarea>
                    </td>

                    <td style="text-align:center; padding:10px;">
                        <div style="display:flex; flex-direction:column; gap:5px;">
                            <button id="btn-${u.uid}" onclick="saveRow('${u.uid}')" class="btn btn-primary btn-sm" style="font-size:12px; padding:4px 8px;">${btnText}</button>
                            <button onclick="deleteUser('${u.uid}')" class="btn btn-danger btn-sm" style="font-size:12px; padding:4px 8px;">Delete</button>
                        </div>
                    </td>
                </tr>
            `}).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="color:red; text-align:center;">Failed to load users.</td></tr>';
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7" style="color:red; text-align:center;">Error loading data.</td></tr>';
    }
}

async function saveRow(uid) {
    const today = new Date().toISOString().split('T')[0];
    const assignWebsite = document.getElementById(`web-${uid}`).value;
    const taskAssignNo = document.getElementById(`task-${uid}`).value;
    const otherTasks = document.getElementById(`other-${uid}`).value;
    
    const payload = {
        assign_website: assignWebsite,
        task_assign_no: taskAssignNo,
        other_tasks: otherTasks
    };
    
    const res = await fetchWithAuth(`/api/admin/task/${uid}/${today}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (res.ok) {
        alert("Saved successfully!");
        const btn = document.getElementById(`btn-${uid}`);
        if(btn) btn.innerText = "Edit Task";
    } else {
        alert("Failed to save: " + (res.data ? res.data.detail : "Unknown error"));
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

// Password Reset Logic
let currentResetUid = null;
function openResetPassword(uid, name) {
    currentResetUid = uid;
    const newPass = prompt(`Enter new password for ${name}:`);
    if (newPass) {
        updatePassword(uid, newPass);
    }
}

async function updatePassword(uid, newPassword) {
    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    console.log(`Attempting to update password for User ID: ${uid}`);
    try {
        const res = await fetchWithAuth(`/api/admin/user/${uid}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword })
        });
        
        console.log("Update Password Response:", res);

        if (res && res.ok) {
            alert("Password updated successfully!");
            loadUsers(); // Refresh list to show new password (since we show it in table)
        } else {
            console.error("Update failed:", res);
             alert("Failed to update password. Server response: " + (res.data ? JSON.stringify(res.data) : "Unknown error"));
        }
    } catch (error) {
        console.error("Error updating password:", error);
        alert("An error occurred while updating the password. Check console for details.");
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

// Column Resizing Logic
function enableColumnResizing() {
    const table = document.getElementById('users-table');
    const headers = table.querySelectorAll('th');

    headers.forEach(header => {
        // specific style for headers to allow resize
        // header.style.position = 'relative'; // Removed to preserve sticky header 
        
        const resizer = document.createElement('div');
        resizer.classList.add('resizer');
        resizer.style.height = '100%';
        resizer.style.width = '5px';
        resizer.style.position = 'absolute';
        resizer.style.top = '0';
        resizer.style.right = '0';
        resizer.style.cursor = 'col-resize';
        resizer.style.userSelect = 'none';
        resizer.style.touchAction = 'none';
        
        header.appendChild(resizer);

        let startX, startWidth, nextStartWidth, nextHeader;

        const mouseDownHandler = function(e) {
            e.preventDefault(); // Prevent text selection
            startX = e.clientX;
            
            // Get current header width
            startWidth = header.offsetWidth;
            
            // Get next header
            nextHeader = header.nextElementSibling;
            if (nextHeader) {
                nextStartWidth = nextHeader.offsetWidth;
            }

            // Freeze all columns to current pixel width to prevent fighting
            table.querySelectorAll('th').forEach(th => {
               th.style.width = `${th.offsetWidth}px`;
            });

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
            resizer.classList.add('resizing');
        };

        const mouseMoveHandler = function(e) {
            if (!nextHeader) return; // Cannot resize if no next column
            
            const dx = e.clientX - startX;
            const newWidth = startWidth + dx;
            const newNextWidth = nextStartWidth - dx;

            // Minimum width check (e.g., 50px)
            if (newWidth > 50 && newNextWidth > 50) {
                header.style.width = `${newWidth}px`;
                nextHeader.style.width = `${newNextWidth}px`;
            }
        };

        const mouseUpHandler = function() {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            resizer.classList.remove('resizing');
        };

        resizer.addEventListener('mousedown', mouseDownHandler);
    });
}

// Call resizing after loading users (or data)
// Since loadUsers is async and rebuilds the body, resizing logic primarily attaches to HEADERS which are static.
// But we should call it once on load.
document.addEventListener('DOMContentLoaded', () => {
    // Only call if headers exist
    if(document.querySelector('#users-table th')) {
        enableColumnResizing();
    }
});
