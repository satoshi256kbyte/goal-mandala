#!/bin/bash

# Prisma Schema Validation Script
echo "🔍 Validating Prisma Schema..."

# Set temporary DATABASE_URL for validation
export DATABASE_URL="postgresql://user:password@localhost:5432/temp_db"

# Format schema
echo "📝 Formatting schema..."
npx prisma format

# Validate schema
echo "✅ Validating schema..."
npx prisma validate

# Generate client
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "✨ Schema validation completed!"
