#!/bin/bash

# デバッグ用テストスクリプト

echo "=== Debug Test Script ==="
echo "Current directory: $(pwd)"
echo "Package: $1"

cd "$(dirname "$0")/../.."
echo "Changed to: $(pwd)"

PACKAGE=${1:-"shared"}
echo "Testing package: $PACKAGE"

if [ -d "packages/$PACKAGE" ]; then
    echo "Package directory exists: packages/$PACKAGE"
    cd "packages/$PACKAGE"
    echo "Changed to package directory: $(pwd)"
    
    echo "Running Jest test..."
    npx jest --passWithNoTests --maxWorkers=1 --forceExit --testTimeout=30000 --verbose
    echo "Jest exit code: $?"
else
    echo "Package directory not found: packages/$PACKAGE"
    exit 1
fi
