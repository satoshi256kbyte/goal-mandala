#!/bin/bash

echo "🚀 Running E2E Tests Summary"
echo "================================"

# Run basic tests first
echo "📋 Running Basic Tests..."
npx playwright test e2e/basic.spec.ts --reporter=line 2>/dev/null
basic_result=$?

# Run subgoal edit flow tests
echo "📋 Running Subgoal Edit Flow Tests..."
npx playwright test e2e/subgoal-action/subgoal-edit-flow.spec.ts --reporter=line 2>/dev/null | grep -E "(passed|failed)" | tail -1
subgoal_result=$?

# Run action edit flow tests
echo "📋 Running Action Edit Flow Tests..."
npx playwright test e2e/subgoal-action/action-edit-flow.spec.ts --reporter=line 2>/dev/null | grep -E "(passed|failed)" | tail -1
action_result=$?

# Run usability tests
echo "📋 Running Usability Tests..."
npx playwright test e2e/usability/user-flow.spec.ts --reporter=line 2>/dev/null | grep -E "(passed|failed)" | tail -1
usability_result=$?

# Run goal input tests
echo "📋 Running Goal Input Tests..."
npx playwright test e2e/goal-input/goal-input-flow.spec.ts --reporter=line 2>/dev/null | grep -E "(passed|failed)" | tail -1
goal_result=$?

echo ""
echo "📊 Test Results Summary:"
echo "========================"

if [ $basic_result -eq 0 ]; then
    echo "✅ Basic Tests: PASSED"
else
    echo "❌ Basic Tests: FAILED"
fi

echo "📝 Subgoal Edit Flow Tests: Check output above"
echo "📝 Action Edit Flow Tests: Check output above"  
echo "📝 Usability Tests: Check output above"
echo "📝 Goal Input Tests: Check output above"

echo ""
echo "🎯 To run all tests with full output:"
echo "npx playwright test --reporter=line"
