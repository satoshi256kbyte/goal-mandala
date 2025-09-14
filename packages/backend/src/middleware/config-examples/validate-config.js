#!/usr/bin/env node

/**
 * JWT認証ミドルウェア設定検証スクリプト
 *
 * 使用方法:
 *   node validate-config.js
 *   node validate-config.js --env production
 *   node validate-config.js --file .env.custom
 */

const fs = require('fs');
const path = require('path');

// コマンドライン引数の解析
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='))?.split('=')[1];
const fileArg = args.find(arg => arg.startsWith('--file='))?.split('=')[1];

// 環境変数ファイルの決定
let envFile;
if (fileArg) {
  envFile = fileArg;
} else if (envArg) {
  envFile = `.env.${envArg}`;
} else {
  envFile = '.env';
}

console.log(`🔍 Validating configuration from: ${envFile}`);

// 環境変数ファイルの読み込み
function loadEnvFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Environment file not found: ${fullPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const env = {};

    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return env;
  } catch (error) {
    console.error(`❌ Error reading environment file: ${error.message}`);
    process.exit(1);
  }
}

// 検証ルール
const validationRules = {
  // 必須環境変数
  required: [
    'NODE_ENV',
    'AWS_REGION',
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
    'DATABASE_URL',
    'JWT_SECRET',
  ],

  // 条件付き必須環境変数
  conditionalRequired: {
    ENABLE_MOCK_AUTH: {
      when: env => env.ENABLE_MOCK_AUTH === 'true',
      requires: ['MOCK_USER_ID', 'MOCK_USER_EMAIL', 'MOCK_USER_NAME'],
    },
  },

  // 形式検証
  format: {
    NODE_ENV: {
      pattern: /^(development|test|staging|production)$/,
      message: 'NODE_ENV must be one of: development, test, staging, production',
    },
    COGNITO_USER_POOL_ID: {
      pattern: /^[a-z0-9-]+_[a-zA-Z0-9]+$/,
      message: 'COGNITO_USER_POOL_ID must match format: region_poolId',
    },
    DATABASE_URL: {
      pattern: /^postgresql:\/\/.+/,
      message: 'DATABASE_URL must be a valid PostgreSQL connection string',
    },
    MOCK_USER_EMAIL: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'MOCK_USER_EMAIL must be a valid email address',
    },
    JWT_CACHE_TTL: {
      pattern: /^\d+$/,
      message: 'JWT_CACHE_TTL must be a positive integer',
    },
    LOG_LEVEL: {
      pattern: /^(DEBUG|INFO|WARN|ERROR)$/,
      message: 'LOG_LEVEL must be one of: DEBUG, INFO, WARN, ERROR',
    },
  },

  // 値の範囲検証
  range: {
    JWT_CACHE_TTL: {
      min: 60,
      max: 86400,
      message: 'JWT_CACHE_TTL should be between 60 (1 minute) and 86400 (24 hours) seconds',
    },
  },

  // セキュリティ検証
  security: {
    JWT_SECRET: {
      minLength: 32,
      message: 'JWT_SECRET should be at least 32 characters long for security',
    },
    ENABLE_MOCK_AUTH: {
      productionValue: 'false',
      message: 'ENABLE_MOCK_AUTH must be false in production environment',
    },
  },
};

