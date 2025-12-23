const API_URL = 'http://localhost:5000/api';

const createProduct = async () => {
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
        console.log('Login Response:', loginData);
        const token = loginData.token;
        console.log('Logged in, token:', token ? 'Yes' : 'No');

        // 2. Create Product
        const productData = {
            name: 'Test Generator API',
            description: 'Created via API',
            category: '69204e0685910002b3eb829b', // Equipment
            rentalPrice: {
                hourly: 50,
                daily: 300
            },
            minRentalHours: 4,
            quantity: 0, // Initial quantity
            isRental: true
        };

        const createRes = await fetch(`${API_URL}/rental-products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        const createData = await createRes.json();
        console.log('Product Created:', createData);
    } catch (error) {
        console.error('Error:', error);
    }
};

createProduct();
