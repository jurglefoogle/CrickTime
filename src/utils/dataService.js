/**
 * Data Service for Mechanic Hours App
 * Handles all data persistence and manipulation
 * Reference: www.context7.com for data management best practices
 */

const STORAGE_KEY = 'mechanicHoursData';

// Schema version
export const CURRENT_SCHEMA_VERSION = 3;

// Default data structure (legacy 'tasks' removed) + new persisted invoices collection
const DEFAULT_DATA = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  clients: [],
  entries: [],
  scheduledJobs: [],
  jobs: [],
  invoices: [], // finalized invoice snapshots
  charges: [], // parts & expense charges phase 1
  active: null
};

// Migration functions keyed by fromVersion -> toVersion transformation
// Each migration receives a mutable data object and should return it
const migrations = [
  // to v2
  function toV2(data) {
    if (!data.invoices) data.invoices = [];
    data.schemaVersion = 2;
    return data;
  },
  // to v3 - add charges collection
  function toV3(data) {
    if (!Array.isArray(data.charges)) data.charges = [];
    data.schemaVersion = 3;
    return data;
  }
];

function applyMigrations(raw) {
  let data = raw || {};
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 1; // treat absence as v1
  if (version < CURRENT_SCHEMA_VERSION) {
    if (version < 2) data = migrations[0](data);
    if (version < 3) data = migrations[1](data);
  }
  return data;
}

export const dataService = {
  /**
   * Load data from localStorage
   * @returns {Object} Application data
   */
  loadData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
  const parsed = data ? JSON.parse(data) : DEFAULT_DATA;
      // Legacy cleanup: remove deprecated 'tasks' array if present
      if (parsed && parsed.tasks) {
        delete parsed.tasks;
      }
      // Ensure expected arrays exist
      if (!Array.isArray(parsed.jobs)) parsed.jobs = [];
      if (!Array.isArray(parsed.scheduledJobs)) parsed.scheduledJobs = [];
  // Apply migrations
  const migrated = applyMigrations(parsed);
  // Ensure invoices array present after migration
  if (!Array.isArray(migrated.invoices)) migrated.invoices = [];
  if (!Array.isArray(migrated.charges)) migrated.charges = [];
  return migrated;
    } catch (error) {
      console.error('Error loading data:', error);
      return DEFAULT_DATA;
    }
  },

  /**
   * Save data to localStorage
   * @param {Object} data - Application data to save
   */
  saveData(data) {
    try {
  const clone = { ...data };
  if (clone.tasks) delete clone.tasks; // enforce removal
  if (!clone.schemaVersion) clone.schemaVersion = CURRENT_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  },

  /**
   * Generate unique ID
   * @returns {string} Unique identifier
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Format duration from milliseconds to readable string
   * @param {number} duration - Duration in milliseconds
   * @returns {string} Formatted duration (e.g., "2h 30m")
   */
  formatDuration(duration) {
    if (duration == null || isNaN(duration) || duration < 0) return '0m';
    // Show seconds for very short durations (< 60s)
    if (duration < 1000) return '<1s';
    if (duration < 60 * 1000) {
      const secs = Math.floor(duration / 1000);
      return secs < 5 ? '<5s' : `${secs}s`;
    }
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) {
      return minutes === 0 ? '<1m' : `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  },

  /**
   * Convert duration to decimal hours for billing
   * @param {number} duration - Duration in milliseconds
   * @returns {number} Duration in decimal hours
   */
  durationToHours(duration) {
    return duration / (1000 * 60 * 60);
  },

  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  },

  /**
   * Format date for display
   * @param {number|Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    const dateObj = typeof date === 'number' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Format time for display
   * @param {number|Date} date - Date to format
   * @returns {string} Formatted time string
   */
  formatTime(date) {
    const dateObj = typeof date === 'number' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Parse a YYYY-MM-DD date string as a local Date (no UTC shift)
   * @param {string} dateStr - Date string in format YYYY-MM-DD
   * @returns {Date|null} Local date or null
   */
  parseLocalDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const [y,m,d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m-1, d, 0,0,0,0);
  },

  /**
   * Get entries for a specific date range
   * @param {Object[]} entries - All entries
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object[]} Filtered entries
   */
  getEntriesInRange(entries, startDate, endDate) {
    return entries.filter(entry => {
      const entryDate = new Date(entry.start);
      return entryDate >= startDate && entryDate <= endDate;
    });
  },

  /**
   * Calculate total hours for entries
   * @param {Object[]} entries - Entries to calculate
   * @returns {number} Total hours
   */
  calculateTotalHours(entries) {
    return entries.reduce((total, entry) => {
      if (entry.end && entry.start) {
        return total + this.durationToHours(entry.end - entry.start);
      }
      return total;
    }, 0);
  },

  /**
   * Calculate total amount for entries with client rates
   * @param {Object[]} entries - Entries to calculate
   * @param {Object[]} clients - Client data with rates
   * @returns {number} Total amount
   */
  calculateTotalAmount(entries, clients) {
    return entries.reduce((total, entry) => {
      if (entry.end && entry.start) {
        const client = clients.find(c => c.id === entry.clientId);
        if (client && client.rate) {
          const hours = this.durationToHours(entry.end - entry.start);
          return total + (hours * client.rate);
        }
      }
      return total;
    }, 0);
  },

  /**
   * Export data as JSON for backup
   * @param {Object} data - Application data
   * @returns {string} JSON string
   */
  exportData(data) {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  },

  /**
   * Import data from JSON backup
   * @param {string} jsonString - JSON data string
   * @returns {Object|null} Parsed data or null if invalid
   */
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      // Validate data structure
      if (data && typeof data === 'object' && 
          Array.isArray(data.clients) && 
          Array.isArray(data.entries)) {
        // Provide graceful upgrade removing legacy 'tasks'
        if (data.tasks) delete data.tasks; // legacy cleanup
        if (!Array.isArray(data.jobs)) data.jobs = [];
        if (!Array.isArray(data.scheduledJobs)) data.scheduledJobs = [];
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error importing data:', error);
      return null;
    }
  }
};
