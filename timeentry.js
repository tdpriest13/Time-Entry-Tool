// timeentry.js - Time Entry Management

class TimeEntryManager {
  constructor() {
    this.userClients = [];
    this.projects = [];
    this.activities = [];
    this.timeEntries = [];
    this.currentClient = null;
  }

  async initialize() {
    try {
      await this.loadUserClients();
      await this.loadProjects();
      await this.loadActivities();
      await this.loadTimeEntries();
      this.renderTimeEntryForm();
      this.renderTimeEntries();
    } catch (err) {
      console.error('Failed to initialize time entry:', err);
      UI.showError('Failed to load data. Please refresh the page.');
    }
  }

  async loadUserClients() {
    try {
      const userEmail = authManager.getUserEmail();
      const accessRecords = await sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.userClientAccess);
      
      // Get client codes for this user
      const userClientCodes = accessRecords
        .filter(item => item.fields.Title?.toLowerCase() === userEmail.toLowerCase())
        .map(item => item.fields.ClientCode);

      // Load full client details
      const allClients = await sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.clients);
      this.userClients = allClients
        .filter(item => userClientCodes.includes(item.fields.ClientCode))
        .map(item => ({
          id: item.id,
          name: item.fields.Title,
          code: item.fields.ClientCode,
          description: item.fields.ClientDescription
        }));

