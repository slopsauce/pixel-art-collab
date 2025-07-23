const https = require('https');
const { URL } = require('url');

// Supabase connection details
const SUPABASE_URL = 'https://xvpaowbxdzoucvlkhnxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cGFvd2J4ZHpvdWN2bGtobnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNjg2NDcsImV4cCI6MjA2ODg0NDY0N30.mpoZFWw3IkNd-8w7j7oMyTl9qcSTe9zwiSv19RO_IUE';

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SUPABASE_URL);
        
        const options = {
            method,
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(url, options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : null;
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsedData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function checkRLSPolicies() {
    console.log('=== RLS POLICY AND PERMISSIONS CHECK ===\n');

    // Try to access PostgreSQL system tables that might contain RLS info
    const systemTables = [
        'pg_policies',
        'pg_tables', 
        'information_schema.tables',
        'information_schema.columns',
        'pg_class',
        'pg_namespace'
    ];

    console.log('1. Attempting to access system tables...');
    for (const table of systemTables) {
        try {
            const systemTest = await makeRequest('GET', `/rest/v1/${table}?limit=1`);
            if (systemTest.statusCode === 200) {
                console.log(`  ⚠️ System table '${table}' accessible!`);
                if (systemTest.data && systemTest.data.length > 0) {
                    console.log(`    Sample data keys: ${Object.keys(systemTest.data[0]).join(', ')}`);
                }
            }
        } catch (error) {
            // Expected to fail
        }
    }

    // Test different authentication states
    console.log('\n2. Testing different request patterns...');
    
    // Test without Authorization header
    try {
        const noAuthUrl = new URL('/rest/v1/pixels?limit=1', SUPABASE_URL);
        const noAuthOptions = {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        };

        const noAuthTest = await new Promise((resolve, reject) => {
            const req = https.request(noAuthUrl, noAuthOptions, (res) => {
                let responseData = '';
                res.on('data', (chunk) => { responseData += chunk; });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData ? JSON.parse(responseData) : null
                    });
                });
            });
            req.on('error', reject);
            req.end();
        });

        console.log(`  Request without Authorization header: Status ${noAuthTest.statusCode}`);
        
    } catch (error) {
        console.log(`  No-auth test failed: ${error.message}`);
    }

    // Test malformed JWT
    try {
        const malformedUrl = new URL('/rest/v1/pixels?limit=1', SUPABASE_URL);
        const malformedOptions = {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer invalid.jwt.token',
                'Content-Type': 'application/json'
            }
        };

        const malformedTest = await new Promise((resolve, reject) => {
            const req = https.request(malformedUrl, malformedOptions, (res) => {
                let responseData = '';
                res.on('data', (chunk) => { responseData += chunk; });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                });
            });
            req.on('error', reject);
            req.end();
        });

        console.log(`  Request with malformed JWT: Status ${malformedTest.statusCode}`);
        
    } catch (error) {
        console.log(`  Malformed JWT test failed: ${error.message}`);
    }

    // Test JWT without apikey
    try {
        const noApikeyUrl = new URL('/rest/v1/pixels?limit=1', SUPABASE_URL);
        const noApikeyOptions = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const noApikeyTest = await new Promise((resolve, reject) => {
            const req = https.request(noApikeyUrl, noApikeyOptions, (res) => {
                let responseData = '';
                res.on('data', (chunk) => { responseData += chunk; });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                });
            });
            req.on('error', reject);
            req.end();
        });

        console.log(`  Request without apikey header: Status ${noApikeyTest.statusCode}`);
        
    } catch (error) {
        console.log(`  No-apikey test failed: ${error.message}`);
    }

    // Test data manipulation with different user contexts
    console.log('\n3. Testing data manipulation scenarios...');
    
    // Try to insert with different author values
    const testUsers = ['fake-user-1', 'admin', 'system', '', null];
    
    for (const user of testUsers) {
        try {
            const insertTest = await makeRequest('POST', '/rest/v1/pixels', {
                room: 'security-test-room',
                x: Math.floor(Math.random() * 1000),
                y: Math.floor(Math.random() * 1000),
                color: '#SECURITY',
                author: user,
                timestamp: new Date().toISOString()
            });
            
            if (insertTest.statusCode === 201) {
                console.log(`  ⚠️ INSERT allowed with author: ${user} (Status: ${insertTest.statusCode})`);
            }
        } catch (error) {
            // Expected for some cases
        }
    }

    // Test if we can modify other users' pixels
    console.log('\n4. Testing cross-user data modification...');
    
    try {
        // Get a pixel from another user
        const existingPixels = await makeRequest('GET', '/rest/v1/pixels?limit=5');
        
        if (existingPixels.data && existingPixels.data.length > 0) {
            const testPixel = existingPixels.data[0];
            console.log(`  Testing modification of pixel by author: ${testPixel.author}`);
            
            // Try to modify it
            const modifyTest = await makeRequest('PATCH', 
                `/rest/v1/pixels?x=eq.${testPixel.x}&y=eq.${testPixel.y}&room=eq.${testPixel.room}`, 
                {
                    color: '#HACKED',
                    author: 'security-tester'
                }
            );
            
            console.log(`  Cross-user modification: Status ${modifyTest.statusCode}`);
            if (modifyTest.statusCode === 200 || modifyTest.statusCode === 204) {
                console.log('  🚨CRITICAL: Can modify other users\' data!');
            }
        }
        
    } catch (error) {
        console.log(`  Cross-user test failed: ${error.message}`);
    }

    console.log('\n=== RLS POLICY CHECK COMPLETE ===');
}

checkRLSPolicies().catch(console.error);