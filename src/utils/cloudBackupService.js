import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';

/**
 * Cloud Backup Service
 * Handles backup and restore operations with Azure Blob Storage
 */

const STORAGE_ACCOUNT = process.env.REACT_APP_AZURE_STORAGE_ACCOUNT || 'cricktime';
const CONTAINER_NAME = process.env.REACT_APP_AZURE_CONTAINER || 'backups';
const TENANT_ID = process.env.REACT_APP_AZURE_TENANT_ID;
const CLIENT_ID = process.env.REACT_APP_AZURE_CLIENT_ID || '4cb6959c-34a4-4715-9b75-6f39042c0b44';
const CLIENT_SECRET = process.env.REACT_APP_AZURE_CLIENT_SECRET;

// Connection string fallback for development
const CONNECTION_STRING = process.env.REACT_APP_AZURE_STORAGE_CONNECTION_STRING;

class CloudBackupService {
  constructor() {
    this.blobServiceClient = null;
    this.containerClient = null;
    this.initialized = false;
    this.error = null;
  }

  /**
   * Initialize the Azure Blob Storage client
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      // Try connection string first (simpler for development)
      if (CONNECTION_STRING) {
        console.log('Using connection string authentication');
        this.blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
      } 
      // Try Entra (Azure AD) authentication with client credentials
      else if (TENANT_ID && CLIENT_ID && CLIENT_SECRET) {
        console.log('Using Entra client credentials authentication');
        const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
        const accountUrl = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;
        this.blobServiceClient = new BlobServiceClient(accountUrl, credential);
      }
      // Try default Azure credential (for production/managed identity)
      else if (CLIENT_ID) {
        console.log('Using default Azure credential');
        const credential = new DefaultAzureCredential({
          managedIdentityClientId: CLIENT_ID
        });
        const accountUrl = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;
        this.blobServiceClient = new BlobServiceClient(accountUrl, credential);
      }
      else {
        throw new Error('No Azure credentials configured. Please set environment variables.');
      }

      // Get container client
      this.containerClient = this.blobServiceClient.getContainerClient(CONTAINER_NAME);
      
      // Ensure container exists
      await this.containerClient.createIfNotExists();
      
      this.initialized = true;
      this.error = null;
      return true;
    } catch (error) {
      console.error('Failed to initialize cloud backup:', error);
      this.error = error.message;
      this.initialized = false;
      return false;
    }
  }

  /**
   * Generate a unique backup filename
   */
  generateBackupFilename(userId = 'default') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `backup-${userId}-${timestamp}.json`;
  }

  /**
   * Upload backup to cloud storage
   * @param {Object} data - The data to backup
   * @param {string} userId - User identifier (optional)
   * @returns {Object} { success, filename, error }
   */
  async uploadBackup(data, userId = 'default') {
    try {
      const isReady = await this.initialize();
      if (!isReady) {
        throw new Error(this.error || 'Cloud backup not initialized');
      }

      const filename = this.generateBackupFilename(userId);
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
            userId,
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
   * List available backups
   * @param {string} userId - User identifier (optional)
   * @returns {Array} List of backup files
   */
  async listBackups(userId = 'default') {
    try {
      const isReady = await this.initialize();
      if (!isReady) {
        throw new Error(this.error || 'Cloud backup not initialized');
      }

      const backups = [];
      const prefix = `backup-${userId}-`;
      
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
        backups
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
    return !!(CONNECTION_STRING || (CLIENT_ID && (TENANT_ID && CLIENT_SECRET)));
  }
}

// Export singleton instance
export const cloudBackupService = new CloudBackupService();
