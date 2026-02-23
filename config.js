// config.js - Time Entry Tool Configuration
const CONFIG = {
  // Admin users (full access to all clients/projects)
  ADMINS: [
    'taylor.priest@undocked.net'
    // Add more admin emails here
  ],
  
  // SharePoint configuration
  SHAREPOINT: {
    sitePath: 'netorgft5961137.sharepoint.com:/sites/UndockedTimekeeping:',
    lists: {
      timeEntries: 'TimeEntries',
      clients: 'Clients',
      projects: 'Projects',
      userClientAccess: 'UserClientAccess',
      activities: 'Activities'
    }
  },
  
  // Azure AD configuration
  AZURE: {
    clientId: 'abe43417-4888-481d-8e63-c335313a3eac',
    tenantId: '94f35210-3fa2-4689-8c39-06670b265f94',
    redirectUri: 'https://tdpriest13.github.io/Time-Entry-Tool/'
  }
};
