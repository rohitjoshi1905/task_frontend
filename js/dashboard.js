document.addEventListener('DOMContentLoaded', async () => {
    const welcomeMsg = document.getElementById('welcome-msg');
    const email = localStorage.getItem("userName");
    if (email) welcomeMsg.textContent = email;

    await loadSpreadsheet();
});

async function loadSpreadsheet() {
    const tbody = document.getElementById('grid-body');
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px;">Loading today\'s task...</td></tr>';
    
    // Only Fetch Today
    const todayRes = await fetchWithAuth('/api/tasks/today');
    
    if (todayRes.ok) {
        const todayDate = new Date().toISOString().split('T')[0];
        let todayTask = todayRes.data.task;
        
        if (!todayRes.data.exists) {
            todayTask = {
                date: todayDate,
                planner: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
                owner_name: localStorage.getItem("userName") || 'Me',
                status: 'Pending',
                assign_website: '',
                task_assign_no: '',
                other_tasks: '',
                task_updates: '',
                additional: '',
                note: '',
                total_pages_done: 0,
                is_today: true
            };
        } else {
            todayTask.is_today = true;
        }

        renderGrid([todayTask]); // Render only one row
        
    } else {
        tbody.innerHTML = '<tr><td colspan="11" style="color:red; text-align:center;">Failed to load data.</td></tr>';
    }
}

function renderGrid(tasks) {
    const tbody = document.getElementById('grid-body');
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        const tr = document.createElement('tr');
        const ownerName = localStorage.getItem("userName") || 'Me';

        if (task.is_today) {
            // Editable Row (Today)
            tr.innerHTML = `
                <td class="readonly">${task.planner || '-'}</td>
                <td class="readonly">${task.date}</td>
                <td class="readonly">${ownerName}</td>
                <td>
                    <select id="t-status">
                        <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </td>
                <td><textarea id="t-website" rows="1" oninput="autoResize(this)">${task.assign_website || ''}</textarea></td>
                <td><textarea id="t-task-no" rows="1" oninput="autoResize(this)">${task.task_assign_no || ''}</textarea></td>
                <td><textarea id="t-other" rows="1" oninput="autoResize(this)">${task.other_tasks || ''}</textarea></td>
                <td><textarea id="t-updates" rows="1" oninput="autoResize(this)">${task.task_updates || ''} \n ${task.note || ''}</textarea></td>
                <td><textarea id="t-additional" rows="1" oninput="autoResize(this)">${task.additional || ''}</textarea></td>
                <td><input type="number" id="t-pages" value="${task.total_pages_done || 0}"></td>
                <td style="text-align:center;">
                    <button onclick="saveToday()" class="btn btn-primary">Save</button>
                </td>
            `;
            tr.style.backgroundColor = "#fff"; 
            tr.style.border = "2px solid #1a73e8"; 
            
            // Auto-resize on initial load (slight delay ensuring DOM is ready)
            setTimeout(() => {
                const textareas = tr.querySelectorAll('textarea');
                textareas.forEach(ta => autoResize(ta));
            }, 0);
            
        } else {
            // Read-only Row (History)
            tr.innerHTML = `
                <td class="readonly">${task.planner || '-'}</td>
                <td class="readonly">${task.date}</td>
                <td class="readonly">${ownerName}</td>
                <td class="readonly">
                    <span class="${task.status === 'Completed' ? 'status-completed' : 'status-pending'}">
                        ${task.status}
                    </span>
                </td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.assign_website || ''}</div></td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.task_assign_no || ''}</div></td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.other_tasks || ''}</div></td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.task_updates || ''} ${task.note ? '\n' + task.note : ''}</div></td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.additional || ''}</div></td>
                <td class="readonly" style="text-align:center;">${task.total_pages_done || 0}</td>
                <td class="readonly"></td>
            `;
        }
        
        tbody.appendChild(tr);
    });
}

function autoResize(elem) {
    elem.style.height = 'auto'; // Reset height
    elem.style.height = (elem.scrollHeight) + 'px'; // Set to scroll height
}

async function saveToday() {
    const payload = {
        status: document.getElementById('t-status').value,
        assign_website: document.getElementById('t-website').value,
        task_assign_no: document.getElementById('t-task-no').value,
        total_pages_done: parseInt(document.getElementById('t-pages').value) || 0,
        other_tasks: document.getElementById('t-other').value,
        task_updates: document.getElementById('t-updates').value, // This now captures the wide text
        additional: document.getElementById('t-additional').value,
        note: "" // Merged into updates or unused for now based on UI column count
    };

    const response = await fetchWithAuth('/api/tasks/save', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        alert("Saved successfully!");
    } else {
        alert("Failed to save.");
    }
}
