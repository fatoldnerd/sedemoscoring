/**
 * Script to set up manager accounts
 *
 * This script updates user documents in Firestore to set the manager role
 * for specified email addresses.
 *
 * Usage: node scripts/setup-managers.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Manager emails to set up
const MANAGER_EMAILS = [
  'brad.towers@simprogroup.com',
  'bradptowers@gmail.com'
];

async function setupManagers() {
  console.log('Setting up manager accounts...\n');

  for (const email of MANAGER_EMAILS) {
    try {
      console.log(`Processing: ${email}`);

      // Get user from Firebase Auth
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
        console.log(`  ✓ Found in Auth: ${userRecord.uid}`);
      } catch (error) {
        console.log(`  ✗ Not found in Auth. User needs to sign in first.`);
        continue;
      }

      // Update or create Firestore user document
      const userRef = db.collection('users').doc(userRecord.uid);
      const userDoc = await userRef.get();

      const userData = {
        email: email,
        displayName: userRecord.displayName || email.split('@')[0],
        role: 'Manager',
        managedSeIds: [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (userDoc.exists) {
        // Update existing document
        await userRef.update({
          role: 'Manager',
          managedSeIds: admin.firestore.FieldValue.arrayUnion(), // Keep existing array
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  ✓ Updated Firestore document`);
      } else {
        // Create new document
        await userRef.set({
          ...userData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  ✓ Created Firestore document`);
      }

      console.log(`  ✓ ${email} is now a Manager\n`);

    } catch (error) {
      console.error(`  ✗ Error processing ${email}:`, error.message);
      console.log();
    }
  }

  console.log('Manager setup complete!');
  process.exit(0);
}

// Run the setup
setupManagers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
