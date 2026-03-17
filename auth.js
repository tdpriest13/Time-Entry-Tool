// auth.js - Authentication Management

class AuthManager {
  constructor() {
    this.msalInstance = null;
    this.accessToken = null;
    this.currentUser = null;
    this.isAdmin = false;
    this.init();
  }

  init() {
    this.msalInstance = new msal.PublicClientApplication({
      auth: {
        clientId: CONFIG.AZURE.clientId,
        authority: `https://login.microsoftonline.com/${CONFIG.AZURE.tenantId}`,
        redirectUri: CONFIG.AZURE.redirectUri
      },
      cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
      }
    });
  }

  async signIn() {
    try {
      const result = await this.msalInstance.loginPopup({
        scopes: ["User.Read", "Sites.ReadWrite.All"]
      });

      this.msalInstance.setActiveAccount(result.account);
      this.currentUser = result.account;

      const tokenResponse = await this.msalInstance.acquireTokenSilent({
        scopes: ["Sites.ReadWrite.All"],
        account: result.account
      });

      this.accessToken = tokenResponse.accessToken;
      this.isAdmin = this.checkIsAdmin(result.account.username);

      return {
        success: true,
        user: result.account,
        isAdmin: this.isAdmin
      };
    } catch (err) {
      console.error("Sign-in failed:", err);
      return {
        success: false,
        error: err.message
      };
    }
  }

  async silentSignIn() {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) return { success: false };

      this.msalInstance.setActiveAccount(accounts[0]);
      this.currentUser = accounts[0];

      const tokenResponse = await this.msalInstance.acquireTokenSilent({
        scopes: ["Sites.ReadWrite.All"],
        account: accounts[0]
      });

      this.accessToken = tokenResponse.accessToken;
      this.isAdmin = this.checkIsAdmin(accounts[0].username);

      return {
        success: true,
        user: accounts[0],
        isAdmin: this.isAdmin
      };
    } catch (err) {
      console.error("Silent sign-in failed:", err);
      return { success: false };
    }
  }

  async signOut() {
    try {
      await this.msalInstance.logoutPopup();
      this.accessToken = null;
      this.currentUser = null;
      this.isAdmin = false;
      return { success: true };
    } catch (err) {
      console.error("Sign-out failed:", err);
      return { success: false, error: err.message };
    }
  }

  checkIsAdmin(email) {
    return CONFIG.ADMINS.includes(email.toLowerCase());
  }

  getAccessToken() {
    return this.accessToken;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getIsAdmin() {
    return this.isAdmin;
  }

  getUserEmail() {
    return this.currentUser?.username || '';
  }
}

// Global instance
const authManager = new AuthManager();
