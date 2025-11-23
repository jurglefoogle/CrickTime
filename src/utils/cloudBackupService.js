import { BlobServiceClient } from '@azure/storage-blob';
import { InteractiveBrowserCredential } from '@azure/identity';

/**
 * Cloud Backup Service
 * Handles backup and restore operations with Azure Blob Storage
 * Uses Entra for user identification + anonymous blob access for storage
 */

const STORAGE_ACCOUNT = process.env.REACT_APP_AZURE_STORAGE_ACCOUNT || 'cricktime';
const CONTAINER_NAME = process.env.REACT_APP_AZURE_CONTAINER || 'backups';
const TENANT_ID = process.env.REACT_APP_AZURE_TENANT_ID || 'consumers';
const CLIENT_ID = process.env.REACT_APP_AZURE_CLIENT_ID || 'd64bd21a-1627-4ff5-96b7-c1cef325cf5a';
const SAS_TOKEN = process.env.REACT_APP_AZURE_SAS_TOKEN || '';

class CloudBackupService {
  constructor() {
    this.blobServiceClient = null;
    this.containerClient = null;
    this.credential = null;
    this.initialized = false;
    this.authenticated = false;
    this.error = null;
    this.initPromise = null; // Track initialization promise to prevent concurrent calls
    this.userToken = null; // Store user token for identification
  }

  /**
   * Initialize the Azure Blob Storage client
   * Uses Entra for user identification and anonymous access for storage
   */
  async initialize() {
    // If already initialized, return immediately
    if (this.initialized && this.authenticated) return true;
    
    // If initialization is in progress, wait for it
    if (this.initPromise) return this.initPromise;

    // Start new initialization
    this.initPromise = this._doInitialize();
    const result = await this.initPromise;
    this.initPromise = null;
    return result;
  }

  async _doInitialize() {
    try {
      console.log('Initializing cloud backup...');
      
      // Step 1: Authenticate user with Entra to get their identity
      if (!this.credential) {
        const redirectUri = window.location.hostname === 'localhost' 
          ? window.location.origin 
          : window.location.origin + window.location.pathname.replace(/\/$/, '');
        
        console.log('Authenticating user for identification...');
        
        this.credential = new InteractiveBrowserCredential({
          tenantId: TENANT_ID,
          clientId: CLIENT_ID,
          redirectUri: redirectUri,
        });

        // Get a token just for user identification (using Microsoft Graph)
        try {
          this.userToken = await this.credential.getToken(['User.Read']);
          console.log('User authenticated successfully');
        } catch (error) {
          console.error('Failed to authenticate user:', error);
          throw new Error('User authentication failed. Please sign in.');
        }
      }
      
      // Step 2: Connect to blob storage using SAS token
      const accountUrl = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;
      
      // Create BlobServiceClient with SAS token for read/write access
      const urlWithSAS = SAS_TOKEN ? `${accountUrl}${SAS_TOKEN}` : accountUrl;
      this.blobServiceClient = new BlobServiceClient(urlWithSAS);
      
      // Get container client
      this.containerClient = this.blobServiceClient.getContainerClient(CONTAINER_NAME);
      
      // Test anonymous access by trying to list blobs
      try {
        // Try a simple operation to verify container is accessible
        const iter = this.containerClient.listBlobsFlat({ maxPageSize: 1 });
        await iter.next();
        console.log('Successfully connected to Azure Blob Storage with SAS token');
        this.authenticated = true;
      } catch (error) {
        if (error.statusCode === 404) {
          throw new Error('Storage container not found. Please ensure the container exists.');
        } else if (error.statusCode === 403 || error.statusCode === 401) {
          throw new Error('Access denied. Please ensure you have a valid SAS token configured in REACT_APP_AZURE_SAS_TOKEN.');
        } else {
          throw error;
        }
      }
      
      this.initialized = true;
      this.error = null;
      return true;
    } catch (error) {
      console.error('Failed to initialize cloud backup:', error);
      this.error = error.message || 'Initialization failed';
      this.initialized = false;
      this.authenticated = false;
      
      // Clear credential on auth failure so it can be retried
      if (error.message?.includes('interaction_in_progress')) {
        this.credential = null;
        this.userToken = null;
      }
      
      return false;
    }
  }

  /**
   * Generate a unique backup filename with user identifier
   */
  async generateBackupFilename(userId = null) {
    // If no userId provided, get from authenticated user token
    if (!userId && this.userToken) {
      try {
        // userToken is an AccessToken object with a 'token' property containing the JWT
        const tokenString = this.userToken.token;
        if (tokenString) {
          const parts = tokenString.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            userId = payload.preferred_username || payload.email || payload.unique_name || payload.upn || payload.oid || 'default';
            console.log('Using user ID from token:', userId);
          }
        }
      } catch (error) {
        console.warn('Could not get user ID from token, using default', error);
        userId = 'default';
      }
    }
    
