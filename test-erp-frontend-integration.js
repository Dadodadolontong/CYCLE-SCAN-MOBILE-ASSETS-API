// Test script for ERP Frontend Integration
// This script tests the ERP endpoints that the frontend will use

const API_BASE_URL = 'http://localhost:8200';

async function testERPIntegration() {
  console.log('🧪 Testing ERP Frontend Integration...\n');

  // Test 1: Test Oracle Connection
  console.log('1. Testing Oracle Connection...');
  try {
    const response = await fetch(`${API_BASE_URL}/erp/test-connection`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: You'll need to add a valid token here for authenticated endpoints
        // 'Authorization': 'Bearer YOUR_TOKEN'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connection test response:', data);
    } else {
      console.log('❌ Connection test failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Connection test error:', error.message);
  }

  // Test 2: Get Sync Config
  console.log('\n2. Testing Sync Config...');
  try {
    const response = await fetch(`${API_BASE_URL}/erp/sync-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sync config response:', data);
    } else {
      console.log('❌ Sync config failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Sync config error:', error.message);
  }

  // Test 3: Get Sync History
  console.log('\n3. Testing Sync History...');
  try {
    const response = await fetch(`${API_BASE_URL}/erp/sync-history?limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sync history response:', data);
    } else {
      console.log('❌ Sync history failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Sync history error:', error.message);
  }

  console.log('\n📝 Note: For full testing, you need to:');
  console.log('1. Start the FastAPI backend server');
  console.log('2. Add a valid authentication token to the requests');
  console.log('3. Ensure Oracle database is configured and accessible');
  console.log('4. Test the sync endpoints (POST /erp/sync-assets, POST /erp/sync-locations)');
}

// Run the test
testERPIntegration().catch(console.error); 