// 検証実行
function validateConfiguration(env) {
  const errors = [];
  const warnings = [];
  const info = [];

  console.log('\n📋 Configuration Validation Report');
  console.log('=====================================\n');

  // 必須環境変数の検証
  console.log('🔍 Checking required environment variables...');
  validationRules.required.forEach(key => {
    if (!env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    } else {
      info.push(`✓ ${key} is set`);
    }
  });

  // 条件付き必須環境変数の検証
  console.log('🔍 Checking conditional requirements...');
  Object.entries(validationRules.conditionalRequired).forEach(([key, rule]) => {
    if (rule.when(env)) {
      rule.requires.forEach(requiredKey => {
        if (!env[requiredKey]) {
          errors.push(
            `Missing required environment variable: ${requiredKey} (required when ${key} is set)`
          );
        } else {
          info.push(`✓ ${requiredKey} is set (conditional)`);
        }
      });
    }
  });

  // 形式検証
  console.log('🔍 Checking format validation...');
  Object.entries(validationRules.format).forEach(([key, rule]) => {
    if (env[key] && !rule.pattern.test(env[key])) {
      errors.push(`Invalid format for ${key}: ${rule.message}`);
    } else if (env[key]) {
      info.push(`✓ ${key} format is valid`);
    }
  });

  // 範囲検証
  console.log('🔍 Checking value ranges...');
  Object.entries(validationRules.range).forEach(([key, rule]) => {
    if (env[key]) {
      const value = parseInt(env[key], 10);
      if (isNaN(value) || value < rule.min || value > rule.max) {
        warnings.push(`${key} value (${env[key]}) is outside recommended range: ${rule.message}`);
      } else {
        info.push(`✓ ${key} value is within recommended range`);
      }
    }
  });

  // セキュリティ検証
  console.log('🔍 Checking security settings...');
  Object.entries(validationRules.security).forEach(([key, rule]) => {
    if (env[key]) {
      if (rule.minLength && env[key].length < rule.minLength) {
        warnings.push(`Security warning for ${key}: ${rule.message}`);
      } else if (
        rule.productionValue &&
        env.NODE_ENV === 'production' &&
        env[key] !== rule.productionValue
      ) {
        errors.push(`Security error for ${key}: ${rule.message}`);
      } else {
        info.push(`✓ ${key} security check passed`);
      }
    }
  });

  // 環境固有の検証
  console.log('🔍 Checking environment-specific settings...');
  if (env.NODE_ENV === 'production') {
    // 本番環境固有の検証
    if (env.LOG_LEVEL === 'DEBUG') {
      warnings.push('LOG_LEVEL=DEBUG is not recommended for production environment');
    }
    if (env.ENABLE_SECURITY_AUDIT !== 'true') {
      warnings.push('ENABLE_SECURITY_AUDIT should be true in production environment');
    }
    if (env.JWT_SECRET && env.JWT_SECRET.includes('development')) {
      errors.push('JWT_SECRET appears to contain development-related text in production');
    }
  } else if (env.NODE_ENV === 'development') {
    // 開発環境固有の検証
    if (env.ENABLE_MOCK_AUTH !== 'true') {
      info.push('Consider enabling ENABLE_MOCK_AUTH=true for development environment');
    }
    if (env.LOG_LEVEL !== 'DEBUG') {
      info.push('Consider setting LOG_LEVEL=DEBUG for development environment');
    }
  }

  // 結果の表示
  console.log('\n📊 Validation Results');
  console.log('=====================\n');

  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach(error => console.log(`   • ${error}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach(warning => console.log(`   • ${warning}`));
    console.log('');
  }

  if (info.length > 0 && process.env.VERBOSE === 'true') {
    console.log('ℹ️  INFO:');
    info.forEach(infoItem => console.log(`   • ${infoItem}`));
    console.log('');
  }

  // サマリー
  console.log('📈 SUMMARY:');
  console.log(
    `   • Total checks: ${validationRules.required.length + Object.keys(validationRules.format).length + Object.keys(validationRules.security).length}`
  );
  console.log(`   • Errors: ${errors.length}`);
  console.log(`   • Warnings: ${warnings.length}`);
  console.log(`   • Environment: ${env.NODE_ENV || 'unknown'}`);

  if (errors.length === 0) {
    console.log('\n✅ Configuration validation passed!');
    if (warnings.length > 0) {
      console.log('⚠️  Please review the warnings above.');
    }
    return true;
  } else {
    console.log('\n❌ Configuration validation failed!');
    console.log('Please fix the errors above before proceeding.');
    return false;
  }
}

// 設定推奨事項の表示
function showRecommendations(env) {
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('===================\n');

  const recommendations = [];

  if (env.NODE_ENV === 'production') {
    recommendations.push('Use AWS Secrets Manager for sensitive values like JWT_SECRET');
    recommendations.push('Enable security audit logging with ENABLE_SECURITY_AUDIT=true');
    recommendations.push('Set LOG_LEVEL to WARN or ERROR for production');
    recommendations.push('Enable rate limiting and CSRF protection');
  } else if (env.NODE_ENV === 'development') {
    recommendations.push('Enable mock authentication with ENABLE_MOCK_AUTH=true');
    recommendations.push('Set LOG_LEVEL to DEBUG for detailed logging');
    recommendations.push('Use shorter cache TTL for faster development iteration');
  }

  if (!env.JWT_SECRET_ARN && env.NODE_ENV === 'production') {
    recommendations.push('Consider using JWT_SECRET_ARN instead of JWT_SECRET for better security');
  }

  if (!env.ENABLE_METRICS) {
    recommendations.push('Enable metrics collection with ENABLE_METRICS=true');
  }

  recommendations.forEach(rec => console.log(`   • ${rec}`));
}

// メイン実行
function main() {
  try {
    const env = loadEnvFile(envFile);
    const isValid = validateConfiguration(env);

    if (process.env.SHOW_RECOMMENDATIONS !== 'false') {
      showRecommendations(env);
    }

    console.log('\n🔗 For more information, see:');
    console.log('   • Environment setup guide: auth-environment-example.md');
    console.log('   • Troubleshooting guide: auth-troubleshooting-guide.md');
    console.log('   • Usage guide: auth-usage-guide.md');

    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// ヘルプ表示
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
JWT Authentication Middleware Configuration Validator

Usage:
  node validate-config.js [options]

Options:
  --env=<environment>     Validate specific environment file (.env.<environment>)
  --file=<path>          Validate specific file path
  --help, -h             Show this help message

Environment Variables:
  VERBOSE=true           Show detailed validation info
  SHOW_RECOMMENDATIONS=false  Hide recommendations

Examples:
  node validate-config.js                    # Validate .env
  node validate-config.js --env=production   # Validate .env.production
  node validate-config.js --file=.env.custom # Validate custom file
  VERBOSE=true node validate-config.js       # Show detailed info
`);
  process.exit(0);
}

main();
