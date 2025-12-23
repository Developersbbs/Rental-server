const API_URL = 'http://localhost:5000/api/rental-products';
const LOGIN_URL = 'http://localhost:5000/api/auth/login';

async function checkRentalProducts() {
    try {
        // Login first
        const loginResponse = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'debug_admin@test.com', password: 'password123' })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed! status: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;

        // Fetch products with token
        const response = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const products = data.rentalProducts;

        console.log(`Found ${products.length} rental products.`);

        const targetProduct = products.find(p => p.name === 'Test Generator API');

        if (targetProduct) {
            console.log('Target Product Found:', JSON.stringify(targetProduct, null, 2));
        } else {
            console.log('Target Product "Test Generator API" NOT found.');
            console.log('Available products:', products.map(p => p.name));
        }
    } catch (error) {
        console.error('Error fetching rental products:', error.message);
    }
}

checkRentalProducts();
