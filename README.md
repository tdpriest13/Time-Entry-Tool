# Time Entry Tool - Technical Documentation

## Overview

The Time Entry Tool is a single-page web application (SPA) built for enterprise time tracking and utilization management. The application enables users to log billable and non-billable hours across multiple clients and projects while providing administrators with comprehensive utilization analytics.

**Live Application:** https://tdpriest13.github.io/Time-Entry-Tool/

## Architecture

### Technology Stack

- **Frontend Framework:** Vanilla JavaScript (ES6+)
- **UI:** HTML5, CSS3 (Custom design system)
- **Authentication:** Microsoft Authentication Library (MSAL.js 2.38.0)
- **Backend/Storage:** SharePoint Online Lists via Microsoft Graph API
- **Hosting:** GitHub Pages (Static site deployment)
- **Identity Provider:** Azure Active Directory (Azure AD)

### Key Design Decisions

1. **No Backend Server:** Direct client-to-SharePoint communication eliminates infrastructure costs and complexity
2. **SharePoint as Database:** Leverages existing Microsoft 365 infrastructure for zero additional storage costs
3. **Graph API Integration:** Modern RESTful API for all data operations
4. **Role-Based Access Control:** Admin privileges defined in application config, user access controlled via SharePoint permissions
5. **Modular JavaScript:** Separation of concerns across distinct JS files (auth, utils, time entry, admin, metrics)

## Authentication Flow

### Azure AD Integration

The application uses **OAuth 2.0 authorization code flow with PKCE** via MSAL.js:

```
User Opens App
    ↓
Silent Sign-In Attempt (index.html)
    ↓
[If Token Valid] → Load App
[If No Token] → Show Sign-In Page
    ↓
User Clicks "Sign In with Microsoft"
    ↓
Redirect to Azure AD (login.microsoftonline.com)
    ↓
User Authenticates (MFA if required)
    ↓
Azure AD Issues Authorization Code
    ↓
MSAL Exchanges Code for Access Token
    ↓
Token Stored in Browser Session Storage
    ↓
App Loaded with User Context
```

### MSAL Configuration

**File:** `auth.js`

**Key Components:**
- **Client ID:** `abe43417-4888-481d-8e63-c335313a3eac`
- **Tenant ID:** `94f35210-3fa2-4689-8c39-06670b265f94`
- **Redirect URI:** `https://tdpriest13.github.io/Time-Entry-Tool/`
- **Scopes Requested:**
  - `Sites.ReadWrite.All` - Read/write SharePoint list data
  - `User.Read` - Read authenticated user profile
  - `User.ReadBasic.All` - Search organization users (admin feature)

**Token Management:**
- Access tokens cached in session storage
- Silent token refresh before expiration
- Automatic re-authentication on token expiry

### Admin Authorization

Admin status determined by hardcoded email list in `config.js`:

```javascript
ADMINS: ['admin@company.com']
```

**Admin Capabilities:**
- Create/edit/delete clients, projects, activities
- Assign users to clients with allocation percentages
- Configure utilization calculation rules
- View organization-wide metrics (planned)

**Regular User Capabilities:**
- Log time entries for assigned clients only
- View personal utilization metrics
- Edit/delete own time entries

## Data Architecture

### SharePoint Site Structure

**Site URL:** `netorgft5961137.sharepoint.com/sites/UndockedTimekeeping`

**SharePoint Lists:**

#### 1. Clients
| Column | Type | Description |
|--------|------|-------------|
| Title | Text | Client name (renamed from default column) |
| ClientCode | Text | Unique identifier (enforced unique) |
| ClientDescription | Multi-line Text | Client details |

#### 2. Projects
| Column | Type | Description |
|--------|------|-------------|
| Title | Text | Project name |
| ClientCode | Text | Parent client reference |
| ProjectDescription | Multi-line Text | Project details |

#### 3. Activities
| Column | Type | Description |
|--------|------|-------------|
| Title | Text | Activity/task name |
| ProjectName | Text | Parent project reference |
| ActivityDescription | Multi-line Text | Activity details |
| Billable | Yes/No | Billable classification |

#### 4. UserClientAccess
| Column | Type | Description |
|--------|------|-------------|
| Title | Text | User email address |
| ClientCode | Text | Assigned client |
| Team | Choice | Onshore/Offshore designation |
| AllocationPercent | Number | % of time allocated (0-100) |

