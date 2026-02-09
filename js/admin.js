let expanded = false;

function showCheckboxes() {
    const checkboxes = document.getElementById("checkboxes");
    if (!expanded) {
        checkboxes.style.display = "block";
        expanded = true;
    } else {
        checkboxes.style.display = "none";
        expanded = false;
    }
}

// Close checkboxes when clicking outside
document.addEventListener('click', function(e) {
    const multiselect = document.querySelector('.multiselect');
    if (expanded && multiselect && !multiselect.contains(e.target)) {
        document.getElementById("checkboxes").style.display = "none";
        expanded = false;
    }
});

// Load Users for Dropdown and Modal
async function loadUsers() {
    const res = await fetchWithAuth('/api/admin/users');
    if (res.ok) {
        const users = res.data;
        window.allUsers = users; 
        
        // Populate Checkboxes
        const container = document.getElementById('checkboxes');
        container.innerHTML = '';
        users.forEach(u => {
            container.innerHTML += `
                <label>
                    <input type="checkbox" value="${u.uid}" /> ${u.name} (${u.email})
                </label>`;
        });
    }
}

async function loadAdminTasks() {
    // Get selected users
    const checkboxes = document.querySelectorAll('#checkboxes input[type="checkbox"]:checked');
    const selectedUsers = Array.from(checkboxes).map(cb => cb.value);
    const date = document.getElementById('filter-date').value;
    
    let url = `/api/admin/tasks?limit=100`;
    
    // If specific users selected, we might need multiple calls or filter client side.
    // The backend API currently supports single user filter `?user=uid`.
    // Let's filter client-side if multiple users are selected, or just fetch all and filter.
    // For simplicity and performance on small dataset: fetch 100 and filter.
    // OR: if 1 user selected, use param.
    
    // Better strategy for now: Fetch all (limit 100) and filter client side if users selected.
    
    const tbody = document.getElementById('admin-body');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>';
    
    // Fetch broadly
    let api_url = url;
    if (selectedUsers.length === 1) {
        api_url += `&user=${selectedUsers[0]}`;
    }
    if (date) {
        api_url += `&date=${date}`;
    }
    
    const response = await fetchWithAuth(api_url);
    if (response.ok) {
        let tasks = response.data;
        
        // Client-side filter for multiple users (if more than 1 selected)
        if (selectedUsers.length > 1) {
            tasks = tasks.filter(t => selectedUsers.includes(t.user_id));
        }
        
        renderGrid(tasks);
    } else {
        tbody.innerHTML = '<tr><td colspan="7" style="color:red; text-align:center;">Failed to load tasks.</td></tr>';
    }
}

function clearFilters() {
    // Clear Date
    document.getElementById('filter-date').value = '';
    
    // Clear Checkboxes
    const checkboxes = document.querySelectorAll('#checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Reload
    loadAdminTasks();
}

function renderGrid(tasks) {
    const tbody = document.getElementById('admin-body');
    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No records found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = tasks.map(t => `
        <tr>
            <td>${t.planner || ''}</td>
            <td>${t.date}</td>
            <td>
                <strong>${t.owner_name || 'Unknown'}</strong><br>
                <span style="font-size:11px; color:#666;">${t.user_id}</span>
            </td>
            <td>
                <span class="${t.status === 'Completed' ? 'status-completed' : 'status-pending'}">
                    ${t.status}
                </span>
            </td>
            <td><div style="white-space: pre-wrap;">${t.assign_website || ''}</div></td>
            <td style="text-align:center;">${t.task_assign_no || ''}</td>
            <td><div style="white-space: pre-wrap;">${t.other_tasks || ''}</div></td>
            <td><div style="font-size:12px; white-space: pre-wrap;">${t.task_updates || ''}</div></td>
            <td><div style="white-space: pre-wrap;">${t.additional || ''}</div></td>
            <td><div style="white-space: pre-wrap;">${t.note || ''}</div></td>
            <td style="text-align:center; font-weight:bold;">${t.total_pages_done || 0}</td>
            <td style="text-align:center;">
                <button onclick='openEditTask(${JSON.stringify(t).replace(/'/g, "&#39;")})' class="btn btn-secondary btn-sm" style="font-weight:bold;">EDIT</button>
                <button onclick="deleteTask('${t.user_id}', '${t.date}')" class="btn btn-danger btn-sm" style="font-weight:bold;">DEL</button>
            </td>
        </tr>
    `).join('');
}



// --- Edit Task ---

function openEditTask(task) {

    document.getElementById('edit-user-id').value = task.user_id;
    document.getElementById('edit-date').value = task.date;
    document.getElementById('edit-status').value = task.status || 'Pending';
    document.getElementById('edit-pages').value = task.total_pages_done || 0;
    document.getElementById('edit-website').value = task.assign_website || '';
    document.getElementById('edit-updates').value = task.task_updates || '';
    
    document.getElementById('edit-task-modal').style.display = 'block';
}

async function saveTaskChanges() {
    const userId = document.getElementById('edit-user-id').value;
    const date = document.getElementById('edit-date').value;
    
    const payload = {
        status: document.getElementById('edit-status').value,
        total_pages_done: parseInt(document.getElementById('edit-pages').value) || 0,
        assign_website: document.getElementById('edit-website').value,
        task_updates: document.getElementById('edit-updates').value
    };
    
    const res = await fetchWithAuth(`/api/admin/task/${userId}/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (res.ok) {
        closeModal('edit-task-modal');
        loadAdminTasks(); // Refresh Grid
    } else {
        alert("Failed to update task: " + (res.data ? res.data.detail : "Unknown error"));
    }
}

// --- Create User / Modals ---

function openCreateUser() {
    document.getElementById('create-user-modal').style.display = 'block';
}

function closeModal(id) {
    if (!id) id = 'create-user-modal';
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
        loadUsers(); // Refresh dropdown
    } else {
         alert("Error: " + (res.data ? res.data.detail : "Unknown error"));
    }
}

async function deleteTask(userId, date) {
    if (!confirm(`Are you sure you want to delete the task for ${date}?`)) return;
    
    const res = await fetchWithAuth(`/api/admin/task/${userId}/${date}`, { method: 'DELETE' });
    
    if (res.ok) {
        loadAdminTasks(); // Refresh
    } else {
        alert("Failed to delete: " + (res.data ? res.data.detail : "Unknown error"));
    }
}


// --- Export ---

async function downloadExcel() {
    const date = document.getElementById('filter-date').value;
    // Date is optional now
    
    const token = localStorage.getItem('firebaseToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        let url = `${API_BASE_URL}/api/admin/export/tasks`;
        let filename = 'tasks_all.xlsx';
        
        if (date) {
            url += `?date=${date}`;
            filename = `tasks_${date}.xlsx`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            
            // Backend sends content-disposition, but we can also set it here if we want specific name behavior
            // We'll trust the backend or default to variable
            // To use backend filename we'd need to inspect headers, but simple approach:
            a.download = filename; 
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        } else {
            const err = await response.json();
            alert("Failed to download: " + (err.detail || "Unknown error"));
        }
    } catch (error) {
        console.error("Download error:", error);
        alert("An error occurred while downloading.");
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUsers(); // Load users first for filter
    loadAdminTasks();
});
