// admin.js - Admin Panel Management

class AdminManager {
  constructor() {
    this.clients = [];
    this.projects = [];
    this.userAccess = [];
    this.activities = [];
    this.utilizationRules = [];
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
    const [clients, projects, userAccess, activities, utilizationRules] = await Promise.all([
      sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.clients),
      sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.projects),
      sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.userClientAccess),
      sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.activities),
      sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.clientUtilizationRules)
    ]);

    // Load clients to map lookup IDs
    const clientsMap = {};
    clients.forEach(client => {
      clientsMap[client.id] = client.fields.ClientCode;
    });

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
      clientCode: item.fields.ClientCode
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
      projectName: item.fields.ProjectName,
      billable: item.fields.Billable || false
    }));

    this.utilizationRules = utilizationRules.map(item => ({
      id: item.id,
      clientCode: clientsMap[item.fields.ClientCodeLookupId] || null,
      targetUtilization: parseFloat(item.fields.TargetUtilizationPercent) || 80,
      countOnlyBillable: item.fields.CountOnlyBillable !== false,
      standardHoursPerWeek: parseFloat(item.fields.StandardHoursPerWeek) || 40,
      calculationMethod: item.fields.UtilizationCalculationMethod || 'Theoretical Available Hours'
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

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Quick Actions</h3>
        </div>
        <div class="btn-group" style="padding: 20px;">
          <button class="btn btn-primary" onclick="adminManager.showClientForm()">+ Add Client</button>
          <button class="btn btn-primary" onclick="adminManager.showUtilizationRuleForm()">+ Utilization Rule</button>
          <button class="btn btn-primary" onclick="adminManager.showProjectForm()">+ Add Project</button>
          <button class="btn btn-primary" onclick="adminManager.showActivityForm()">+ Add Activity</button>
          <button class="btn btn-primary" onclick="adminManager.showUserAccessForm()">+ Assign User</button>
        </div>
      </div>

      <div id="clientCards"></div>
    `;

    document.getElementById('adminContent').innerHTML = html;
    this.renderClientCards();
  }

  renderClientCards() {
    const container = document.getElementById('clientCards');
    
    if (this.clients.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div style="padding: 40px; text-align: center; color: var(--gray-600);">
            <div style="font-size: 48px; margin-bottom: 16px;">🏢</div>
            <h3>No Clients Yet</h3>
            <p>Add your first client using the button above</p>
          </div>
        </div>
      `;
      return;
    }

    const cardsHtml = this.clients.map(client => {
      const clientProjects = this.projects.filter(p => p.clientCode === client.code);
      const clientUsers = this.userAccess.filter(a => a.clientCode === client.code);
      const clientActivities = this.activities.filter(a => 
        clientProjects.some(p => p.name === a.projectName)
      );

      return `
        <div class="card">
          <div class="card-header" style="cursor: pointer;" onclick="adminManager.toggleClientCard('${client.code}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 class="card-title">${client.code} - ${client.name}</h3>
                <p class="card-subtitle">${client.description}</p>
              </div>
              <div style="display: flex; gap: 12px; align-items: center;">
                <span style="background: var(--gray-100); padding: 4px 12px; border-radius: 4px; font-size: 14px;">
                  ${clientProjects.length} projects • ${clientUsers.length} users
                </span>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); adminManager.editClient('${client.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); adminManager.deleteClient('${client.id}')">Delete</button>
                <span id="toggle-${client.code}" style="font-size: 20px;">▼</span>
              </div>
            </div>
          </div>
          
          <div id="client-${client.code}" class="client-details" style="display: none;">
            <!-- Projects -->
            <div style="padding: 20px; border-bottom: 1px solid var(--gray-200);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="margin: 0;">Projects (${clientProjects.length})</h4>
                <button class="btn btn-sm btn-primary" onclick="adminManager.showProjectForm(null, '${client.code}')">+ Add Project</button>
              </div>
              ${clientProjects.length === 0 ? 
                '<p style="color: var(--gray-600); font-style: italic;">No projects yet</p>' :
                `<div class="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Description</th>
                        <th>Activities</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${clientProjects.map(project => {
                        const projectActivities = clientActivities.filter(a => a.projectName === project.name);
                        return `
                          <tr>
                            <td><strong>${project.name}</strong></td>
                            <td>${project.description}</td>
                            <td>${projectActivities.length} activities</td>
                            <td>
                              <div class="table-actions">
                                <button class="btn btn-sm btn-secondary" onclick="adminManager.editProject('${project.id}')">Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="adminManager.deleteProject('${project.id}')">Delete</button>
                              </div>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>`
              }
            </div>

            <!-- Activities -->
            <div style="padding: 20px; border-bottom: 1px solid var(--gray-200);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="margin: 0;">Activities (${clientActivities.length})</h4>
                <button class="btn btn-sm btn-primary" onclick="adminManager.showActivityForm(null, '${client.code}')">+ Add Activity</button>
              </div>
              ${clientActivities.length === 0 ?
                '<p style="color: var(--gray-600); font-style: italic;">No activities yet</p>' :
                `<div class="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Activity Name</th>
                        <th>Description</th>
                        <th>Billable</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${clientActivities.map(activity => `
                        <tr>
                          <td>${activity.projectName}</td>
                          <td><strong>${activity.name}</strong></td>
                          <td>${activity.description || '-'}</td>
                          <td>${activity.billable ? '✓ Yes' : '✗ No'}</td>
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
                </div>`
              }
            </div>

            <!-- User Assignments -->
            <div style="padding: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="margin: 0;">Assigned Users (${clientUsers.length})</h4>
                <button class="btn btn-sm btn-primary" onclick="adminManager.showUserAccessForm('${client.code}')">+ Assign User</button>
              </div>
              ${clientUsers.length === 0 ?
                '<p style="color: var(--gray-600); font-style: italic;">No users assigned yet</p>' :
                `<div class="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>User Email</th>
                        <th>Team</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${clientUsers.map(access => `
                        <tr>
                          <td>${access.userEmail}</td>
                          <td>${access.team || 'Onshore'}</td>
                          <td>
                            <button class="btn btn-sm btn-danger" onclick="adminManager.deleteUserAccess('${access.id}')">Remove</button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>`
              }
            </div>
            <!-- Utilization Rules -->
<div style="padding: 20px; border-top: 1px solid var(--gray-200);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
    <h4 style="margin: 0;">Utilization Settings</h4>
    ${(() => {
      const rule = adminManager.utilizationRules.find(r => r.clientCode === client.code);
      return rule 
        ? `<button class="btn btn-sm btn-secondary" onclick="adminManager.showUtilizationRuleForm('${rule.id}')">Edit</button>`
        : `<button class="btn btn-sm btn-primary" onclick="adminManager.showUtilizationRuleForm()">+ Add Rule</button>`;
    })()}
  </div>
  ${(() => {
    const rule = adminManager.utilizationRules.find(r => r.clientCode === client.code);
    if (!rule) {
      return '<p style="color: var(--gray-600); font-style: italic;">Using default settings (80% target, 40 hrs/week)</p>';
    }
    return `
      <div style="background: var(--gray-50); padding: 12px; border-radius: 4px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
          <div><strong>Target:</strong> ${rule.targetUtilization}%</div>
          <div><strong>Std Hours/Week:</strong> ${rule.standardHoursPerWeek}</div>
          <div><strong>Method:</strong> ${rule.calculationMethod}</div>
          <div style="grid-column: 1 / -1;"><strong>Count Only Billable:</strong> ${rule.countOnlyBillable ? 'Yes' : 'No'}</div>
        </div>
        <div style="margin-top: 8px;">
          <button class="btn btn-sm btn-danger" onclick="adminManager.deleteUtilizationRule('${rule.id}')">Delete Rule</button>
        </div>
      </div>
    `;
  })()}
</div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cardsHtml;
  }

  toggleClientCard(clientCode) {
    const details = document.getElementById(`client-${clientCode}`);
    const toggle = document.getElementById(`toggle-${clientCode}`);
    
    if (details.style.display === 'none') {
      details.style.display = 'block';
      toggle.textContent = '▲';
    } else {
      details.style.display = 'none';
      toggle.textContent = '▼';
    }
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
      this.renderClientCards();
      if (timeEntryManager.initialized) await timeEntryManager.refresh();
if (metricsManager.initialized) await metricsManager.refresh();
    } catch (err) {
      console.error('Error saving client:', err);
      UI.showError('Failed to save client. Please try again.');
          }
      }

  showProjectForm(projectId = null, preselectedClientCode = null) {
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
                <option value="${c.code}" ${(project?.clientCode === c.code || preselectedClientCode === c.code) ? 'selected' : ''}>
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
        ProjectDescription: description
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
      this.renderClientCards();
      if (timeEntryManager.initialized) await timeEntryManager.refresh();
if (metricsManager.initialized) await metricsManager.refresh();
          } catch (err) {
      console.error('Error saving project:', err);
      UI.showError('Failed to save project. Please try again.');
          }
  }

  showUserAccessForm(preselectedClientCode = null) {
  const formHtml = `
    <div class="card" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; max-width: 500px; box-shadow: var(--shadow-lg);">
      <div class="card-header">
        <h3 class="card-title">Assign User to Client</h3>
      </div>
      <form id="userAccessForm">
        <div class="form-group">
          <label class="form-label required">User Email</label>
          <div style="position: relative;">
            <input type="email" id="assignUserEmail" class="form-input" required placeholder="Start typing name or email..." autocomplete="off" />
            <div id="userSearchResults" class="user-search-results"></div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label required">Client</label>
          <select id="accessClientCode" class="form-select" required>
            <option value="">Select a client</option>
            ${this.clients.map(c => `
              <option value="${c.code}" ${preselectedClientCode === c.code ? 'selected' : ''}>${c.code} - ${c.name}</option>
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

  // Add search functionality
  const emailInput = document.getElementById('assignUserEmail');
  const resultsDiv = document.getElementById('userSearchResults');
  let searchTimeout;

  emailInput.addEventListener('input', async (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value;

    if (query.length < 2) {
      resultsDiv.innerHTML = '';
      resultsDiv.style.display = 'none';
      return;
    }

    searchTimeout = setTimeout(async () => {
      const users = await searchUsers(query);
      
      if (users.length === 0) {
        resultsDiv.innerHTML = '<div class="user-search-item">No users found</div>';
      } else {
        resultsDiv.innerHTML = users.map(user => `
          <div class="user-search-item" data-email="${user.email}">
            <div class="user-search-name">${user.name}</div>
            <div class="user-search-email">${user.email}</div>
          </div>
        `).join('');

        // Add click handlers
        resultsDiv.querySelectorAll('.user-search-item').forEach(item => {
          item.addEventListener('click', () => {
            const email = item.dataset.email;
            emailInput.value = email;
            resultsDiv.innerHTML = '';
            resultsDiv.style.display = 'none';
          });
        });
      }

      
      resultsDiv.style.display = 'block';
    }, 300);
  });

  // Hide results when clicking outside
  document.addEventListener('click', (e) => {
    if (!emailInput.contains(e.target) && !resultsDiv.contains(e.target)) {
      resultsDiv.style.display = 'none';
    }
  });

  document.getElementById('userAccessForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await this.saveUserAccess();
  });
}

  showActivityForm(activityId = null, preselectedClientCode = null) {
  const activity = activityId ? this.activities.find(a => a.id === activityId) : null;
  const isEdit = !!activity;

  // Filter projects by preselected client if provided
  const availableProjects = preselectedClientCode 
    ? this.projects.filter(p => p.clientCode === preselectedClientCode)
    : this.projects;

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
            ${availableProjects.map(p => `
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
        <div class="form-group">
  <label class="form-label">
    <input type="checkbox" id="activityBillable" ${activity?.billable ? 'checked' : ''} style="margin-right: 8px;">
    Billable Activity
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

  document.getElementById('activityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await this.saveActivity(activityId);
  });
}

  async saveActivity(activityId = null) {
  const projectName = document.getElementById('activityProjectName').value;
  const name = document.getElementById('activityName').value.trim();
  const description = document.getElementById('activityDescription').value.trim();

  if (!projectName || !name || !description) {
    UI.showError('All fields are required');
    return;
  }

  try {
    const activityData = {
      ProjectName: projectName,
      Title: name,
      ActivityDescription: description,
      Billable: document.getElementById('activityBillable').checked
    };

    if (activityId) {
      await sharePointAPI.updateItem(CONFIG.SHAREPOINT.lists.activities, activityId, activityData);
      UI.showSuccess('Activity updated successfully!');
    } else {
      await sharePointAPI.createItem(CONFIG.SHAREPOINT.lists.activities, activityData);
      UI.showSuccess('Activity created successfully!');
    }

    this.closeForm();
    await this.loadAllData();
    this.renderClientCards();
    if (timeEntryManager.initialized) await timeEntryManager.refresh();
if (metricsManager.initialized) await metricsManager.refresh();
  } catch (err) {
    console.error('Error saving activity:', err);
    UI.showError('Failed to save activity. Please try again.');
  }
}

editActivity(activityId) {
  this.showActivityForm(activityId);
}

async deleteActivity(activityId) {
  if (!confirm('Are you sure? This will not delete associated time entries.')) return;

  try {
    await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.activities, activityId);
    UI.showSuccess('Activity deleted successfully!');
    await this.loadAllData();
    this.renderClientCards();
    if (timeEntryManager.initialized) await timeEntryManager.refresh();
if (metricsManager.initialized) await metricsManager.refresh();
  } catch (err) {
    console.error('Error deleting activity:', err);
    UI.showError('Failed to delete activity. Please try again.');
  }
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
      this.renderClientCards();
      if (timeEntryManager.initialized) await timeEntryManager.refresh();
if (metricsManager.initialized) await metricsManager.refresh();
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
    this.renderClientCards();
    if (timeEntryManager.initialized) await timeEntryManager.refresh();
if (metricsManager.initialized) await metricsManager.refresh();
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
      this.renderClientCards();
      if (timeEntryManager.initialized) await timeEntryManager.refresh();
if (metricsManager.initialized) await metricsManager.refresh();
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
      this.renderClientCards();
      if (timeEntryManager.initialized) await timeEntryManager.refresh();
if (metricsManager.initialized) await metricsManager.refresh();
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

  showUtilizationRuleForm(ruleId = null) {
  const rule = ruleId ? this.utilizationRules.find(r => r.id === ruleId) : null;
  const isEdit = !!rule;

  // Get clients that don't have rules yet (for new rules)
  const clientsWithRules = this.utilizationRules.map(r => r.clientCode);
  const availableClients = this.clients.filter(c => 
    isEdit ? c.code === rule.clientCode : !clientsWithRules.includes(c.code)
  );

  const formHtml = `
    <div class="card" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; max-width: 600px; box-shadow: var(--shadow-lg);">
      <div class="card-header">
        <h3 class="card-title">${isEdit ? 'Edit' : 'Add'} Utilization Rule</h3>
      </div>
      <form id="utilizationRuleForm">
        <div class="form-group">
          <label class="form-label required">Client</label>
          <select id="ruleClientCode" class="form-select" required ${isEdit ? 'disabled' : ''}>
            <option value="">Select a client</option>
            ${availableClients.map(c => `
              <option value="${c.code}" ${rule?.clientCode === c.code ? 'selected' : ''}>
                ${c.code} - ${c.name}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Target Utilization %</label>
            <input type="number" id="targetUtilization" class="form-input" required 
                   min="0" max="100" step="1" value="${rule?.targetUtilization || 80}" />
          </div>

          <div class="form-group">
            <label class="form-label required">Standard Hours/Week</label>
            <input type="number" id="standardHours" class="form-input" required 
                   min="1" max="80" step="1" value="${rule?.standardHoursPerWeek || 40}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">Calculation Method</label>
          <select id="calculationMethod" class="form-select" required>
            <option value="Theoretical Available Hours" ${rule?.calculationMethod === 'Theoretical Available Hours' ? 'selected' : ''}>
              Theoretical Available Hours
            </option>
            <option value="Actual Hours Worked" ${rule?.calculationMethod === 'Actual Hours Worked' ? 'selected' : ''}>
              Actual Hours Worked
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" id="countOnlyBillable" 
                   ${rule?.countOnlyBillable !== false ? 'checked' : ''} style="margin-right: 8px;">
            Count Only Billable Hours
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

  document.getElementById('utilizationRuleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await this.saveUtilizationRule(ruleId);
  });
}

async saveUtilizationRule(ruleId = null) {
  const clientCode = document.getElementById('ruleClientCode').value;
  const targetUtilization = document.getElementById('targetUtilization').value;
  const standardHours = document.getElementById('standardHours').value;
  const calculationMethod = document.getElementById('calculationMethod').value;
  const countOnlyBillable = document.getElementById('countOnlyBillable').checked;

  if (!clientCode || !targetUtilization || !standardHours) {
    UI.showError('All required fields must be filled');
    return;
  }

  try {
    // Get client lookup ID
    const client = this.clients.find(c => c.code === clientCode);
    
    const ruleData = {
      ClientCodeLookupId: client.id,
      TargetUtilizationPercent: parseFloat(targetUtilization),
      StandardHoursPerWeek: parseFloat(standardHours),
      UtilizationCalculationMethod: calculationMethod,
      CountOnlyBillable: countOnlyBillable
    };

    if (ruleId) {
      await sharePointAPI.updateItem(CONFIG.SHAREPOINT.lists.clientUtilizationRules, ruleId, ruleData);
      UI.showSuccess('Utilization rule updated successfully!');
    } else {
      await sharePointAPI.createItem(CONFIG.SHAREPOINT.lists.clientUtilizationRules, ruleData);
      UI.showSuccess('Utilization rule created successfully!');
    }

    this.closeForm();
    await this.loadAllData();
    this.renderClientCards();
    if (metricsManager.initialized) await metricsManager.refresh();
  } catch (err) {
    console.error('Error saving utilization rule:', err);
    UI.showError('Failed to save utilization rule. Please try again.');
  }
}

async deleteUtilizationRule(ruleId) {
  if (!confirm('Delete this utilization rule? The client will use default settings.')) return;

  try {
    await sharePointAPI.deleteItem(CONFIG.SHAREPOINT.lists.clientUtilizationRules, ruleId);
    UI.showSuccess('Utilization rule deleted!');
    await this.loadAllData();
    this.renderClientCards();
    if (metricsManager.initialized) await metricsManager.refresh();
  } catch (err) {
    console.error('Error deleting utilization rule:', err);
    UI.showError('Failed to delete rule. Please try again.');
  }
}
}

// Global instance
const adminManager = new AdminManager();
