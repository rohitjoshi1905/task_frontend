// Data storage
let todayTask = null;
let previousTask = null;
let todayStr = '';
let previousStr = '';
let missedDateStr = ''; // Date that was missed

document.addEventListener('DOMContentLoaded', async () => {
    const welcomeMsg = document.getElementById('welcome-msg');
    const email = localStorage.getItem("userName");
    if (email) welcomeMsg.textContent = email;

    await loadTasks();
    
    // Check for missed entries after loading
    await checkMissedEntry();
    
    // Date selector event listeners
    document.getElementById('date-today').addEventListener('change', () => populateForm('today'));
    document.getElementById('date-previous').addEventListener('change', () => populateForm('previous'));
    
    // Form submit
    document.getElementById('task-form').addEventListener('submit', saveTask);
    
    // Status color change
    document.getElementById('f-status').addEventListener('change', updateStatusColor);
    
    // Missed day modal buttons
    document.getElementById('missed-day-yes').addEventListener('click', onMissedDayYes);
    document.getElementById('missed-day-no').addEventListener('click', onMissedDayNo);
});

// --- Missed Day Logic ---

function getPreviousWorkDay(fromDate) {
    const d = new Date(fromDate);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    
    if (dayOfWeek === 0) {
        // Today is Sunday -> skip check (return null)
        return null;
    } else if (dayOfWeek === 1) {
        // Today is Monday -> previous work day is Saturday
        d.setDate(d.getDate() - 2);
    } else {
        // Tue-Sat -> previous work day is yesterday
        d.setDate(d.getDate() - 1);
    }
    
    return d.toISOString().split('T')[0];
}

async function checkMissedEntry() {
    const today = new Date();
    const prevWorkDay = getPreviousWorkDay(today);
    
    // If today is Sunday, no check needed
    if (!prevWorkDay) return;
    
    missedDateStr = prevWorkDay;
    
    // Check if user already dismissed this date
    if (localStorage.getItem(`missedDay_skipped_${prevWorkDay}`)) {
        return;
    }
    
    try {
        const res = await fetchWithAuth(`/api/tasks/today?date=${prevWorkDay}`);
        if (res && res.ok && res.data && res.data.exists) {
            // Task exists for previous work day, no alert needed
            return;
        }
        
        // No task found - show the missed day modal
        const dayName = new Date(prevWorkDay).toLocaleDateString('en-US', { weekday: 'long' });
        const formatted = new Date(prevWorkDay).toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
        
        document.getElementById('missed-day-message').textContent = 
            `You haven't filled your task for ${dayName}, ${formatted}. Do you want to fill it now?`;
        document.getElementById('missed-day-modal').style.display = 'flex';
        
    } catch (e) {
        console.warn("Failed to check missed entry:", e);
    }
}

function onMissedDayYes() {
    // Hide modal
    document.getElementById('missed-day-modal').style.display = 'none';
    
    // Load the missed date into "Previous" slot
    previousStr = missedDateStr;
    previousTask = createEmptyTask(missedDateStr);
    
    // Update label
    document.getElementById('label-previous').textContent = `Previous (${previousStr})`;
    
    // Select "Previous" radio and populate
    document.getElementById('date-previous').checked = true;
    populateForm('previous');
}

function onMissedDayNo() {
    // Hide modal, stay on Today
    document.getElementById('missed-day-modal').style.display = 'none';
    
    // Remember dismissal so popup doesn't show again for this date
    localStorage.setItem(`missedDay_skipped_${missedDateStr}`, 'true');
}

// --- End Missed Day Logic ---

function updateStatusColor() {
    const select = document.getElementById('f-status');
    const value = select.value;
    
    // Remove all status classes
    select.classList.remove('status-not-started', 'status-in-progress', 'status-completed');
    
    // Add appropriate class
    if (value === 'Not Started') {
        select.classList.add('status-not-started');
    } else if (value === 'In Progress') {
        select.classList.add('status-in-progress');
    } else if (value === 'Completed') {
        select.classList.add('status-completed');
    }
}

