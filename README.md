# Undocked Timekeeping Tool

A modern time tracking application integrated with SharePoint and Azure AD authentication.

## 📋 Overview

This tool allows users to:
- Log time entries against assigned clients and projects
- View their personal time entry history
- Track weekly hours

Administrators can:
- Manage clients and projects
- Assign users to clients
- View all system data

## 🚀 Deployment Instructions

### 1. Update Configuration

Edit `config.js` and update:
- `ADMINS` array with admin email addresses
- Verify Azure AD credentials are correct
- Confirm SharePoint site path

### 2. Upload to GitHub Pages

1. Go to your GitHub repository: `tdpriest13/Time-Entry-Tool`
2. Upload all files to the root directory:
   - index.html
   - config.js
   - styles.css
   - auth.js
   - utils.js
   - timeentry.js
   - admin.js

3. Ensure GitHub Pages is enabled:
   - Go to Settings → Pages
   - Source: Deploy from branch
   - Branch: main / root

### 3. Verify Azure AD Redirect URI

In Azure Portal → App Registrations:
- Ensure redirect URI matches: `https://tdpriest13.github.io/Time-Entry-Tool/`

## 📊 SharePoint Lists Setup

Your SharePoint site should have these lists with exact column names:

### Clients List
- `ClientName` (Single line of text, Required)
- `ClientCode` (Single line of text, Required, Unique)
- `ClientDescription` (Multiple lines of text, Required)

### Projects List
- `ProjectName` (Single line of text, Required)
- `ProjectDescription` (Multiple lines of text, Required)
- `ClientCode` (Single line of text, Required)

### UserClientAccess List
- `UserEmail` (Single line of text, Required)
- `ClientCode` (Single line of text, Required)

### TimeEntries List
- `Name` (Single line of text, Required)
- `Date` (Date and time, Required)
- `ClientCode` (Single line of text, Required)
- `ProjectName` (Single line of text, Required)
- `TaskActivity` (Single line of text, Required)
- `Hours` (Number, Required)
- `Notes` (Multiple lines of text)

## 🔧 Initial Setup Steps

### For Admins:
1. Sign in to the tool
2. Navigate to Admin Panel
3. Add clients (ClientCode must be unique)
4. Add projects for each client
5. Assign users to clients

### For Users:
1. Admin must assign you to at least one client
2. Sign in with your organization account
3. Select client → project → log hours

## 🔐 Security

- Only users in your Azure AD tenant can sign in
- Users only see clients they're assigned to
- Users only see their own time entries
- Admins have full visibility and control

## ⚙️ Technical Details

**Frontend**: Vanilla JavaScript, HTML5, CSS3
**Authentication**: MSAL.js (Microsoft Authentication Library)
**API**: Microsoft Graph API
**Storage**: SharePoint Online Lists
**Hosting**: GitHub Pages

## 📝 File Structure

```
/Time-Entry-Tool/
├── index.html          # Main HTML structure
├── config.js           # Configuration (admins, SharePoint, Azure)
├── styles.css          # All styling
├── auth.js             # Authentication logic
├── utils.js            # Shared utilities and SharePoint API
├── timeentry.js        # User time entry functionality
└── admin.js            # Admin panel functionality
```

## 🆘 Troubleshooting

**Users can't see any clients:**
- Check UserClientAccess list - ensure user email is assigned
- Email must match exactly (case-insensitive)

**"Failed to load data" error:**
- Check SharePoint permissions
- Verify list names match exactly
- Check browser console for detailed errors

**Sign-in fails:**
- Verify Azure AD app redirect URI
- Check if user is in the correct tenant
- Ensure required API permissions are granted

## 📧 Support

Update the admin list in `config.js` to manage who has full access.