#### 5. TimeEntries
| Column | Type | Description |
|--------|------|-------------|
| Title | Text | User email address |
| Date | Date | Entry date |
| ClientCode | Text | Client reference |
| ProjectName | Text | Project reference |
| ActivityTask | Text | Activity reference |
| Hours | Number | Hours logged (0.25 increments) |
| Notes | Multi-line Text | Optional entry notes |

#### 6. ClientUtilizationRules
| Column | Type | Description |
|--------|------|-------------|
| Title | Text | Auto-generated |
| ClientCode | Lookup | References Clients list |
| TargetUtilizationPercent | Number | Target % (default 80) |
| CountOnlyBillable | Yes/No | Count only billable hours |
| StandardHoursPerWeek | Number | Expected hours/week (default 40) |
| HolidayCalendar | Choice | Onshore/Offshore/Both |
| UtilizationCalculationMethod | Choice | Theoretical vs Actual Hours |

#### 7. Holidays
| Column | Type | Description |
|--------|------|-------------|
| Title | Text | Holiday name |
| HolidayDate | Date | Holiday date |
| Team | Choice | Onshore/Offshore/Both |

### Data Relationships

```
Clients (1) ←→ (Many) Projects
Projects (1) ←→ (Many) Activities
Clients (1) ←→ (Many) UserClientAccess
Clients (1) ←→ (1) ClientUtilizationRules [Optional]

TimeEntries reference:
  - ClientCode (Many-to-One → Clients)
  - ProjectName (Many-to-One → Projects)
  - ActivityTask (Many-to-One → Activities)
```

**Important Notes:**
- SharePoint's default "Title" column cannot be deleted, only renamed in display
- Internal field names remain "Title" in Graph API responses
- Lookup columns return IDs that must be resolved to values via client-side mapping

## Data Flow

### Time Entry Creation

```
User Interface (timeentry.js)
    ↓
[1] User selects Client
    → Filters Projects by ClientCode
    ↓
[2] User selects Project
    → Filters Activities by ProjectName
    ↓
[3] User fills Date, Hours, Notes
    ↓
[4] Form Validation (utils.js)
    - Required fields check
    - Hours validation (0.25-24, quarter-hour increments)
    ↓
[5] API Call via sharePointAPI.createItem()
    POST https://graph.microsoft.com/v1.0/sites/{site}/lists/TimeEntries/items
    Headers: Authorization: Bearer {accessToken}
    Body: { fields: { Title, Date, ClientCode, ... } }
    ↓
[6] SharePoint Stores Record
    ↓
[7] UI Refresh
    - Reload time entries
    - Update display
```

### Metrics Calculation

```
Metrics View Load (metrics.js)
    ↓
[1] Parallel Data Fetch (Promise.all)
    - ClientUtilizationRules
    - Holidays
    - UserClientAccess
    - TimeEntries
    - Activities
    ↓
[2] Filter User's Clients
    WHERE UserClientAccess.userEmail = currentUser
    ↓
[3] For Each Client Assignment:
    
    [3a] Get Utilization Rules
         rules = ClientUtilizationRules WHERE clientCode = assignment.clientCode
    
    [3b] Get Time Entries for Current Month
         entries = TimeEntries WHERE 
           userEmail = currentUser AND
           clientCode = assignment.clientCode AND
           month = currentMonth
    
    [3c] Calculate Billable vs Non-Billable
         FOR EACH entry:
           activity = Activities WHERE name = entry.activityTask
           IF activity.billable THEN billableHours += entry.hours
           ELSE nonBillableHours += entry.hours
    
    [3d] Calculate Available Hours
         IF rules.calculationMethod = "Theoretical Available Hours":
           businessDays = count weekdays in month
           applicableHolidays = Holidays WHERE 
             date in month AND
             (team = user.team OR team = "Both")
           workingDays = businessDays - applicableHolidays.count
           hoursPerDay = rules.standardHoursPerWeek / 5
           availableHours = workingDays × hoursPerDay × (assignment.allocationPercent / 100)
         ELSE:
           availableHours = totalHours (actual hours worked)
    
    [3e] Calculate Utilization
         productiveHours = rules.countOnlyBillable ? billableHours : totalHours
         utilization% = (productiveHours / availableHours) × 100
    
    [3f] Compare to Target
         status = utilization >= rules.targetUtilization ? "on-track" : "below-target"
    ↓
[4] Render Metrics Table
    Display: Client, Allocation%, Billable Hours, Non-Billable Hours,
             Total Hours, Available Hours, Utilization%, Target%
```

## File Structure

