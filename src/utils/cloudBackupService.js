import { BlobServiceClient } from '@azure/storage-blob';
import { InteractiveBrowserCredential } from '@azure/identity';

/**
 * Cloud Backup Service
 * Handles backup and restore operations with Azure Blob Storage
 * Uses Entra (Azure AD) interactive authentication for browser
 */

const STORAGE_ACCOUNT = process.env.REACT_APP_AZURE_STORAGE_ACCOUNT || 'cricktime';
const CONTAINER_NAME = process.env.REACT_APP_AZURE_CONTAINER || 'backups';
const TENANT_ID = process.env.REACT_APP_AZURE_TENANT_ID || 'common'; // 'common' for multi-tenant
const CLIENT_ID = process.env.REACT_APP_AZURE_CLIENT_ID || '4cb6959c-34a4-4715-9b75-6f39042c0b44';

class CloudBackupService {
  constructor() {
    this.blobServiceClient = null;
    this.containerClient = null;
    this.credential = null;
    this.initialized = false;
    this.authenticated = false;
    this.error = null;
  }

  /**
   * Initialize the Azure Blob Storage client with Entra authentication
   */
  async initialize() {
    if (this.initialized && this.authenticated) return true;

    try {
      console.log('Initializing Azure Blob Storage with Entra authentication...');
      
      const accountUrl = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;
      
      // Create interactive browser credential for user login
      this.credential = new InteractiveBrowserCredential({
        tenantId: TENANT_ID,
        clientId: CLIENT_ID,
        redirectUri: window.location.origin + window.location.pathname.replace(/\/$/, ''), // Support GitHub Pages subpath
        loginHint: '', // Optional: pre-fill user email
      });

      // Create BlobServiceClient with the credential
      this.blobServiceClient = new BlobServiceClient(accountUrl, this.credential);
      
      // Get container client
      this.containerClient = this.blobServiceClient.getContainerClient(CONTAINER_NAME);
      
      // Test authentication by trying to access the container
      try {
        await this.containerClient.getProperties();
        console.log('Successfully authenticated and connected to Azure Blob Storage');
        this.authenticated = true;
      } catch (error) {
        // If container doesn't exist, try to create it
        if (error.statusCode === 404) {
          console.log('Container not found, attempting to create...');
          await this.containerClient.create();
          console.log('Container created successfully');
          this.authenticated = true;
        } else if (error.statusCode === 403) {
          throw new Error('Access denied. Please ensure your Azure account has Storage Blob Data Contributor role on the storage account.');
        } else {
          throw error;
        }
      }
      
      this.initialized = true;
      this.error = null;
      return true;
    } catch (error) {
      console.error('Failed to initialize cloud backup:', error);
      this.error = error.message || 'Authentication failed';
      this.initialized = false;
      this.authenticated = false;
      return false;
    }
  }

  /**
   * Generate a unique backup filename with user identifier
   */
  async generateBackupFilename(userId = null) {
    // If no userId provided, try to get from authenticated user
    if (!userId && this.credential) {
      try {
        // Get user info from token
        const token = await this.credential.getToken(['https://storage.azure.com/.default']);
        // Parse JWT to get user identifier (will be email or object ID)
        const payload = JSON.parse(atob(token.token.split('.')[1]));
        userId = payload.preferred_username || payload.unique_name || payload.oid || 'default';
      } catch (error) {
        console.warn('Could not get user ID from token, using default', error);
        userId = 'default';
      }
    }
    
    const sanitizedUserId = (userId || 'default').replace(/[^a-zA-Z0-9-_.]/g, '_');
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
            appVersion: '1.0',
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

      // Get current user identifier
      let userId = 'default';
      try {
        const token = await this.credential.getToken(['https://storage.azure.com/.default']);
        const payload = JSON.parse(atob(token.token.split('.')[1]));
        userId = payload.preferred_username || payload.unique_name || payload.oid || 'default';
        userId = userId.replace(/[^a-zA-Z0-9-_.]/g, '_');
      } catch (error) {
        console.warn('Could not get user ID, listing all backups');
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
   * Sign out the user
   */
  async signOut() {
    this.authenticated = false;
    this.initialized = false;
    this.credential = null;
    console.log('Signed out from Azure');
  }
}

// Export singleton instance
export const cloudBackupService = new CloudBackupService();
