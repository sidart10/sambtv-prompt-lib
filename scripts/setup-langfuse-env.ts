#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getLangfuseEnvConfig, validateApiKeys } from '../lib/langfuse/model-config';

/**
 * Setup script for Langfuse environment configuration
 * This prepares the environment for when the Langfuse fork is ready
 */

const LANGFUSE_ENV_TEMPLATE = `# Langfuse Configuration
# This file is generated from the main app's configuration

# Authentication (shared with main app)
NEXTAUTH_URL={{NEXTAUTH_URL}}
NEXTAUTH_SECRET={{NEXTAUTH_SECRET}}
GOOGLE_CLIENT_ID={{GOOGLE_CLIENT_ID}}
GOOGLE_CLIENT_SECRET={{GOOGLE_CLIENT_SECRET}}

# Model API Keys (shared with main app)
ANTHROPIC_API_KEY={{ANTHROPIC_API_KEY}}
GOOGLE_GEMINI_API_KEY={{GOOGLE_GEMINI_API_KEY}}
OPENROUTER_API_KEY={{OPENROUTER_API_KEY}}

# Langfuse Specific
DATABASE_URL={{LANGFUSE_DATABASE_URL}}
LANGFUSE_BASE_URL={{LANGFUSE_BASE_URL}}
NEXT_PUBLIC_LANGFUSE_ENABLED={{NEXT_PUBLIC_LANGFUSE_ENABLED}}

# Telemetry
TELEMETRY_ENABLED=false
LANGFUSE_ENABLE_EXPERIMENTAL_FEATURES=false

# Security
SALT=sambatv-ai-platform-salt
ENCRYPTION_KEY={{ENCRYPTION_KEY}}

# Email (optional, for notifications)
EMAIL_FROM_ADDRESS=noreply@samba.tv
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

# S3 (optional, for file storage)
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_REGION=

# Feature Flags
LANGFUSE_ENABLE_SSO=false
LANGFUSE_AUTO_CREATE_PROJECTS=true
LANGFUSE_DEFAULT_PROJECT_ROLE=MEMBER
`;

async function setupLangfuseEnv() {
  console.log('🚀 Setting up Langfuse environment configuration...\n');

  // Validate API keys
  const { valid, missing } = validateApiKeys();
  if (!valid) {
    console.warn('⚠️  Warning: Missing API keys:');
    missing.forEach(key => console.warn(`   - ${key}`));
    console.warn('\nMake sure to add these to your .env.local file\n');
  }

  // Get current configuration
  const config = getLangfuseEnvConfig();
  
  // Generate encryption key if not present
  if (!config.ENCRYPTION_KEY) {
    config.ENCRYPTION_KEY = generateEncryptionKey();
    console.log('🔐 Generated new encryption key');
  }

  // Create Langfuse env content
  let envContent = LANGFUSE_ENV_TEMPLATE;
  Object.entries(config).forEach(([key, value]) => {
    envContent = envContent.replace(`{{${key}}}`, value || '');
  });

  // Prepare directory structure
  const langfusePath = join(process.cwd(), 'langfuse-fork');
  const envPath = join(langfusePath, '.env.local');
  
  console.log('📄 Configuration prepared for Langfuse fork\n');
  console.log('When the Langfuse fork is ready:');
  console.log('1. Clone Langfuse to ./langfuse-fork/');
  console.log('2. Copy the following to ./langfuse-fork/.env.local:\n');
  console.log('─'.repeat(60));
  console.log(envContent);
  console.log('─'.repeat(60));
  
  // Save to a template file
  const templatePath = join(process.cwd(), 'langfuse.env.template');
  writeFileSync(templatePath, envContent);
  console.log(`\n✅ Template saved to: ${templatePath}`);

  // Create model router configuration
  await createModelRouterConfig();
  
  console.log('\n🎉 Langfuse environment preparation complete!');
}

function generateEncryptionKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function createModelRouterConfig() {
  const routerConfig = `// Model Router Configuration for Langfuse
// This file configures how Langfuse routes requests to different model providers

import { MODEL_PROVIDERS } from '@/lib/langfuse/model-config';

export const modelRouter = {
  // Route patterns for each provider
  routes: {
    'claude-': 'anthropic',
    'gemini-': 'google',
    'gpt-': 'openrouter',
    'llama-': 'openrouter',
    'qwen-': 'openrouter'
  },
  
  // Provider-specific configurations
  providers: {
    anthropic: {
      endpoint: 'https://api.anthropic.com/v1/messages',
      headers: (apiKey: string) => ({
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      })
    },
    google: {
      endpoint: (model: string) => 
        \`https://generativelanguage.googleapis.com/v1/models/\${model}:generateContent\`,
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json'
      }),
      queryParams: (apiKey: string) => ({
        key: apiKey
      })
    },
    openrouter: {
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      headers: (apiKey: string) => ({
        'Authorization': \`Bearer \${apiKey}\`,
        'HTTP-Referer': 'https://ai.sambatv.com',
        'X-Title': 'SambaTV AI Platform',
        'Content-Type': 'application/json'
      })
    }
  },
  
  // Get provider for a model
  getProvider(modelId: string): string {
    for (const [prefix, provider] of Object.entries(this.routes)) {
      if (modelId.startsWith(prefix)) {
        return provider;
      }
    }
    // Check full model list
    for (const provider of MODEL_PROVIDERS) {
      if (provider.models.some(m => m.id === modelId)) {
        return provider.id;
      }
    }
    throw new Error(\`Unknown model: \${modelId}\`);
  }
};
`;

  const configPath = join(process.cwd(), 'lib/langfuse/model-router.ts');
  writeFileSync(configPath, routerConfig);
  console.log(`\n📦 Model router config created at: ${configPath}`);
}

// Run the setup
setupLangfuseEnv().catch(console.error);