async function loadTasks() {
    const today = new Date();
    todayStr = today.toISOString().split('T')[0];
    
    // Fetch Today
    try {
        const todayRes = await fetchWithAuth(`/api/tasks/today?date=${todayStr}`);
        if (todayRes && todayRes.ok && todayRes.data && todayRes.data.exists && todayRes.data.task) {
            todayTask = todayRes.data.task;
        } else {
            todayTask = createEmptyTask(todayStr);
        }
    } catch (e) {
        console.warn("Failed to fetch today task:", e);
        todayTask = createEmptyTask(todayStr);
    }
    
    // Fetch Previous
    try {
        const prevRes = await fetchWithAuth(`/api/tasks/previous?before_date=${todayStr}`);
        if (prevRes && prevRes.ok && prevRes.data && prevRes.data.exists && prevRes.data.task) {
            previousTask = prevRes.data.task;
            previousStr = previousTask.date;
        } else {
            // Fallback to previous work day (skip Sunday)
            const prevWork = getPreviousWorkDay(today);
            previousStr = prevWork || todayStr;
            previousTask = createEmptyTask(previousStr);
        }
    } catch (e) {
        console.warn("Failed to fetch previous task:", e);
        const prevWork = getPreviousWorkDay(new Date());
        previousStr = prevWork || todayStr;
        previousTask = createEmptyTask(previousStr);
    }
    
    // Update labels
    document.getElementById('label-today').textContent = `Today (${todayStr})`;
    document.getElementById('label-previous').textContent = `Previous (${previousStr})`;
    
    // Populate form with Today by default
    populateForm('today');
}

function createEmptyTask(dateStr) {
    return {
        date: dateStr,
        planner: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' }),
        owner_name: localStorage.getItem("userName") || 'Me',
        status: 'Not Started',
        assign_website: '',
        task_assign_no: '',
        other_tasks: '',
        task_updates: '',
        additional: '',
        note: '',
        total_pages_done: 0
    };
}

function populateForm(which) {
    const task = which === 'today' ? todayTask : previousTask;
    const dateStr = which === 'today' ? todayStr : previousStr;
    
    // Update info display
    document.getElementById('display-day').textContent = task.planner || new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
    document.getElementById('display-date').textContent = dateStr;
    document.getElementById('display-owner').textContent = task.owner_name || localStorage.getItem("userName") || 'Me';
    
    // Populate form fields
    document.getElementById('f-status').value = task.status || 'Not Started';
    document.getElementById('f-pages').value = task.total_pages_done || 0;
    document.getElementById('f-website').value = task.assign_website || '';
    document.getElementById('f-task-no').value = task.task_assign_no || '';
    document.getElementById('f-other').value = task.other_tasks || '';
    document.getElementById('f-updates').value = (task.task_updates || '') + (task.note ? '\n' + task.note : '');
    document.getElementById('f-additional').value = task.additional || '';
    
    // Update status color
    updateStatusColor();
}

function getSelectedDate() {
    const isToday = document.getElementById('date-today').checked;
    return isToday ? todayStr : previousStr;
}

async function saveTask(e) {
    e.preventDefault();
    
    const selectedDate = getSelectedDate();
    
    const payload = {
        date: selectedDate,
        status: document.getElementById('f-status').value,
        assign_website: document.getElementById('f-website').value,
        task_assign_no: document.getElementById('f-task-no').value,
        total_pages_done: parseInt(document.getElementById('f-pages').value) || 0,
        other_tasks: document.getElementById('f-other').value,
        task_updates: document.getElementById('f-updates').value,
        additional: document.getElementById('f-additional').value,
        note: ""
    };

    try {
        const response = await fetchWithAuth('/api/tasks/save', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (response && response.ok) {
            alert("Saved successfully!");
            
            // Update local cache
            if (selectedDate === todayStr) {
                todayTask = { ...todayTask, ...payload };
            } else {
                previousTask = { ...previousTask, ...payload };
            }
        } else {
            alert("Failed to save.");
        }
    } catch (err) {
        console.error("Save error:", err);
        alert("Error saving task: " + err.message);
    }
}