    const sanitizedUserId = (userId || 'default').replace(/[^a-zA-Z0-9-_.@]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${sanitizedUserId}/backup-${timestamp}.json`;
  }

  /**
   * Upload backup to cloud storage
   * @param {Object} data - The data to backup
   * @returns {Object} { success, filename, error }
   */
  async uploadBackup(data) {
    try {
      const isReady = await this.initialize();
      if (!isReady) {
        throw new Error(this.error || 'Cloud backup not initialized');
      }

      const filename = await this.generateBackupFilename();
      const blobClient = this.containerClient.getBlockBlobClient(filename);
      
      const jsonData = JSON.stringify(data, null, 2);
      const contentLength = new Blob([jsonData]).size;
      
      await blobClient.upload(
        jsonData,
        contentLength,
        {
          blobHTTPHeaders: {
            blobContentType: 'application/json'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            appVersion: '1.1.0',
            dataVersion: String(data.schemaVersion || 1)
          }
        }
      );

      console.log('Backup uploaded successfully:', filename);
      return {
        success: true,
        filename,
        url: blobClient.url,
        timestamp: new Date().toISOString(),
        size: contentLength
      };
    } catch (error) {
      console.error('Upload backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download backup from cloud storage
   * @param {string} filename - The backup filename to download
   * @returns {Object} { success, data, error }
   */
  async downloadBackup(filename) {
    try {
      const isReady = await this.initialize();
      if (!isReady) {
        throw new Error(this.error || 'Cloud backup not initialized');
      }

      const blobClient = this.containerClient.getBlockBlobClient(filename);
      const downloadResponse = await blobClient.download(0);
      
      // Read the blob content as text in browser
      const text = await downloadResponse.blobBody.text();
      const data = JSON.parse(text);

      console.log('Backup downloaded successfully:', filename);
      return {
        success: true,
        data,
        metadata: downloadResponse.metadata
      };
    } catch (error) {
      console.error('Download backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List available backups for current user
   * @returns {Array} List of backup files
   */
  async listBackups() {
    try {
      const isReady = await this.initialize();
      if (!isReady) {
        throw new Error(this.error || 'Cloud backup not initialized');
      }

      // Get current user identifier from stored token
      let userId = 'default';
      if (this.userToken) {
        try {
          const tokenString = this.userToken.token;
          if (tokenString) {
            const parts = tokenString.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              userId = payload.preferred_username || payload.email || payload.unique_name || payload.upn || payload.oid || 'default';
              userId = userId.replace(/[^a-zA-Z0-9-_.@]/g, '_');
            }
          }
        } catch (error) {
          console.warn('Could not get user ID from token', error);
        }
      }

      const backups = [];
      const prefix = `${userId}/`;
      
      for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
        backups.push({
          filename: blob.name,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
          metadata: blob.metadata
        });
      }

      // Sort by last modified (newest first)
      backups.sort((a, b) => b.lastModified - a.lastModified);
      
      console.log(`Found ${backups.length} backups for user ${userId}`);
      return {
        success: true,
        backups,
        userId
      };
    } catch (error) {
      console.error('List backups failed:', error);
      return {
        success: false,
        backups: [],
        error: error.message
      };
    }
  }

  /**
   * Delete a backup from cloud storage
   * @param {string} filename - The backup filename to delete
   * @returns {Object} { success, error }
   */
  async deleteBackup(filename) {
    try {
      const isReady = await this.initialize();
      if (!isReady) {
        throw new Error(this.error || 'Cloud backup not initialized');
      }

      const blobClient = this.containerClient.getBlockBlobClient(filename);
      await blobClient.delete();

      console.log('Backup deleted successfully:', filename);
      return { success: true };
    } catch (error) {
      console.error('Delete backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if cloud backup is available and configured
   */
  isAvailable() {
    return !!(CLIENT_ID && STORAGE_ACCOUNT);
  }

  /**
   * Sign out the user and clear all cached authentication
   */
  async signOut() {
    this.authenticated = false;
    this.initialized = false;
    this.credential = null;
    this.blobServiceClient = null;
    this.containerClient = null;
    this.initPromise = null;
    
    // Clear MSAL cache from localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('msal.') || key.includes('login.windows.net') || key.includes('login.microsoftonline.com')) {
          localStorage.removeItem(key);
        }
      });
      console.log('Cleared MSAL cache from localStorage');
    } catch (e) {
      console.warn('Could not clear MSAL cache:', e);
    }
    
    console.log('Signed out from Azure');
  }

  /**
   * Force a fresh authentication by clearing cache and re-initializing
   */
  async forceReauth() {
    await this.signOut();
    return await this.initialize();
  }
}

// Export singleton instance
export const cloudBackupService = new CloudBackupService();
