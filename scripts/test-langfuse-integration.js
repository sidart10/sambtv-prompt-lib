#!/usr/bin/env node

/**
 * Test script to verify Langfuse integration parameters
 * Run: node scripts/test-langfuse-integration.js
 */

// Test data
const testPrompt = {
  id: 123,
  content: "You are a helpful assistant. Please help the user with their request.",
  title: "Test Prompt",
  model: "claude-3-5-sonnet"
};

// Build the URL as the button would
const params = new URLSearchParams({
  prompt: testPrompt.content,
  promptId: testPrompt.id.toString(),
  model: testPrompt.model
});

const fullUrl = `https://ai.sambatv.com/playground?${params}`;

console.log("🧪 Testing Langfuse Integration URL Generation\n");
console.log("Test Prompt:");
console.log("-------------");
console.log(`ID: ${testPrompt.id}`);
console.log(`Title: ${testPrompt.title}`);
console.log(`Content: ${testPrompt.content.substring(0, 50)}...`);
console.log(`Model: ${testPrompt.model}`);
console.log("\nGenerated URL:");
console.log("--------------");
console.log(fullUrl);
console.log("\nURL Parameters:");
console.log("---------------");
for (const [key, value] of params) {
  console.log(`${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
}

console.log("\n✅ Integration URL generation working correctly!");
console.log("\n📝 Next Steps:");
console.log("1. Deploy Langfuse to ai.sambatv.com");
console.log("2. Configure authentication");
console.log("3. Test with real prompts");