#!/bin/bash

echo "🚀 Solar CRM Product Import Script"
echo "=================================="
echo

# Check if final_products_img.json exists
if [ ! -f "final_products_img.json" ]; then
    echo "❌ Error: final_products_img.json not found in current directory"
    echo "📁 Please place your JSON file in the project root and try again"
    exit 1
fi

echo "✅ Found final_products_img.json"
echo "📊 Preparing to import products to MongoDB..."
echo

# Navigate to backend directory
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found"
    echo "💡 Please run this script from the project root directory"
    exit 1
fi

cd backend

echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

echo "🔄 Starting product import..."
echo "⚠️  This will import products to your MongoDB database"
echo

# Run the import script
npm run import-products

echo
echo "✅ Import process completed!"
echo "🎉 Check the output above for detailed results" 