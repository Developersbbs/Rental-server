const admin = require('firebase-admin');
require('dotenv').config();

async function testFirebaseStorage() {
    try {
        console.log('🔍 Testing Firebase Storage Connection...\n');

        // Parse service account
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        console.log('📋 Configuration:');
        console.log(`  Project ID: ${serviceAccount.project_id}`);
        console.log(`  Client Email: ${serviceAccount.client_email}`);
        console.log(`  Storage Bucket: ${process.env.FIREBASE_STORAGE_BUCKET}\n`);

        // Initialize Firebase
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });

        console.log('✅ Firebase Admin initialized\n');

        // Get bucket
        const bucket = admin.storage().bucket();
        console.log(`✅ Bucket reference obtained: ${bucket.name}\n`);

        // Test: Create a test file
        console.log('📤 Testing file upload...');
        const testFileName = `test/connection-test-${Date.now()}.txt`;
        const file = bucket.file(testFileName);

        await file.save('This is a test file to verify Firebase Storage connection.', {
            metadata: {
                contentType: 'text/plain'
            }
        });

        console.log(`✅ Test file uploaded: ${testFileName}\n`);

        // Make it public
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${testFileName}`;
        console.log(`✅ File made public: ${publicUrl}\n`);

        // Clean up - delete test file
        await file.delete();
        console.log('✅ Test file deleted\n');

        console.log('🎉 Firebase Storage is working correctly!');
        console.log('✅ All tests passed\n');

    } catch (error) {
        console.error('❌ Firebase Storage Test Failed:');
        console.error(`  Error: ${error.message}`);
        if (error.code) console.error(`  Code: ${error.code}`);
        console.error(`\n  Full error:`, error);
    } finally {
        process.exit();
    }
}

testFirebaseStorage();
