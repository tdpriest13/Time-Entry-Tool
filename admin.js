// admin.js - Admin Panel Management

class AdminManager {
  constructor() {
    this.clients = [];
    this.projects = [];
    this.userAccess = [];
    this.activities = [];
    this.allUsers = [];
  }

  async initialize() {
    try {
      await this.loadAllData();
      this.renderAdminDashboard();
    } catch (err) {
      console.error('Failed to initialize admin panel:', err);
      UI.showError('Failed to load admin data. Please refresh the page.');
    }
  }

  async loadAllData() {
    try {
      const [clients, projects, userAccess] = await Promise.all([
        sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.clients),
        sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.projects),
        sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.userClientAccess),
        sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.activities)
      ]);

      this.clients = clients.map(item => ({
        id: item.id,
        name: item.fields.Title,
        code: item.fields.ClientCode,
        description: item.fields.ClientDescription
      }));

      this.projects = projects.map(item => ({
        id: item.id,
        name: item.fields.Title,
        description: item.fields.ProjectDescription,
        clientCode: item.fields.ClientCode,
        billable: item.fields.Billable || false
      }));

      this.userAccess = userAccess.map(item => ({
        id: item.id,
        userEmail: item.fields.Title, 
        clientCode: item.fields.ClientCode,
        team: item.fields.Team || 'Onshore'
      }));

      this.activities = activities.map(item => ({
  id: item.id,
  name: item.fields.Title,
  description: item.fields.ActivityDescription,
  projectName: item.fields.ProjectName
}));
      
      console.log('Admin data loaded');
    } catch (err) {
      console.error('Error loading admin data:', err);
      throw err;
    }
  }

  renderAdminDashboard() {
    const html = `
      <div class="admin-grid">
        <div class="stat-card">
          <h3>Total Clients</h3>
          <div class="stat-value">${this.clients.length}</div>
        </div>
        <div class="stat-card">
          <h3>Total Projects</h3>
          <div class="stat-value">${this.projects.length}</div>
        </div>
        <div class="stat-card">
          <h3>User Assignments</h3>
          <div class="stat-value">${this.userAccess.length}</div>
        </div>
      </div>

      <!-- Client Management -->
      <div class="card mt-3">
        <div class="card-header">
          <h3 class="card-title">Client Management</h3>
          <button class="btn btn-primary" onclick="adminManager.showClientForm()">+ Add Client</button>
        </div>
        <div id="clientManagement"></div>
      </div>

      <!-- Project Management -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Project Management</h3>
          <button class="btn btn-primary" onclick="adminManager.showProjectForm()">+ Add Project</button>
        </div>
        <div id="projectManagement"></div>
      </div>

      <!-- User Access Management -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">User Access Management</h3>
          <button class="btn btn-primary" onclick="adminManager.showUserAccessForm()">+ Assign User</button>
        </div>
        <div id="userAccessManagement"></div>
      </div>

      <!-- Activity/Task Management -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Activity/Task Management</h3>
    <button class="btn btn-primary" onclick="adminManager.showActivityForm()">+ Add Activity</button>
  </div>
  <div id="activityManagement"></div>
</div>
    `;

    document.getElementById('adminContent').innerHTML = html;
    this.renderClientTable();
    this.renderProjectTable();
    this.renderUserAccessTable();
    this.renderActivityTable();
  }

  renderClientTable() {
    const html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Client Code</th>
              <th>Client Name</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.clients.length === 0 ? `
              <tr><td colspan="4" class="text-center">No clients yet. Add your first client above.</td></tr>
            ` : this.clients.map(client => `
              <tr>
                <td><strong>${client.code}</strong></td>
                <td>${client.name}</td>
                <td>${client.description}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-secondary" onclick="adminManager.editClient('${client.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="adminManager.deleteClient('${client.id}')">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('clientManagement').innerHTML = html;
  }

  renderProjectTable() {
    const html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Client Code</th>
              <th>Project Name</th>
              <th>Description</th>
              <th>Billable</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.projects.length === 0 ? `
              <tr><td colspan="4" class="text-center">No projects yet. Add your first project above.</td></tr>
            ` : this.projects.map(project => `
              <tr>
                <td><strong>${project.clientCode}</strong></td>
                <td>${project.name}</td>
                <td>${project.description}</td>
                <td>${project.billable ? '✓ Yes' : '✗ No'}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-secondary" onclick="adminManager.editProject('${project.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="adminManager.deleteProject('${project.id}')">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('projectManagement').innerHTML = html;
  }

  renderUserAccessTable() {
    const html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>User Email</th>
              <th>Client Code</th>
              <th>Client Name</th>
              <th>Team</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.userAccess.length === 0 ? `
              <tr><td colspan="4" class="text-center">No user assignments yet. Assign users to clients above.</td></tr>
            ` : this.userAccess.map(access => {
              const client = this.clients.find(c => c.code === access.clientCode);
              return `
                <tr>
                  <td>${access.userEmail}</td>
                  <td><strong>${access.clientCode}</strong></td>
                  <td>${client ? client.name : 'Unknown'}</td>
                  <td>${access.team || 'Onshore'}</td>
                  <td>
                    <button class="btn btn-sm btn-danger" onclick="adminManager.deleteUserAccess('${access.id}')">Remove</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('userAccessManagement').innerHTML = html;
  }

  renderActivityTable() {
  const html = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Activity Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.activities.length === 0 ? `
            <tr><td colspan="4" class="text-center">No activities yet. Add your first activity above.</td></tr>
          ` : this.activities.map(activity => `
            <tr>
              <td><strong>${activity.projectName}</strong></td>
              <td>${activity.name}</td>
              <td>${activity.description}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-sm btn-secondary" onclick="adminManager.editActivity('${activity.id}')">Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="adminManager.deleteActivity('${activity.id}')">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('activityManagement').innerHTML = html;
}

  showClientForm(clientId = null) {
    const client = clientId ? this.clients.find(c => c.id === clientId) : null;
    const isEdit = !!client;
    const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
    };
    const formHtml = `
      <div class="card" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; max-width: 500px; box-shadow: var(--shadow-lg);">
        <div class="card-header">
          <h3 class="card-title">${isEdit ? 'Edit Client' : 'Add New Client'}</h3>
        </div>
        <form id="clientForm">
          <div class="form-group">
            <label class="form-label required">Client Code</label>
            <input type="text" id="clientCode" class="form-input" required value="${client?.code || ''}" ${isEdit ? 'disabled' : ''} />
          </div>
          <div class="form-group">
            <label class="form-label required">Client Name</label>
            <input type="text" id="clientName" class="form-input" required value="${client?.name || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label required">Description</label>
            <textarea id="clientDescription" class="form-input" required rows="3">${client ? stripHtml(client.description) : ''}</textarea>
          </div>
          <div class="btn-group">
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" onclick="adminManager.closeForm()">Cancel</button>
          </div>
        </form>
      </div>
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999;" onclick="adminManager.closeForm()"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHtml);

    document.getElementById('clientForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveClient(clientId);
    });
  }

  async saveClient(clientId = null) {
    const code = document.getElementById('clientCode').value.trim();
    const name = document.getElementById('clientName').value.trim();
    const description = document.getElementById('clientDescription').value.trim();

    if (!code || !name || !description) {
      UI.showError('All fields are required');
      return;
    }

    try {
      const clientData = {
        ClientCode: code,
        Title: name,
        ClientDescription: description
      };

      if (clientId) {
        await sharePointAPI.updateItem(CONFIG.SHAREPOINT.lists.clients, clientId, clientData);
        UI.showSuccess('Client updated successfully!');
      } else {
        await sharePointAPI.createItem(CONFIG.SHAREPOINT.lists.clients, clientData);
        UI.showSuccess('Client created successfully!');
      }

      this.closeForm();
      await this.loadAllData();
      this.renderClientTable();
      this.renderAdminDashboard();
    } catch (err) {
      console.error('Error saving client:', err);
      UI.showError('Failed to save client. Please try again.');
          }
      }

  showProjectForm(projectId = null) {
    const project = projectId ? this.projects.find(p => p.id === projectId) : null;
    const isEdit = !!project;
    const stripHtml = (html) => {
    const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};
    const formHtml = `
      <div class="card" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; max-width: 500px; box-shadow: var(--shadow-lg);">
        <div class="card-header">
          <h3 class="card-title">${isEdit ? 'Edit Project' : 'Add New Project'}</h3>
        </div>
        <form id="projectForm">
          <div class="form-group">
            <label class="form-label required">Client</label>
            <select id="projectClientCode" class="form-select" required>
              <option value="">Select a client</option>
              ${this.clients.map(c => `
                <option value="${c.code}" ${project?.clientCode === c.code ? 'selected' : ''}>
                  ${c.code} - ${c.name}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Project Name</label>
            <input type="text" id="projectName" class="form-input" required value="${project?.name || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label required">Description</label>
            <textarea id="projectDescription" class="form-input" required rows="3">${project ? stripHtml(project.description) : ''}</textarea>
          </div>
          <div class="form-group">
  <label class="form-label">
    <input type="checkbox" id="projectBillable" ${project?.billable ? 'checked' : ''} style="margin-right: 8px;">
    Billable Project
  </label>
</div>
          <div class="btn-group">
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" onclick="adminManager.closeForm()">Cancel</button>
          </div>
        </form>
      </div>
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999;" onclick="adminManager.closeForm()"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHtml);

    document.getElementById('projectForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveProject(projectId);
    });
  }

  async saveProject(projectId = null) {
    const clientCode = document.getElementById('projectClientCode').value;
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDescription').value.trim();

    if (!clientCode || !name || !description) {
      UI.showError('All fields are required');
      return;
    }

    try {
      const projectData = {
        ClientCode: clientCode,
        Title: name,
        ProjectDescription: description,
        Billable: document.getElementById('projectBillable').checked
      };

      if (projectId) {
        await sharePointAPI.updateItem(CONFIG.SHAREPOINT.lists.projects, projectId, projectData);
        UI.showSuccess('Project updated successfully!');
      } else {
        await sharePointAPI.createItem(CONFIG.SHAREPOINT.lists.projects, projectData);
        UI.showSuccess('Project created successfully!');
      }

      this.closeForm();
      await this.loadAllData();
      this.renderProjectTable();
      this.renderAdminDashboard();
          } catch (err) {
      console.error('Error saving project:', err);
      UI.showError('Failed to save project. Please try again.');
          }
  }

  showUserAccessForm() {
    const formHtml = `
      <div class="card" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; max-width: 500px; box-shadow: var(--shadow-lg);">
        <div class="card-header">
          <h3 class="card-title">Assign User to Client</h3>
        </div>
        <form id="userAccessForm">
          <div class="form-group">
            <label class="form-label required">User Email</label>
            <input type="email" id="assignUserEmail" class="form-input" required placeholder="user@company.com" />
          </div>
          <div class="form-group">
            <label class="form-label required">Client</label>
            <select id="accessClientCode" class="form-select" required>
              <option value="">Select a client</option>
              ${this.clients.map(c => `
                <option value="${c.code}">${c.code} - ${c.name}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
  <label class="form-label required">Team</label>
  <select id="userTeam" class="form-select" required>
    <option value="Onshore">Onshore</option>
    <option value="Offshore">Offshore</option>
  </select>
</div>
          <div class="btn-group">
            <button type="submit" class="btn btn-primary">Assign</button>
            <button type="button" class="btn btn-secondary" onclick="adminManager.closeForm()">Cancel</button>
          </div>
        </form>
      </div>
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999;" onclick="adminManager.closeForm()"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHtml);

    document.getElementById('userAccessForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveUserAccess();
    });
  }

  showActivityForm(activityId = null) {
  const activity = activityId ? this.activities.find(a => a.id === activityId) : null;
  const isEdit = !!activity;

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const formHtml = `
    <div class="card" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; max-width: 500px; box-shadow: var(--shadow-lg);">
      <div class="card-header">
        <h3 class="card-title">${isEdit ? 'Edit Activity' : 'Add New Activity'}</h3>
      </div>
      <form id="activityForm">
        <div class="form-group">
          <label class="form-label required">Project</label>
          <select id="activityProjectName" class="form-select" required>
            <option value="">Select a project</option>
            ${this.projects.map(p => `
              <option value="${p.name}" ${activity?.projectName === p.name ? 'selected' : ''}>
                ${p.clientCode} - ${p.name}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label required">Activity Name</label>
          <input type="text" id="activityName" class="form-input" required value="${activity?.name || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label required">Description</label>
          <textarea id="activityDescription" class="form-input" required rows="3">${activity ? stripHtml(activity.description) : ''}</textarea>
        </div>
        <div class="btn-group">
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" class="btn btn-secondary" onclick="adminManager.closeForm()">Cancel</button>
        </div>
      </form>
    </div>
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999;" onclick="adminManager.closeForm()"></div>
  `;

  document.body.insertAdjacentHTML('beforeend', formHtml);

  document.getElementById('activityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await this.saveActivity(activityId);
  });
}

  async saveUserAccess() {
    const email = document.getElementById('assignUserEmail').value.trim().toLowerCase();
    const clientCode = document.getElementById('accessClientCode').value;

    if (!Validation.validateEmail(email)) {
      UI.showError('Please enter a valid email address');
      return;
    }

    if (!clientCode) {
      UI.showError('Please select a client');
      return;
    }

    // Check if assignment already exists
    const exists = this.userAccess.some(
      a => a.userEmail.toLowerCase() === email && a.clientCode === clientCode
    );

    if (exists) {
      UI.showError('This user is already assigned to this client');
      return;
    }

    try {
      await sharePointAPI.createItem(CONFIG.SHAREPOINT.lists.userClientAccess, {
        Title: email,
        ClientCode: clientCode,
        Team: document.getElementById('userTeam').value
      });

      UI.showSuccess('User assigned successfully!');
      this.closeForm();
      await this.loadAllData();
      this.renderUserAccessTable();
      this.renderAdminDashboard();
          } catch (err) {
      console.error('Error saving user access:', err);
      UI.showError('Failed to assign user. Please try again.');
          }
  }

  async deleteClient(clientId) {
  const client = this.clients.find(c => c.id === clientId);
  const relatedProjects = this.projects.filter(p => p.clientCode === client.code);
  const relatedAccess = this.userAccess.filter(a => a.clientCode === client.code);
  
  let message = `Delete client "${client.code}"?`;
  if (relatedProjects.length > 0 || relatedAccess.length > 0) {
    message += `\n\nThis will also delete:\n- ${relatedProjects.length} project(s)\n- ${relatedAccess.length} user assignment(s)\n\nTime entries will be preserved.`;
  }
  
  if (!confirm(message)) return;

  try {
    // Delete related projects
    for (const project of relatedProjects) {
      await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.projects, project.id);
    }
    
    // Delete related user access
    for (const access of relatedAccess) {
      await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.userClientAccess, access.id);
    }
    
    // Delete client
    await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.clients, clientId);
    
    UI.showSuccess('Client and related records deleted successfully!');
    await this.loadAllData();
    this.renderClientTable();
    this.renderProjectTable();
    this.renderUserAccessTable();
    this.renderAdminDashboard();
  } catch (err) {
    console.error('Error deleting client:', err);
    UI.showError('Failed to delete client. Please try again.');
  }
}async deleteClient(clientId) {
  const client = this.clients.find(c => c.id === clientId);
  const relatedProjects = this.projects.filter(p => p.clientCode === client.code);
  const relatedAccess = this.userAccess.filter(a => a.clientCode === client.code);
  
  let message = `Delete client "${client.code}"?`;
  if (relatedProjects.length > 0 || relatedAccess.length > 0) {
    message += `\n\nThis will also delete:\n- ${relatedProjects.length} project(s)\n- ${relatedAccess.length} user assignment(s)\n\nTime entries will be preserved.`;
  }
  
  if (!confirm(message)) return;

  try {
    // Delete related projects
    for (const project of relatedProjects) {
      await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.projects, project.id);
    }
    
    // Delete related user access
    for (const access of relatedAccess) {
      await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.userClientAccess, access.id);
    }
    
    // Delete client
    await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.clients, clientId);
    
    UI.showSuccess('Client and related records deleted successfully!');
    await this.loadAllData();
    this.renderClientTable();
    this.renderProjectTable();
    this.renderUserAccessTable();
    this.renderAdminDashboard();
  } catch (err) {
    console.error('Error deleting client:', err);
    UI.showError('Failed to delete client. Please try again.');
  }
}

  async deleteProject(projectId) {
    if (!confirm('Are you sure? This will not delete associated time entries.')) return;

    try {
      await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.projects, projectId);
      UI.showSuccess('Project deleted successfully!');
      await this.loadAllData();
      this.renderProjectTable();
      this.renderAdminDashboard();
    } catch (err) {
      console.error('Error deleting project:', err);
      UI.showError('Failed to delete project. Please try again.');
    }
  }

  async deleteUserAccess(accessId) {
    if (!confirm('Remove this user assignment?')) return;

    try {
      await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.userClientAccess, accessId);
      UI.showSuccess('User assignment removed!');
      await this.loadAllData();
      this.renderUserAccessTable();
      this.renderAdminDashboard();
    } catch (err) {
      console.error('Error deleting user access:', err);
      UI.showError('Failed to remove assignment. Please try again.');
    }
  }

  editClient(clientId) {
    this.showClientForm(clientId);
  }

  editProject(projectId) {
    this.showProjectForm(projectId);
  }

  closeForm() {
    const overlay = document.querySelector('[style*="position: fixed"][style*="z-index: 999"]');
    const form = document.querySelector('[style*="position: fixed"][style*="z-index: 1000"]');
    if (overlay) overlay.remove();
    if (form) form.remove();
  }
}

// Global instance
const adminManager = new AdminManager();