```
Time-Entry-Tool/
│
├── index.html              # Main application shell, navigation
├── config.js               # Configuration (Azure, SharePoint, Admins)
├── auth.js                 # MSAL authentication logic
├── utils.js                # Shared utilities (API, validation, UI helpers)
├── timeentry.js            # Time entry form and display
├── admin.js                # Admin panel (CRUD for all entities)
├── metrics.js              # Utilization calculations and display
├── styles.css              # Complete styling system
└── README.md               # User-facing documentation
```

### Key Modules

**index.html**
- Application entry point
- Navigation structure
- View containers (Time Entry, Metrics, Admin)
- Authentication initialization

**auth.js**
- `AuthManager` class
- MSAL configuration and initialization
- Sign-in/sign-out handlers
- Token management
- Admin role checking

**utils.js**
- `SharePointAPI` class - Graph API wrapper
  - `getItems()` - Fetch list items
  - `createItem()` - Create new records
  - `updateItem()` - Update existing records
  - `deleteItem()` - Delete records
- `DateUtils` - Date formatting and manipulation
- `Validation` - Input validation helpers
- `UI` - Loading states, empty states, notifications
- `searchUsers()` - Azure AD user search (requires User.ReadBasic.All permission)

**timeentry.js**
- `TimeEntryManager` class
- Load user's assigned clients
- Cascade dropdowns (Client → Project → Activity)
- Time entry form rendering and submission
- Personal time entry history with daily grouping
- Edit/copy/delete functionality

**admin.js**
- `AdminManager` class
- CRUD operations for all entities:
  - Clients (with cascade delete)
  - Projects
  - Activities
  - User access assignments
- Data loading and relationship management
- Form modals with validation

**metrics.js**
- `MetricsManager` class
- Complex utilization calculations
- Support for two calculation methods:
  - Theoretical Available Hours (based on business days, holidays, allocation)
  - Actual Hours Worked (based on logged time)
- Holiday calendar integration
- Admin vs user view rendering

## API Integration

### Microsoft Graph API

**Base URL:** `https://graph.microsoft.com/v1.0`

**Common Patterns:**

**List Items (GET):**
```javascript
GET /sites/{site-id}/lists/{list-name}/items?expand=fields
Authorization: Bearer {accessToken}
```

**Create Item (POST):**
```javascript
POST /sites/{site-id}/lists/{list-name}/items
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fields": {
    "Title": "Value",
    "CustomField": "Value"
  }
}
```

**Update Item (PATCH):**
```javascript
PATCH /sites/{site-id}/lists/{list-name}/items/{item-id}/fields
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "FieldName": "NewValue"
}
```

**Delete Item (DELETE):**
```javascript
DELETE /sites/{site-id}/lists/{list-name}/items/{item-id}
Authorization: Bearer {accessToken}
```

### Error Handling

**Common HTTP Status Codes:**
- `200 OK` - Successful GET/PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Missing/expired token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Unique constraint violation

**Error Handling Pattern:**
```javascript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);
    throw new Error('Operation failed');
  }
  return await response.json();
} catch (err) {
  console.error('Error:', err);
  UI.showError('User-friendly message');
  throw err;
}
```

## Security Model

### Authentication Security

- **No credentials stored in code** - All auth handled by Azure AD
- **Tokens stored in session storage** - Cleared on browser close
- **HTTPS enforced** - GitHub Pages serves over TLS
- **PKCE flow** - Protection against authorization code interception
- **Short-lived tokens** - Access tokens expire (typically 1 hour)

### Authorization Model

**Three Permission Levels:**

1. **Unauthenticated**
   - Can only see sign-in page
   - No access to application or data

2. **Authenticated User**
   - Must be in Azure AD tenant
   - Must have SharePoint site "Visitors" (Read) permission minimum
   - Can only log time for assigned clients
   - Can view own metrics
   - Cannot access admin functions
   - Cannot directly edit SharePoint lists

3. **Admin User**
   - Email in ADMINS array in config.js
   - All user permissions PLUS:
   - Full CRUD on all entities
   - Can assign users to clients
   - Can configure utilization rules
   - Can view organization-wide data

### Data Access Control

**App Registration Permissions (Application-Level):**
- App uses its own credentials to write to SharePoint
- Users don't need "Edit" permissions on SharePoint site
- Prevents accidental data corruption via SharePoint UI

**User Permissions (User-Level):**
- Read access to SharePoint site allows app to load
- User assignments in UserClientAccess control which clients visible
- Frontend enforces client filtering (backend enforces via app credentials)

