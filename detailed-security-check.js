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

async function detailedSecurityCheck() {
    console.log('=== DETAILED SECURITY ANALYSIS ===\n');

    // Test various data access patterns
    console.log('1. Testing data access patterns...');
    
    try {
        // Test COUNT query
        const countTest = await makeRequest('GET', '/rest/v1/pixels?select=count');
        console.log(`  COUNT query: Status ${countTest.statusCode}`);
        if (countTest.data) {
            console.log(`  Total records accessible: ${JSON.stringify(countTest.data)}`);
        }
    } catch (error) {
        console.log(`  COUNT test failed: ${error.message}`);
    }

    // Test mass data extraction
    try {
        const massData = await makeRequest('GET', '/rest/v1/pixels?limit=1000');
        console.log(`  Mass data extraction: Status ${massData.statusCode}`);
        if (massData.data) {
            console.log(`  Retrieved ${massData.data.length} records in single request`);
            console.log('  🚨 SECURITY CONCERN: Large data extraction possible');
        }
    } catch (error) {
        console.log(`  Mass data extraction failed: ${error.message}`);
    }

    // Test different query operators
    console.log('\n2. Testing query operators and potential bypasses...');
    
    const operators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is'];
    
    for (const op of operators) {
        try {
            const opTest = await makeRequest('GET', `/rest/v1/pixels?x=${op}.1`);
            if (opTest.statusCode === 200) {
                console.log(`  ✓ Operator '${op}' allowed`);
            }
        } catch (error) {
            console.log(`  ✗ Operator '${op}' failed`);
        }
    }

    // Test UPDATE with different conditions
    console.log('\n3. Testing UPDATE vulnerabilities...');
    
    try {
        // Try to update all records
        const updateAll = await makeRequest('PATCH', '/rest/v1/pixels', {
            color: '#SECURITY_TEST'
        });
        console.log(`  UPDATE all records: Status ${updateAll.statusCode}`);
        if (updateAll.statusCode === 200 || updateAll.statusCode === 204) {
            console.log('  🚨 CRITICAL: Can update all records without filter!');
        }
    } catch (error) {
        console.log(`  UPDATE all test failed: ${error.message}`);
    }

    // Test DELETE with different conditions
    console.log('\n4. Testing DELETE vulnerabilities...');
    
    try {
        // Try to delete with broad condition
        const deleteBroad = await makeRequest('DELETE', '/rest/v1/pixels?x=gte.0');
        console.log(`  DELETE with broad condition: Status ${deleteBroad.statusCode}`);
        if (deleteBroad.statusCode === 200 || deleteBroad.statusCode === 204) {
            console.log('  🚨 CRITICAL: Can delete with broad conditions!');
        }
    } catch (error) {
        console.log(`  DELETE broad test failed: ${error.message}`);
    }

    // Check for schema information
    console.log('\n5. Testing schema information disclosure...');
    
    try {
        const schemaTest = await makeRequest('OPTIONS', '/rest/v1/pixels');
        console.log(`  OPTIONS request: Status ${schemaTest.statusCode}`);
        if (schemaTest.headers.allow) {
            console.log(`  Allowed methods: ${schemaTest.headers.allow}`);
        }
    } catch (error) {
        console.log(`  Schema test failed: ${error.message}`);
    }

    // Test for other tables by common naming patterns
    console.log('\n6. Testing for additional accessible tables...');
    
    const possibleTables = [
        'pixel', 'pixel_data', 'pixel_history', 'rooms', 'room', 
        'users', 'user', 'sessions', 'session', 'auth_users',
        'profiles', 'profile', 'settings', 'config', 'logs'
    ];
    
    for (const table of possibleTables) {
        try {
            const tableTest = await makeRequest('GET', `/rest/v1/${table}?limit=1`);
            if (tableTest.statusCode === 200) {
                console.log(`  ⚠️ Table '${table}' accessible: Status ${tableTest.statusCode}`);
                if (tableTest.data && tableTest.data.length > 0) {
                    console.log(`    Sample structure: ${Object.keys(tableTest.data[0]).join(', ')}`);
                }
            }
        } catch (error) {
            // Continue silently
        }
    }

    // Test rate limiting
    console.log('\n7. Testing rate limiting...');
    
    const startTime = Date.now();
    let requestCount = 0;
    
    try {
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(makeRequest('GET', '/rest/v1/pixels?limit=1'));
            requestCount++;
        }
        
        await Promise.all(promises);
        const endTime = Date.now();
        console.log(`  Made ${requestCount} requests in ${endTime - startTime}ms`);
        console.log('  ⚠️ No apparent rate limiting detected');
        
    } catch (error) {
        console.log(`  Rate limiting test failed: ${error.message}`);
    }

    // Check response headers for security information
    console.log('\n8. Analyzing security headers...');
    
    try {
        const headerTest = await makeRequest('GET', '/rest/v1/pixels?limit=1');
        const securityHeaders = [
            'content-security-policy',
            'x-frame-options', 
            'x-content-type-options',
            'strict-transport-security',
            'x-xss-protection',
            'referrer-policy'
        ];
        
        console.log('  Security headers present:');
        securityHeaders.forEach(header => {
            if (headerTest.headers[header]) {
                console.log(`    ✓ ${header}: ${headerTest.headers[header]}`);
            } else {
                console.log(`    ✗ ${header}: missing`);
            }
        });
        
    } catch (error) {
        console.log(`  Header analysis failed: ${error.message}`);
    }

    console.log('\n=== DETAILED ANALYSIS COMPLETE ===');
}

detailedSecurityCheck().catch(console.error);