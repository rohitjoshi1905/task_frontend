

function updateHistoryDateLabel(type) {
    if (type === 'from') {
        const val = document.getElementById('history-date-from').value;
        document.getElementById('date-label-from').textContent = val || 'From Date';
    } else {
        const val = document.getElementById('history-date-to').value;
        document.getElementById('date-label-to').textContent = val || 'To Date';
    }
}

async function loadUserHistory() {
    const tbody = document.getElementById('history-body');
    const fromDate = document.getElementById('history-date-from').value;
    const toDate = document.getElementById('history-date-to').value;
    
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px;">Loading history...</td></tr>';
    
    let url = '/api/tasks/history?limit=100';
    
    const response = await fetchWithAuth(url);
    
    if (response.ok) {
        let tasks = response.data;
        
        // Client-side date range filtering
        if (fromDate) {
            tasks = tasks.filter(t => t.date >= fromDate);
        }
        if (toDate) {
            tasks = tasks.filter(t => t.date <= toDate);
        }
        
        // Sort newest first
        tasks.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px;">No history found.</td></tr>';
            return;
        }

        tbody.innerHTML = tasks.map(task => `
            <tr>
                <td class="readonly">${task.planner || '-'}</td>
                <td class="readonly">${task.date}</td>
                <td class="readonly">${localStorage.getItem("userName") || 'Me'}</td>
                <td class="readonly">
                     <span class="${task.status === 'Completed' ? 'status-completed' : 'status-pending'}">
                        ${task.status}
                    </span>
                </td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.assign_website || ''}</div></td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.task_assign_no || ''}</div></td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.other_tasks || ''}</div></td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.task_updates || ''}</div></td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.additional || ''}</div></td>
                <td class="readonly" style="text-align:center;">${task.total_pages_done || 0}</td>
                <td class="readonly"><div class="note-cell">${task.note || ''}</div></td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="10" style="color:red; text-align:center;">Failed to load history.</td></tr>';
    }
}

function clearFilter() {
    document.getElementById('history-date-from').value = '';
    document.getElementById('history-date-to').value = '';
    document.getElementById('date-label-from').textContent = 'From Date';
    document.getElementById('date-label-to').textContent = 'To Date';
    loadUserHistory();
}

// Column Resizing Logic
function enableColumnResizing() {
    const table = document.getElementById('history-table');
    if (!table) return;
    const headers = table.querySelectorAll('th');

    headers.forEach(header => {
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
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserHistory();
    enableColumnResizing();
});