**Best Practice Setup:**
1. Add users to "Undocked Timekeeping Visitors" SharePoint group (Read-only)
2. Assign users to clients via admin panel
3. App uses application credentials for all writes
4. Users cannot accidentally modify data in SharePoint directly

## Configuration

### config.js

```javascript
const CONFIG = {
  AZURE_AD: {
    clientId: 'abe43417-4888-481d-8e63-c335313a3eac',
    authority: 'https://login.microsoftonline.com/94f35210-3fa2-4689-8c39-06670b265f94',
    redirectUri: 'https://tdpriest13.github.io/Time-Entry-Tool/'
  },
  
  SHAREPOINT: {
    sitePath: 'netorgft5961137.sharepoint.com:/sites/UndockedTimekeeping:',
    lists: {
      timeEntries: 'TimeEntries',
      clients: 'Clients',
      projects: 'Projects',
      userClientAccess: 'UserClientAccess',
      activities: 'Activities',
      clientUtilizationRules: 'ClientUtilizationRules',
      holidays: 'Holidays'
    }
  },
  
  ADMINS: [
    'admin@company.com'  // Update with actual admin emails
  ]
};
```

**Configuration Steps for New Deployment:**

1. **Azure AD App Registration:**
   - Create new app registration in Azure Portal
   - Set redirect URI to deployment URL
   - Add API permissions: Sites.ReadWrite.All, User.Read, User.ReadBasic.All
   - Grant admin consent
   - Copy Client ID and Tenant ID

2. **SharePoint Site:**
   - Create new SharePoint site
   - Create all required lists with correct column types
   - Grant app registration permissions via /_layouts/15/appinv.aspx
   - Copy site path (format: tenant.sharepoint.com:/sites/SiteName:)

3. **Update config.js:**
   - Replace clientId with new App Registration ID
   - Replace authority URL with new Tenant ID
   - Replace redirectUri with deployment URL
   - Replace sitePath with new SharePoint site
   - Update ADMINS array with admin email addresses

4. **Deploy to GitHub Pages:**
   - Push code to GitHub repository
   - Enable GitHub Pages in repository settings
   - Select branch and root folder
   - Access via generated URL

## Deployment

### GitHub Pages Configuration

**Repository:** tdpriest13/Time-Entry-Tool

**Deployment Settings:**
- Source: Deploy from branch `main`
- Folder: `/` (root)
- Deployment URL: https://tdpriest13.github.io/Time-Entry-Tool/

**Deployment Process:**
1. Commit changes to main branch
2. Push to GitHub
3. GitHub Actions automatically builds and deploys
4. Changes live in 1-3 minutes
5. Browser cache may require hard refresh (Ctrl+Shift+R)

**Cache Management:**
- GitHub Pages serves with cache headers
- Users may see stale content without hard refresh
- Consider adding version query strings for cache busting in production

### Browser Compatibility

**Tested Browsers:**
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

**Required Features:**
- ES6+ JavaScript (async/await, arrow functions, classes)
- Fetch API
- Local/Session Storage
- CSS Grid and Flexbox

## Utilization Calculation Details

### Two Calculation Methods

#### Method 1: Theoretical Available Hours

Used when precise capacity planning is needed.

**Formula:**
```
Business Days = Count of weekdays in month (Mon-Fri)
Applicable Holidays = Count of holidays matching user's team in the month
Working Days = Business Days - Applicable Holidays
Hours Per Day = Standard Hours Per Week ÷ 5
Total Hours = Working Days × Hours Per Day
Available Hours = Total Hours × (Allocation Percent ÷ 100)
```

