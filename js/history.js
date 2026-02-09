document.addEventListener('DOMContentLoaded', async () => {
    await loadUserHistory();
});

async function loadUserHistory() {
    const tbody = document.getElementById('history-body');
    const dateFilter = document.getElementById('history-date-filter').value;
    
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px;">Loading history...</td></tr>';
    
    // Build URL with filter
    let url = '/api/tasks/history?limit=100'; // Default to last 100
    // Note: The backend /history endpoint might return a list. 
    // If we want specific date filtering on backend, we need to implement it there or filter client side.
    // For now, let's filter client side if the API doesn't support params, 
    // BUT the prompt asked for "filter bhi laga dena".
    // Let's assume we fetch all and filter client side for better UX on small datasets, 
    // or we can pass ?date=YYYY-MM-DD if backend supports it.
    // Looking at routes.py (from memory/previous context), /api/tasks/history just returns simple list.
    // I will filter client-side for now as it's fastest and dataset is small.
    
    const response = await fetchWithAuth(url);
    
    if (response.ok) {
        let tasks = response.data;
        
        // Client-side filtering
        if (dateFilter) {
            tasks = tasks.filter(t => t.date === dateFilter);
        }
        
        // Sort by date descending (newest first) for history view usually, but spreadsheet often ascending.
        // Let's keep consistent: Ascending.
        tasks.sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first for "History" lookup? User said "spreadsheet type", usually lists go down.
        // Let's do Newest at top effectively to see recent history? Or Ascending?
        // "Spreadsheet" implies chronological. Let's do Descending (Newest Top) so they see latest work first.
        
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
                <td class="readonly"><div style="white-space: pre-wrap;">${task.task_updates || ''} ${task.note ? '\n' + task.note : ''}</div></td>
                <td class="readonly"><div style="white-space: pre-wrap;">${task.additional || ''}</div></td>
                <td class="readonly" style="text-align:center;">${task.total_pages_done || 0}</td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="10" style="color:red; text-align:center;">Failed to load history.</td></tr>';
    }
}

function clearFilter() {
    document.getElementById('history-date-filter').value = '';
    loadUserHistory();
}
