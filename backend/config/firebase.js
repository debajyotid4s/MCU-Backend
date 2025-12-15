/**
 * Firebase Admin SDK Configuration
 * 
 * This module initializes Firebase Admin SDK for Realtime Database access.
 * Designed for serverless environments with singleton pattern to prevent
 * multiple initializations across cold starts.
 * 
 * Environment Variables Required:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_PRIVATE_KEY_ID
 * - FIREBASE_PRIVATE_KEY
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_CLIENT_ID
 * - FIREBASE_CERT_URL
 * - FIREBASE_DATABASE_URL
 */

import admin from 'firebase-admin';

// Singleton instance for Realtime Database
let database = null;

/**
 * Initialize Firebase Admin SDK safely for serverless environment
 * Uses singleton pattern to prevent multiple initializations
 * @returns {admin.database.Database} Firebase Realtime Database instance
 */
function initializeFirebase() {
  // Check if Firebase is already initialized (singleton pattern)
  if (admin.apps.length > 0) {
    console.log('[Firebase] Using existing Firebase instance');
    return admin.database();
  }

  console.log('[Firebase] Initializing new Firebase instance...');

  // Validate required environment variables
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_DATABASE_URL'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Build service account credentials from environment variables
  // This approach avoids storing JSON files (serverless-safe)
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    // Handle escaped newlines in private key (common in env vars)
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CERT_URL || ''
  };

  // Initialize Firebase Admin with credentials
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

  console.log('[Firebase] Successfully initialized');
  return admin.database();
}

/**
 * Get Firebase Realtime Database instance
 * Initializes Firebase if not already done (lazy initialization)
 * @returns {admin.database.Database} Firebase Realtime Database instance
 */
export function getDatabase() {
  if (!database) {
    database = initializeFirebase();
  }
  return database;
}

/**
 * Get a reference to a specific path in the database
 * @param {string} path - Database path (e.g., 'responses/request123')
 * @returns {admin.database.Reference} Database reference
 */
export function getRef(path) {
  return getDatabase().ref(path);
}

// Export for testing and direct access if needed
export default {
  getDatabase,
  getRef
};