**Example:**
- March 2026: 22 business days
- Holidays (Onshore): 1 day (New Year's observed)
- Working Days: 21
- Standard Hours: 40/week = 8/day
- Allocation: 80%
- Available Hours: 21 × 8 × 0.80 = 134.4 hours

#### Method 2: Actual Hours Worked

Used when flexible schedules or part-time work is common.

**Formula:**
```
Available Hours = Sum of all logged hours (billable + non-billable)
```

**Example:**
- User logs: 60 billable + 20 non-billable = 80 total
- Available Hours: 80 hours

### Utilization Percentage

**Formula:**
```
Productive Hours = Count Only Billable ? Billable Hours : Total Hours
Utilization % = (Productive Hours ÷ Available Hours) × 100
```

**Example (Theoretical, Count Only Billable):**
- Available Hours: 134.4
- Billable Hours: 100
- Non-Billable Hours: 20
- Productive Hours: 100 (only billable)
- Utilization: (100 ÷ 134.4) × 100 = 74.4%
- Target: 80%
- Status: Below target (shown in red)

**Example (Actual, Count All Hours):**
- Available Hours: 120 (total logged)
- Billable Hours: 90
- Non-Billable Hours: 30
- Productive Hours: 120 (all hours)
- Utilization: (120 ÷ 120) × 100 = 100%
- Target: 80%
- Status: Above target (shown in green)

## Known Issues & Limitations

### Current Limitations

1. **Admin Consent Required**
   - New users need tenant admin to grant app consent
   - Workaround: Admin must approve via Azure Portal

2. **No Offline Support**
   - Requires active internet connection
   - All operations require API access

3. **Client-Side Only**
   - No server-side validation
   - Relies on Azure AD and SharePoint for security

4. **SharePoint Lookup Limitations**
   - Lookup columns return IDs only via Graph API
   - Requires client-side resolution to values
   - Extra API calls needed for foreign key relationships

5. **No Bulk Operations**
   - Time entries must be created/edited one at a time
   - No CSV import/export (planned)

6. **Browser Cache Issues**
   - GitHub Pages aggressive caching
   - Users may need hard refresh after updates

### Known Bugs

None currently reported.

## Future Enhancements

### Planned Features

1. **Admin Metrics Dashboard**
   - Organization-wide utilization view
   - Filter by user, client, team, date range
   - Comparative analytics

2. **Data Export**
   - CSV export of time entries
   - Excel-compatible utilization reports
   - Custom date range selection

3. **Bulk Time Entry**
   - Copy week's entries to next week
   - Template-based entry (recurring meetings)

4. **Notifications**
   - Toast notifications instead of alerts
   - Weekly utilization summary emails

5. **Mobile Optimization**
   - Responsive design improvements
   - Progressive Web App (PWA) support
   - Offline capability with sync

6. **Advanced Reporting**
   - Billable vs non-billable trends
   - Project profitability analysis
   - Resource allocation heatmaps

7. **Approval Workflow**
   - Manager review of time entries
   - Approval/rejection with comments
   - Locked periods after approval

## Development Guidelines

### Code Style

- **JavaScript:** ES6+ features, async/await for asynchronous operations
- **Naming:** camelCase for variables/functions, PascalCase for classes
- **Error Handling:** Try-catch blocks with user-friendly messages
- **Comments:** JSDoc-style comments for public methods
- **Indentation:** 2 spaces

### Adding New Features

**Checklist:**

1. **SharePoint Lists:**
   - Create/modify lists in SharePoint
   - Document column names and types
   - Test manually in SharePoint UI

2. **Configuration:**
   - Add list names to config.js if new list created
   - Update any permission requirements

3. **Data Layer (utils.js):**
   - Add API helper functions if needed
   - Include error handling and logging

4. **Business Logic:**
   - Implement in appropriate module (timeentry.js, admin.js, metrics.js)
   - Follow existing patterns for consistency

5. **UI:**
   - Add to existing views or create new view container
   - Use existing CSS classes for consistency
   - Ensure responsive design

6. **Testing:**
   - Test in development environment first
   - Verify all CRUD operations
   - Test with different user roles
   - Check browser console for errors

7. **Documentation:**
   - Update this README with new functionality
   - Add inline code comments
   - Update user-facing README if needed

### Debugging Tips

**Enable Verbose Logging:**
```javascript
// Temporary debug logging
console.log('Debug checkpoint:', variableName);
```

**Check Access Token:**
```javascript
console.log('Token:', authManager.getAccessToken());
```

**Verify API Responses:**
```javascript
// In utils.js, add to API functions:
console.log('API Response:', await response.json());
```

**Common Issues:**
- **401 Unauthorized:** Token expired, user not signed in, or permissions insufficient
- **403 Forbidden:** App lacks required SharePoint permissions
- **404 Not Found:** List name incorrect or site path wrong
- **CORS Errors:** Not applicable (Graph API supports CORS), but check redirect URI matches exactly

## Support & Contact

**Developer:** Taylor Priest (taylor.priest@undocked.net)

**Repository:** https://github.com/tdpriest13/Time-Entry-Tool

**For Technical Issues:**
1. Check browser console for errors
2. Verify Azure AD app permissions granted
3. Confirm SharePoint site and list access
4. Review this documentation

**For Feature Requests:**
1. Document use case and expected behavior
2. Provide mockups or examples if applicable
3. Contact development team

---

**Last Updated:** March 2026  
**Version:** 1.0  
**License:** Internal use only
