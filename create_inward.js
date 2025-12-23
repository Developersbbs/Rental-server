const API_URL = 'http://localhost:5000/api';

const createInward = async () => {
    try {
        // 1. Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@test.com',
                password: 'admin123'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Logged in, token:', token ? 'Yes' : 'No');

        if (!token) {
            console.error('Login failed:', loginData);
            return;
        }

        // 2. Create Inward
        const inwardData = {
            receivedDate: new Date().toISOString(),
            items: [
                {
                    product: '692052ec015df9a824a8ed1f', // Test Generator API
                    quantity: 2,
                    purchaseCost: 5000,
                    batchNumber: 'BATCH-API-001',
                    purchaseDate: new Date().toISOString(),
                    condition: 'new',
                    notes: 'Created via API Script'
                }
            ],
            notes: 'API Inward Test'
        };

        const createRes = await fetch(`${API_URL}/rental-inwards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inwardData)
        });

        const createData = await createRes.json();
        console.log('Inward Created Response:', JSON.stringify(createData, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
};

createInward();
