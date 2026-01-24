import { getDatabase } from '../src/lib/db/index.js';

console.log('Testing database connection...');

const db = getDatabase();

// Test querying the tenants table
const tenants = db.prepare('SELECT * FROM tenants LIMIT 5').all();
console.log('Tenants found:', tenants.length);
console.log('Sample tenant:', tenants[0] ? tenants[0].name : 'None found');

// Test querying the users table
const users = db.prepare('SELECT * FROM users LIMIT 5').all();
console.log('Users found:', users.length);
console.log('Sample user:', users[0] ? users[0].name : 'None found');

// Test querying the deals table
const deals = db.prepare('SELECT * FROM deals LIMIT 5').all();
console.log('Deals found:', deals.length);
console.log('Sample deal:', deals[0] ? deals[0].title : 'None found');

console.log('Database test completed successfully!');