#!/bin/bash

echo "Initializing CRM database..."

# Initialize database
curl -X POST http://localhost:3000/api/init \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "Database initialization complete!"
echo ""
echo "You can now visit http://localhost:3000/login"
echo "Login with: admin@mc.com / demo123"
echo ""
echo "Other test users:"
echo "roberto@mc.com / demo123 (Manager)"
echo "ana@mc.com / demo123 (Sales Rep)"
echo "joao@mc.com / demo123 (Sales Rep)"
echo "suporte@mc.com / demo123 (Support)"