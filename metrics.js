// metrics.js - Metrics Management

class MetricsManager {
  constructor() {
    this.utilizationRules = [];
    this.holidays = [];
    this.userAccess = [];
    this.timeEntries = [];
    this.activities = [];
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.loadAllData();
      this.renderMetrics();
      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize metrics:', err);
      UI.showError('Failed to load metrics data. Please refresh the page.');
    }
  }

  async loadAllData() {
    try {
      const [utilizationRules, holidays, userAccess, timeEntries, activities] = await Promise.all([
        sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.clientUtilizationRules),
        sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.holidays),
        sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.userClientAccess),
        sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.timeEntries),
        sharePointAPI.getItems(CONFIG.SHAREPOINT.lists.activities)
      ]);

      this.utilizationRules = utilizationRules.map(item => ({
        id: item.id,
        clientCode: item.fields.ClientCodeLookupId ? item.fields.ClientCode : null,
        targetUtilization: parseFloat(item.fields.TargetUtilizationPercent) || 80,
        countOnlyBillable: item.fields.CountOnlyBillable !== false,
        standardHoursPerWeek: parseFloat(item.fields.StandardHoursPerWeek) || 40,
        holidayCalendar: item.fields.HolidayCalendar || 'Both',
        calculationMethod: item.fields.UtilizationCalculationMethod || 'Theoretical Available Hours'
      }));

      this.holidays = holidays.map(item => ({
        id: item.id,
        name: item.fields.Title,
        date: item.fields.HolidayDate,
        team: item.fields.Team || 'Both'
      }));

      this.userAccess = userAccess.map(item => ({
        id: item.id,
        userEmail: item.fields.Title,
        clientCode: item.fields.ClientCode,
        team: item.fields.Team || 'Onshore',
        allocationPercent: parseFloat(item.fields.AllocationPercent) || 100
      }));

      this.timeEntries = timeEntries.map(item => ({
        id: item.id,
        userEmail: item.fields.Title,
        date: item.fields.Date,
        clientCode: item.fields.ClientCode,
        projectName: item.fields.ProjectName,
        activityTask: item.fields.ActivityTask,
        hours: parseFloat(item.fields.Hours) || 0
      }));

      this.activities = activities.map(item => ({
        id: item.id,
        name: item.fields.Title,
        projectName: item.fields.ProjectName,
        billable: item.fields.Billable !== false
      }));

      console.log('Metrics data loaded');
    } catch (err) {
      console.error('Error loading metrics data:', err);
      throw err;
    }
  }

  renderMetrics() {
    const isAdmin = authManager.getIsAdmin();
    const userEmail = authManager.getUserEmail();

    if (isAdmin) {
      this.renderAdminMetrics();
    } else {
      this.renderUserMetrics(userEmail);
    }
  }

  renderUserMetrics(userEmail) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Get user's client assignments
    const userClients = this.userAccess.filter(
      ua => ua.userEmail.toLowerCase() === userEmail.toLowerCase()
    );

    if (userClients.length === 0) {
      UI.showEmptyState('metricsContent', '📊', 'No Metrics Available', 'You are not assigned to any clients yet.');
      return;
    }

    // Calculate metrics for each client
    const metricsData = userClients.map(assignment => {
      const rules = this.utilizationRules.find(r => r.clientCode === assignment.clientCode);
      const metrics = this.calculateUtilization(
        userEmail,
        assignment.clientCode,
        currentYear,
        currentMonth,
        rules,
        assignment
      );
      return { ...metrics, clientCode: assignment.clientCode };
    });

    const html = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">My Utilization - ${this.getMonthName(currentMonth)} ${currentYear}</h3>
          <p class="card-subtitle">View your utilization across assigned clients</p>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Allocation</th>
                <th>Billable Hours</th>
                <th>Non-Billable Hours</th>
                <th>Total Hours</th>
                <th>Available Hours</th>
                <th>Utilization</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              ${metricsData.map(m => `
                <tr>
                  <td><strong>${m.clientCode}</strong></td>
                  <td>${m.allocation}%</td>
                  <td>${m.billableHours.toFixed(2)}</td>
                  <td>${m.nonBillableHours.toFixed(2)}</td>
                  <td>${m.totalHours.toFixed(2)}</td>
                  <td>${m.availableHours.toFixed(2)}</td>
                  <td>
                    <strong style="color: ${m.utilization >= m.target ? 'var(--success)' : 'var(--danger)'}">
                      ${m.utilization.toFixed(1)}%
                    </strong>
                  </td>
                  <td>${m.target.toFixed(0)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('metricsContent').innerHTML = html;
  }

  renderAdminMetrics() {
    const html = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Admin Metrics Dashboard</h3>
          <p class="card-subtitle">View utilization across all users and clients</p>
        </div>
        <p style="padding: 20px;">Admin metrics coming soon...</p>
      </div>
    `;

    document.getElementById('metricsContent').innerHTML = html;
  }

  calculateUtilization(userEmail, clientCode, year, month, rules, assignment) {
    // Get time entries for this user, client, and month
    const entries = this.timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return (
        entry.userEmail.toLowerCase() === userEmail.toLowerCase() &&
        entry.clientCode === clientCode &&
        entryDate.getMonth() === month &&
        entryDate.getFullYear() === year
      );
    });

    // Calculate billable vs non-billable hours
    let billableHours = 0;
    let nonBillableHours = 0;

    entries.forEach(entry => {
      const activity = this.activities.find(
        a => a.name === entry.activityTask && a.projectName === entry.projectName
      );
      const isBillable = activity ? activity.billable : false;

      if (isBillable) {
        billableHours += entry.hours;
      } else {
        nonBillableHours += entry.hours;
      }
    });

    const totalHours = billableHours + nonBillableHours;

    // Calculate available hours
    let availableHours = 0;
    if (rules) {
      if (rules.calculationMethod === 'Theoretical Available Hours') {
        availableHours = this.calculateTheoreticalHours(
          year,
          month,
          rules.standardHoursPerWeek,
          assignment.allocationPercent,
          assignment.team,
          rules.holidayCalendar
        );
      } else {
        // Actual Hours Worked
        availableHours = totalHours;
      }
    } else {
      // No rules defined, use default
      availableHours = this.calculateTheoreticalHours(
        year,
        month,
        40,
        assignment.allocationPercent,
        assignment.team,
        'Both'
      );
    }

    // Calculate utilization
    const productiveHours = rules && rules.countOnlyBillable ? billableHours : totalHours;
    const utilization = availableHours > 0 ? (productiveHours / availableHours) * 100 : 0;
    const target = rules ? rules.targetUtilization : 80;

    return {
      billableHours,
      nonBillableHours,
      totalHours,
      availableHours,
      utilization,
      target,
      allocation: assignment.allocationPercent
    };
  }

  calculateTheoreticalHours(year, month, standardHoursPerWeek, allocationPercent, userTeam, holidayCalendar) {
    // Get business days in month
    const businessDays = this.getBusinessDaysInMonth(year, month);

    // Get applicable holidays
    const applicableHolidays = this.holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      const isInMonth = holidayDate.getMonth() === month && holidayDate.getFullYear() === year;
      const isBusinessDay = holidayDate.getDay() !== 0 && holidayDate.getDay() !== 6;

      if (!isInMonth || !isBusinessDay) return false;

      // Check if holiday applies to this user
      if (holidayCalendar === 'Both') {
        return holiday.team === userTeam || holiday.team === 'Both';
      } else {
        return holiday.team === holidayCalendar || holiday.team === 'Both';
      }
    });

    const workingDays = businessDays - applicableHolidays.length;
    const hoursPerDay = standardHoursPerWeek / 5;
    const totalHours = workingDays * hoursPerDay;
    const allocatedHours = totalHours * (allocationPercent / 100);

    return allocatedHours;
  }

  getBusinessDaysInMonth(year, month) {
    const date = new Date(year, month, 1);
    let businessDays = 0;

    while (date.getMonth() === month) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
      date.setDate(date.getDate() + 1);
    }

    return businessDays;
  }

  getMonthName(month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  }
}

// Global instance
const metricsManager = new MetricsManager();
