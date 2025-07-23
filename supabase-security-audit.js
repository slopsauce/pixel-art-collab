const https = require('https');
const { URL } = require('url');

// Supabase connection details
const SUPABASE_URL = 'https://xvpaowbxdzoucvlkhnxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cGFvd2J4ZHpvdWN2bGtobnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNjg2NDcsImV4cCI6MjA2ODg0NDY0N30.mpoZFWw3IkNd-8w7j7oMyTl9qcSTe9zwiSv19RO_IUE';

// Helper function to make HTTP requests
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

async function runSecurityAudit() {
    console.log('=== SUPABASE SECURITY AUDIT ===\n');
    
    // 1. Test basic connection
    console.log('1. Testing basic connection...');
    try {
        const healthCheck = await makeRequest('GET', '/rest/v1/');
        console.log(`✓ Connection successful (Status: ${healthCheck.statusCode})`);
        console.log(`  Server: ${healthCheck.headers.server}`);
        console.log(`  Content-Type: ${healthCheck.headers['content-type']}`);
    } catch (error) {
        console.log(`✗ Connection failed: ${error.message}`);
        return;
    }

    // 2. Test pixels table structure and access
    console.log('\n2. Testing pixels table access...');
    try {
        const pixelsTest = await makeRequest('GET', '/rest/v1/pixels?limit=1');
        console.log(`✓ Pixels table accessible (Status: ${pixelsTest.statusCode})`);
        
        if (pixelsTest.data && pixelsTest.data.length > 0) {
            console.log('  Sample record structure:');
            Object.keys(pixelsTest.data[0]).forEach(key => {
                console.log(`    - ${key}: ${typeof pixelsTest.data[0][key]} (${pixelsTest.data[0][key]})`);
            });
        } else {
            console.log('  Table appears empty or no read access');
        }
    } catch (error) {
        console.log(`✗ Pixels table access failed: ${error.message}`);
    }

    // 3. Test for RLS policies by attempting operations
    console.log('\n3. Testing Row Level Security policies...');
    
    // Test SELECT with various filters
    try {
        const selectAll = await makeRequest('GET', '/rest/v1/pixels');
        console.log(`  SELECT all records: Status ${selectAll.statusCode}, Records: ${selectAll.data ? selectAll.data.length : 'unknown'}`);
    } catch (error) {
        console.log(`  SELECT all failed: ${error.message}`);
    }

    // Test INSERT
    console.log('\n4. Testing INSERT permissions...');
    try {
        const testInsert = await makeRequest('POST', '/rest/v1/pixels', {
            x: 999,
            y: 999,
            color: '#FF0000',
            user_id: 'security-test-user'
        });
        console.log(`  INSERT test: Status ${testInsert.statusCode}`);
        if (testInsert.statusCode === 201) {
            console.log('  ⚠️ WARNING: INSERT allowed with anon key!');
        }
    } catch (error) {
        console.log(`  INSERT test failed: ${error.message}`);
    }

    // Test UPDATE
    console.log('\n5. Testing UPDATE permissions...');
    try {
        const testUpdate = await makeRequest('PATCH', '/rest/v1/pixels?x=eq.999&y=eq.999', {
            color: '#00FF00'
        });
        console.log(`  UPDATE test: Status ${testUpdate.statusCode}`);
        if (testUpdate.statusCode === 200 || testUpdate.statusCode === 204) {
            console.log('  ⚠️ WARNING: UPDATE allowed with anon key!');
        }
    } catch (error) {
        console.log(`  UPDATE test failed: ${error.message}`);
    }

    // Test DELETE
    console.log('\n6. Testing DELETE permissions...');
    try {
        const testDelete = await makeRequest('DELETE', '/rest/v1/pixels?x=eq.999&y=eq.999');
        console.log(`  DELETE test: Status ${testDelete.statusCode}`);
        if (testDelete.statusCode === 200 || testDelete.statusCode === 204) {
            console.log('  🚨 CRITICAL: DELETE allowed with anon key!');
        } else {
            console.log('  ✓ DELETE properly restricted');
        }
    } catch (error) {
        console.log(`  DELETE test failed: ${error.message}`);
    }

    // 7. Test for SQL injection vulnerabilities
    console.log('\n7. Testing for SQL injection vulnerabilities...');
    try {
        const sqlInjectionTest = await makeRequest('GET', `/rest/v1/pixels?x=eq.1';DROP TABLE pixels;--`);
        console.log(`  SQL injection test: Status ${sqlInjectionTest.statusCode}`);
        if (sqlInjectionTest.statusCode === 200) {
            console.log('  ✓ Query executed but likely filtered by PostgREST');
        }
    } catch (error) {
        console.log(`  SQL injection test failed: ${error.message}`);
    }

    // 8. Test data exposure
    console.log('\n8. Checking data exposure...');
    try {
        const dataCheck = await makeRequest('GET', '/rest/v1/pixels?limit=5');
        if (dataCheck.data && dataCheck.data.length > 0) {
            console.log(`  Found ${dataCheck.data.length} records accessible`);
            console.log('  Sample data:');
            dataCheck.data.forEach((record, index) => {
                console.log(`    Record ${index + 1}:`, JSON.stringify(record, null, 2));
            });
        }
    } catch (error) {
        console.log(`  Data exposure check failed: ${error.message}`);
    }

    // 9. Test metadata access
    console.log('\n9. Testing metadata access...');
    try {
        const metadataTest = await makeRequest('GET', '/rest/v1/?select=*');
        console.log(`  Metadata access: Status ${metadataTest.statusCode}`);
    } catch (error) {
        console.log(`  Metadata test failed: ${error.message}`);
    }

    // 10. Check for other tables
    console.log('\n10. Probing for other accessible tables...');
    const commonTables = ['users', 'profiles', 'auth', 'admin', 'config', 'settings'];
    
    for (const table of commonTables) {
        try {
            const tableTest = await makeRequest('GET', `/rest/v1/${table}?limit=1`);
            if (tableTest.statusCode === 200) {
                console.log(`  ⚠️ Table '${table}' is accessible (Status: ${tableTest.statusCode})`);
            }
        } catch (error) {
            // Silently ignore errors for non-existent tables
        }
    }

    console.log('\n=== AUDIT COMPLETE ===');
}

// Run the audit
runSecurityAudit().catch(console.error);