# Husky Pre-commit Hook Setup

## Overview

This project uses Husky to run pre-commit hooks that ensure code quality before commits are made.

## What the Pre-commit Hook Does

1. **Lint-staged**: Runs ESLint with auto-fix and Prettier on staged files
2. **Type Checking**: Runs TypeScript type checking on all packages
3. **Error Handling**: Aborts the commit if any checks fail

## Pre-commit Hook Configuration

The pre-commit hook is located at `.husky/pre-commit` and performs the following checks:

### 1. Lint-staged (ESLint + Prettier)

- Runs `eslint --fix` on staged TypeScript/JavaScript files
- Runs `prettier --write` on staged files
- Automatically fixes formatting issues
- Aborts commit if unfixable lint errors are found

### 2. Type Checking

- Runs `pnpm type-check:all` to check TypeScript types across all packages
- Aborts commit if type errors are found

## Lint-staged Configuration

The lint-staged configuration in `package.json`:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

## Testing the Pre-commit Hook

### Manual Testing

```bash
# Test the pre-commit hook manually
pnpm husky:test

# Test lint-staged only
pnpm lint-staged:test

# Test type checking only
pnpm type-check:all
```

### Commit Testing

The hook runs automatically on every commit. If there are issues:

- Fixable formatting/lint issues will be automatically corrected
- Unfixable lint errors will abort the commit
- Type errors will abort the commit

## Troubleshooting

### Hook Not Running

If the pre-commit hook is not running:

```bash
# Reinstall husky hooks
pnpm husky:install
```

### Permission Issues

If you get permission errors:

```bash
# Make the hook executable
chmod +x .husky/pre-commit
```

### Bypassing Hooks (Not Recommended)

In emergency situations only:

```bash
# Skip pre-commit hooks (NOT RECOMMENDED)
git commit --no-verify -m "emergency commit"
```

## Requirements Satisfied

This implementation satisfies the following requirements:

1. ✅ Pre-commit hook runs automatically when committing
2. ✅ Lint errors abort the commit (unfixable errors)
3. ✅ Type errors abort the commit
4. ✅ Format errors are automatically fixed
5. ✅ Husky is properly configured for consistent checks across all developer environments
