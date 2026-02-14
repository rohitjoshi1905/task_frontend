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

// Update date label for From Date
function updateDateLabelFrom() {
    const dateInput = document.getElementById('filter-date-from');
    const dateLabel = document.getElementById('date-label-from');
    if (dateInput.value) {
        const date = new Date(dateInput.value);
        const formatted = date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
        dateLabel.textContent = formatted;
    } else {
        dateLabel.textContent = 'From Date';
    }
}

// Update date label for To Date
function updateDateLabelTo() {
    const dateInput = document.getElementById('filter-date-to');
    const dateLabel = document.getElementById('date-label-to');
    if (dateInput.value) {
        const date = new Date(dateInput.value);
        const formatted = date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
        dateLabel.textContent = formatted;
    } else {
        dateLabel.textContent = 'To Date';
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
                <label onclick="event.stopPropagation()">
                    <input type="checkbox" value="${u.uid}" /> ${u.name} (${u.email})
                </label>`;
        });
    }
}

async function loadAdminTasks() {
    // Get selected users
    const checkboxes = document.querySelectorAll('#checkboxes input[type="checkbox"]:checked');
    const selectedUsers = Array.from(checkboxes).map(cb => cb.value);
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    
    let url = `/api/admin/tasks?limit=500`;
    
    const tbody = document.getElementById('admin-body');
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Loading...</td></tr>';
    
    // Fetch broadly
    let api_url = url;
    if (selectedUsers.length === 1) {
        api_url += `&user=${selectedUsers[0]}`;
    }
    
    const response = await fetchWithAuth(api_url);
    if (response.ok) {
        let tasks = response.data;
        
        // Client-side filter for multiple users (if more than 1 selected)
        if (selectedUsers.length > 1) {
            tasks = tasks.filter(t => selectedUsers.includes(t.user_id));
        }
        
        // Client-side date range filtering
        if (dateFrom || dateTo) {
            tasks = tasks.filter(t => {
                const taskDate = t.date;
                if (dateFrom && dateTo) {
                    return taskDate >= dateFrom && taskDate <= dateTo;
                } else if (dateFrom) {
                    return taskDate >= dateFrom;
                } else if (dateTo) {
                    return taskDate <= dateTo;
                }
                return true;
            });
        }
        
        renderGrid(tasks);
    } else {
        tbody.innerHTML = '<tr><td colspan="11" style="color:red; text-align:center;">Failed to load tasks.</td></tr>';
    }
}

function clearFilters() {
    // Clear Dates
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('date-label-from').textContent = 'From Date';
    document.getElementById('date-label-to').textContent = 'To Date';
    
    // Clear Checkboxes
    const checkboxes = document.querySelectorAll('#checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Reload
    loadAdminTasks();
}

function renderGrid(tasks) {
    const tbody = document.getElementById('admin-body');
    
    // Calculate total pages
    const totalPages = tasks.reduce((sum, t) => sum + (parseInt(t.total_pages_done) || 0), 0);
    document.getElementById('total-pages-count').textContent = totalPages;
    
    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px;">No records found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = tasks.map(t => `
        <tr>
            <td>${t.planner || ''}</td>
            <td>${t.date}</td>
            <td>
                <strong>${t.owner_name || 'Unknown'}</strong><br>
                <span style="font-size:11px; color:#666;">${t.user_id ? t.user_id.substring(0, 10) + '...' : ''}</span>
            </td>
            <td>
                <span class="status-badge ${t.status === 'Completed' ? 'completed' : t.status === 'In Progress' ? 'in-progress' : 'not-started'}">
                    ${t.status || 'Not Started'}
                </span>
            </td>
            <td><div style="white-space: pre-wrap;">${t.assign_website || ''}</div></td>
            <td style="text-align:center;">${t.task_assign_no || ''}</td>
            <td><div style="white-space: pre-wrap;">${t.other_tasks || ''}</div></td>
            <td><div style="font-size:12px; white-space: pre-wrap;">${t.task_updates || ''}</div></td>
            <td><div style="white-space: pre-wrap;">${t.additional || ''}</div></td>
            <td style="text-align:center; font-weight:bold;">${t.total_pages_done || 0}</td>
            <td><div class="note-cell">${t.note || ''}</div></td>
            <td style="text-align:center;">
                <button onclick='openEditTask(${JSON.stringify(t).replace(/'/g, "&#39;")})' class="btn btn-primary btn-sm" style="font-weight:bold;">EDIT</button>
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
    document.getElementById('edit-task-assign').value = task.task_assign_no || '';
    document.getElementById('edit-other-tasks').value = task.other_tasks || '';
    document.getElementById('edit-updates').value = task.task_updates || '';
    document.getElementById('edit-additional').value = task.additional || '';
    document.getElementById('edit-note').value = task.note || '';
    
    document.getElementById('edit-task-modal').style.display = 'block';
}

async function saveTaskChanges() {
    const userId = document.getElementById('edit-user-id').value;
    const date = document.getElementById('edit-date').value;
    
    const payload = {
        status: document.getElementById('edit-status').value,
        total_pages_done: parseInt(document.getElementById('edit-pages').value) || 0,
        assign_website: document.getElementById('edit-website').value,
        task_assign_no: document.getElementById('edit-task-assign').value,
        other_tasks: document.getElementById('edit-other-tasks').value,
        task_updates: document.getElementById('edit-updates').value,
        additional: document.getElementById('edit-additional').value,
        note: document.getElementById('edit-note').value
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
    
    const token = localStorage.getItem('authToken');
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

// Download Excel - export current displayed data
function downloadExcel() {
    const table = document.querySelector('.modern-table');
    if (!table) {
        alert('No data to export!');
        return;
    }
    
    const rows = table.querySelectorAll('tr');
    if (rows.length <= 1) {
        alert('No data to export!');
        return;
    }
    
    let csv = [];
    
    // Get headers
    const headers = [];
    rows[0].querySelectorAll('th').forEach(th => {
        headers.push('"' + th.textContent.trim().replace(/"/g, '""') + '"');
    });
    csv.push(headers.join(','));
    
    // Get data rows
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cols = row.querySelectorAll('td');
        if (cols.length === 0) continue;
        
        const rowData = [];
        cols.forEach(td => {
            let text = td.textContent.trim().replace(/"/g, '""');
            rowData.push('"' + text + '"');
        });
        csv.push(rowData.join(','));
    }
    
    // Create and download file
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `admin_tasks_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Column Resizing Logic
function enableColumnResizing() {
    const table = document.getElementById('admin-table');
    if (!table) return;
    const headers = table.querySelectorAll('th');

    headers.forEach(header => {
        // Skip if already has resizer
        if (header.querySelector('.resizer')) return;

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

        let startX, startWidth;

        const mouseDownHandler = function(e) {
            e.preventDefault(); 
            startX = e.clientX;
            startWidth = header.offsetWidth;
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
            resizer.classList.add('resizing');
        };

        const mouseMoveHandler = function(e) {
            const dx = e.clientX - startX;
            const newWidth = startWidth + dx;
            if (newWidth > 50) {
                header.style.width = `${newWidth}px`;
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUsers(); 
    loadAdminTasks();
    // Enable resizing
    enableColumnResizing();
});