      console.log('User clients loaded:', this.userClients);
    } catch (err) {
      console.error('Error loading user clients:', err);
      this.userClients = [];
    }
  }

  async loadProjects() {
    try {
      const allProjects = await sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.projects);
      this.projects = allProjects.map(item => ({
        id: item.id,
        name: item.fields.Title,
        description: item.fields.ProjectDescription,
        clientCode: item.fields.ClientCode
      }));

      console.log('Projects loaded:', this.projects);
    } catch (err) {
      console.error('Error loading projects:', err);
      this.projects = [];
    }
  }

  async loadActivities() {
  try {
    const allActivities = await sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.activities);
    this.activities = allActivities.map(item => ({
      id: item.id,
      name: item.fields.Title,
      description: item.fields.ActivityDescription,
      projectName: item.fields.ProjectName
    }));

    console.log('Activities loaded:', this.activities);
  } catch (err) {
    console.error('Error loading activities:', err);
    this.activities = [];
  }
}

  async loadTimeEntries() {
    try {
      const userEmail = authManager.getUserEmail();
      const allEntries = await sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.timeEntries);
      
      this.timeEntries = allEntries
        .filter(item => item.fields.Title?.toLowerCase() === userEmail.toLowerCase())
        .map(item => ({
          id: item.id,
          name: item.fields.Title,
          date: item.fields.Date,
          clientCode: item.fields.ClientCode,
          projectName: item.fields.ProjectName,
          taskActivity: item.fields.ActivityTask,
          hours: parseFloat(item.fields.Hours) || 0,
          notes: item.fields.Notes || ''
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      console.log('Time entries loaded:', this.timeEntries);
    } catch (err) {
      console.error('Error loading time entries:', err);
      this.timeEntries = [];
    }
  }

  getProjectsForClient(clientCode) {
    return this.projects.filter(p => p.clientCode === clientCode);

  }

  getActivitiesForProject(projectName) {
  return this.activities.filter(a => a.projectName === projectName);
}

  renderTimeEntryForm() {
    const formHtml = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">New Time Entry</h3>
          <p class="card-subtitle">Log hours for your assigned projects</p>
        </div>
        
        <form id="timeEntryForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Client</label>
              <select id="clientSelect" class="form-select" required>
                <option value="">Select a client</option>
                ${this.userClients.map(c => `
                  <option value="${c.code}">${c.code} - ${c.name}</option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label required">Project</label>
              <select id="projectSelect" class="form-select" required disabled>
                <option value="">Select a client first</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label required">Date</label>
              <input type="date" id="dateInput" class="form-input" required value="${DateUtils.getTodayISO()}" />
            </div>
          </div>
          
         <div class="form-group">
  <label class="form-label required">Activity/Task</label>
  <select id="activitySelect" class="form-select" required disabled>
    <option value="">Select a project first</option>
  </select>
</div>
            
            <div class="form-group">
              <label class="form-label required">Hours</label>
              <input type="number" id="hoursInput" class="form-input" required step="0.25" min="0.25" max="24" placeholder="0.25" />
              <small style="color: var(--gray-600); font-size: 12px;">Enter in 0.25 hour increments</small>
            </div>
                 
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea id="notesInput" class="form-input" rows="3" placeholder="Optional details about this time entry"></textarea>
          </div>
          
          <div class="btn-group">
            <button type="submit" class="btn btn-primary">
              <span>💾</span> Save Entry
            </button>
            <button type="button" class="btn btn-outline" onclick="timeEntryManager.resetForm()">
              <span>🔄</span> Reset
            </button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('timeEntryContent').innerHTML = formHtml;

    // Event listeners
    document.getElementById('clientSelect').addEventListener('change', (e) => {
      this.onClientChange(e.target.value);
    });

    document.getElementById('projectSelect').addEventListener('change', (e) => {
  this.onProjectChange(e.target.value);
});
    
    document.getElementById('timeEntryForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTimeEntry();
    });

    document.getElementById('hoursInput').addEventListener('input', (e) => {
      this.validateHoursInput(e.target);
    });
  }

  onClientChange(clientCode) {
    const projectSelect = document.getElementById('projectSelect');
    const clientProjects = this.getProjectsForClient(clientCode);
    
    if (clientProjects.length === 0) {
      projectSelect.innerHTML = '<option value="">No projects available</option>';
      projectSelect.disabled = true;
    } else {
      projectSelect.innerHTML = `
        <option value="">Select a project</option>
        ${clientProjects.map(p => `
          <option value="${p.name}">${p.name}</option>
        `).join('')}
      `;
      projectSelect.disabled = false;
    }
  }

  onProjectChange(projectName) {
  const activitySelect = document.getElementById('activitySelect');
  const projectActivities = this.getActivitiesForProject(projectName);
  
  if (projectActivities.length === 0) {
    activitySelect.innerHTML = '<option value="">No activities available for this project</option>';
    activitySelect.disabled = true;
  } else {
    activitySelect.innerHTML = `
      <option value="">Select an activity</option>
      ${projectActivities.map(a => `
        <option value="${a.name}">${a.name}</option>
      `).join('')}
    `;
    activitySelect.disabled = false;
  }
}

  validateHoursInput(input) {
    const isValid = Validation.validateHours(input.value);
    if (isValid) {
      input.classList.remove('error');
    } else {
      input.classList.add('error');
    }
    return isValid;
  }

  async saveTimeEntry() {
     console.log('saveTimeEntry called');
    const clientCode = document.getElementById('clientSelect').value;
    const projectName = document.getElementById('projectSelect').value;
    const date = document.getElementById('dateInput').value;
    const activityTask = document.getElementById('activitySelect').value;
    const hours = document.getElementById('hoursInput').value;
    const notes = document.getElementById('notesInput').value;
    
 console.log('Values:', {clientCode, projectName, date, activityTask, hours});
    
    // Validation
    if (!Validation.validateRequired(clientCode)) {
      console.log('Client validation failed');
      UI.showError('Please select a client');
      return;
    }
    if (!Validation.validateRequired(projectName)) {
      UI.showError('Please select a project');
      return;
    }
    if (!Validation.validateRequired(date)) {
      UI.showError('Please select a date');
      return;
    }
    if (!Validation.validateRequired(activityTask)) {
      UI.showError('Please enter an activity/task');
      return;
    }
    if (!Validation.validateHours(hours)) {
      UI.showError('Hours must be between 0.25 and 24 in 0.25 increments');
      return;
    }

    try {
      const entry = {
        Title: authManager.getUserEmail(),
        Date: date,
        ClientCode: clientCode,
        ProjectName: projectName,
        ActivityTask: activityTask,
        Hours: parseFloat(hours),
        Notes: notes
      };

      await sharePointAPI.createItem(CONFIG.SHAREPOINT.lists.timeEntries, entry);
      
      UI.showSuccess('Time entry saved successfully!');
      this.resetForm();
      await this.loadTimeEntries();
      this.renderTimeEntries();
    } catch (err) {
      console.error('Error saving time entry:', err);
      UI.showError('Failed to save time entry. Please try again.');
    }
  }

  resetForm() {
    document.getElementById('timeEntryForm').reset();
    document.getElementById('dateInput').value = DateUtils.getTodayISO();
    document.getElementById('projectSelect').disabled = true;
    document.getElementById('projectSelect').innerHTML = '<option value="">Select a client first</option>';
  }

  renderTimeEntries() {
    const container = document.getElementById('myEntriesContent');
    
    if (this.timeEntries.length === 0) {
      UI.showEmptyState('myEntriesContent', '📋', 'No Time Entries', 'You haven\'t logged any time yet. Create your first entry above!');
      return;
    }

    // Calculate weekly total
    const thisWeekEntries = this.getThisWeekEntries();
    const weekTotal = thisWeekEntries.reduce((sum, entry) => sum + entry.hours, 0);

    // Group entries by date
const entriesByDate = {};
this.timeEntries.forEach(entry => {
  const dateKey = entry.date;
  if (!entriesByDate[dateKey]) {
    entriesByDate[dateKey] = [];
  }
  entriesByDate[dateKey].push(entry);
});

// Build HTML with date groupings
let tableRows = '';
Object.keys(entriesByDate).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
  const dayEntries = entriesByDate[date];
  const dayTotal = dayEntries.reduce((sum, e) => sum + e.hours, 0);
  
  // Date header row
  tableRows += `
    <tr style="background: var(--gray-100);">
      <td colspan="6"><strong>${DateUtils.formatDate(date)} - ${dayTotal.toFixed(2)} hours</strong></td>
      <td></td>
    </tr>
  `;
  
  // Entries for this date
  dayEntries.forEach(entry => {
    tableRows += `
      <tr>
        <td></td>
        <td>${entry.clientCode}</td>
        <td>${entry.projectName}</td>
        <td>${entry.activityTask}</td>
        <td><strong>${entry.hours.toFixed(2)}</strong></td>
        <td>${entry.notes || '-'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-primary" onclick="timeEntryManager.copyEntry('${entry.id}')">Copy</button>
            <button class="btn btn-sm btn-secondary" onclick="timeEntryManager.editEntry('${entry.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="timeEntryManager.deleteEntry('${entry.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });
});

const html = `
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">My Time Entries</h3>
      <p class="card-subtitle">View and manage your logged hours</p>
    </div>
    
    <div class="week-summary">
      <div class="week-summary-item">
        <div class="week-summary-label">This Week</div>
        <div class="week-summary-value">${weekTotal.toFixed(2)} hrs</div>
      </div>
      <div class="week-summary-item">
        <div class="week-summary-label">Total Entries</div>
        <div class="week-summary-value">${this.timeEntries.length}</div>
      </div>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Project</th>
            <th>Task/Activity</th>
            <th>Hours</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  </div>
`;

    container.innerHTML = html;
  }

  getThisWeekEntries() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return this.timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart;
    });
  }

  async deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
      await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.timeEntries, entryId);
      UI.showSuccess('Time entry deleted successfully!');
      await this.loadTimeEntries();
      this.renderTimeEntries();
    } catch (err) {
      console.error('Error deleting entry:', err);
      UI.showError('Failed to delete time entry. Please try again.');
    }
  }

  editEntry(entryId) {
  const entry = this.timeEntries.find(e => e.id === entryId);
  if (!entry) return;

  const formHtml = `
    <div class="card" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; max-width: 600px; box-shadow: var(--shadow-lg);">
      <div class="card-header">
        <h3 class="card-title">Edit Time Entry</h3>
      </div>
      <form id="editEntryForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Client</label>
            <select id="editClientSelect" class="form-select" required>
              ${this.userClients.map(c => `
                <option value="${c.code}" ${entry.clientCode === c.code ? 'selected' : ''}>
                  ${c.code} - ${c.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label required">Project</label>
            <select id="editProjectSelect" class="form-select" required>
              ${this.getProjectsForClient(entry.clientCode).map(p => `
                <option value="${p.name}" ${entry.projectName === p.name ? 'selected' : ''}>
                  ${p.name}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Date</label>
            <input type="date" id="editDateInput" class="form-input" required value="${entry.date}" />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Hours</label>
            <input type="number" id="editHoursInput" class="form-input" required step="0.25" min="0.25" max="24" value="${entry.hours}" />
          </div>
        </div>
        
        <div class="form-group">
  <label class="form-label required">Activity/Task</label>
  <select id="editActivitySelect" class="form-select" required>
    ${this.getActivitiesForProject(entry.projectName).map(a => `
      <option value="${a.name}" ${entry.activityTask === a.name ? 'selected' : ''}>
        ${a.name}
      </option>
    `).join('')}
  </select>
</div>
        
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="editNotesInput" class="form-input" rows="3">${entry.notes}</textarea>
        </div>
        
        <div class="btn-group">
          <button type="submit" class="btn btn-primary">Save Changes</button>
          <button type="button" class="btn btn-secondary" onclick="timeEntryManager.closeEditForm()">Cancel</button>
        </div>
      </form>
    </div>
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999;" onclick="timeEntryManager.closeEditForm()"></div>
  `;

  document.body.insertAdjacentHTML('beforeend', formHtml);

  // Event listeners
  document.getElementById('editClientSelect').addEventListener('change', (e) => {
    this.onEditClientChange(e.target.value);
  });

    document.getElementById('editProjectSelect').addEventListener('change', (e) => {
  this.onEditProjectChange(e.target.value);
});
    
  document.getElementById('editEntryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await this.saveEditedEntry(entryId);
  });

  document.getElementById('editHoursInput').addEventListener('input', (e) => {
    this.validateHoursInput(e.target);
  });
}
  onEditClientChange(clientCode) {
  const projectSelect = document.getElementById('editProjectSelect');
  const clientProjects = this.getProjectsForClient(clientCode);
  
  if (clientProjects.length === 0) {
    projectSelect.innerHTML = '<option value="">No projects available</option>';
    projectSelect.disabled = true;
  } else {
    projectSelect.innerHTML = `
      <option value="">Select a project</option>
      ${clientProjects.map(p => `
        <option value="${p.name}">${p.name}</option>
      `).join('')}
    `;
    projectSelect.disabled = false;
  }
}

  onEditProjectChange(projectName) {
  const activitySelect = document.getElementById('editActivitySelect');
  const projectActivities = this.getActivitiesForProject(projectName);
  
  if (projectActivities.length === 0) {
    activitySelect.innerHTML = '<option value="">No activities available</option>';
    activitySelect.disabled = true;
  } else {
    activitySelect.innerHTML = `
      <option value="">Select an activity</option>
      ${projectActivities.map(a => `
        <option value="${a.name}">${a.name}</option>
      `).join('')}
    `;
    activitySelect.disabled = false;
  }
}
  
async saveEditedEntry(entryId) {
  const clientCode = document.getElementById('editClientSelect').value;
  const projectName = document.getElementById('editProjectSelect').value;
  const date = document.getElementById('editDateInput').value;
  const activityTask = document.getElementById('editActivitySelect').value;
  const hours = document.getElementById('editHoursInput').value;
  const notes = document.getElementById('editNotesInput').value;

  // Validation
if (!Validation.validateRequired(clientCode) || !Validation.validateRequired(projectName) ||
    !Validation.validateRequired(date) || !Validation.validateRequired(activityTask) ||
    !Validation.validateHours(hours)) {
    UI.showError('Please fill all required fields correctly');
    return;
  }

  try {
    const updatedEntry = {
      Title: authManager.getUserEmail(),
      Date: date,
      ClientCode: clientCode,
      ProjectName: projectName,
      TaskActivity: activityTask,
      Hours: parseFloat(hours),
      Notes: notes
    };

    await sharePointAPI.updateItem(CONFIG.SHAREPOINT.lists.timeEntries, entryId, updatedEntry);
    
    UI.showSuccess('Time entry updated successfully!');
    this.closeEditForm();
    await this.loadTimeEntries();
    this.renderTimeEntries();
  } catch (err) {
    console.error('Error updating entry:', err);
    UI.showError('Failed to update time entry. Please try again.');
  }
}

closeEditForm() {
  const overlay = document.querySelector('[style*="position: fixed"][style*="z-index: 999"]');
  const form = document.querySelector('[style*="position: fixed"][style*="z-index: 1000"]');
  if (overlay) overlay.remove();
  if (form) form.remove();
}

  copyEntry(entryId) {
  const entry = this.timeEntries.find(e => e.id === entryId);
  if (!entry) return;

  // Pre-fill the main form
  document.getElementById('clientSelect').value = entry.clientCode;
  this.onClientChange(entry.clientCode);
  
  // Wait for activities to load after project selection
setTimeout(() => {
  document.getElementById('projectSelect').value = entry.projectName;
  this.onProjectChange(entry.projectName);
  
  setTimeout(() => {
    document.getElementById('activitySelect').value = entry.activityTask;
    document.getElementById('dateInput').value = DateUtils.getTodayISO();
    document.getElementById('hoursInput').value = entry.hours;
    document.getElementById('notesInput').value = entry.notes;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 100);
}, 100);
    
  UI.showSuccess('Entry copied! Update the date and save.');
}
}
// Global instance
const timeEntryManager = new TimeEntryManager();
