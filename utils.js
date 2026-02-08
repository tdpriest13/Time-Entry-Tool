// utils.js - Shared Utility Functions

class SharePointAPI {
  constructor() {
    this.baseUrl = `https://graph.microsoft.com/v1.0/sites/${CONFIG.SHAREPOINT.sitePath}/lists`;
  }

  async getItems(listName, expand = 'fields') {
    try {
      const response = await fetch(
        `${this.baseUrl}/${listName}/items?expand=${expand}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authManager.getAccessToken()}`
          }
        }
      );

      if (!response.ok) throw new Error(`Failed to fetch ${listName}`);
      const data = await response.json();
      return data.value || [];
    } catch (err) {
      console.error(`Error fetching ${listName}:`, err);
      throw err;
    }
  }

  async createItem(listName, fields) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${listName}/items`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authManager.getAccessToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      return await response.json();
    } catch (err) {
      console.error(`Error creating item in ${listName}:`, err);
      throw err;
    }
  }

  async updateItem(listName, itemId, fields) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${listName}/items/${itemId}/fields`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authManager.getAccessToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fields)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      return await response.json();
    } catch (err) {
      console.error(`Error updating item in ${listName}:`, err);
      throw err;
    }
  }

  async deleteItem(listName, itemId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${listName}/items/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authManager.getAccessToken()}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to delete item');
      return { success: true };
    } catch (err) {
      console.error(`Error deleting item from ${listName}:`, err);
      throw err;
    }
  }
}

// Date utilities
const DateUtils = {
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  getWeekLabel(dateString) {
    const date = new Date(dateString);
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  },

  getTodayISO() {
    return new Date().toISOString().split('T')[0];
  }
};

// Validation utilities
const Validation = {
  validateHours(hours) {
    const num = parseFloat(hours);
    return !isNaN(num) && num > 0 && num <= 24 && num % 0.25 === 0;
  },

  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  validateRequired(value) {
    return value && value.toString().trim().length > 0;
  }
};

// UI utilities
const UI = {
  showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
        </div>
      `;
    }
  },

  showEmptyState(elementId, icon, title, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icon}</div>
          <div class="empty-state-title">${title}</div>
          <div class="empty-state-text">${text}</div>
        </div>
      `;
    }
  },

  showError(message) {
    alert(message); // Can be replaced with toast notification
  },

  showSuccess(message) {
    alert(message); // Can be replaced with toast notification
  }
};

// Global instances
const sharePointAPI = new SharePointAPI();
