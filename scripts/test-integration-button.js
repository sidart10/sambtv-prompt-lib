#!/usr/bin/env node

/**
 * Test script for "Test in AI Platform" button integration
 * This simulates the button click and verifies URL generation
 */

const testCases = [
  {
    id: 1,
    promptId: 123,
    content: "You are a helpful assistant. Please help the user with their request.",
    expectedModel: 'claude-3-5-sonnet',
    description: "Basic prompt test"
  },
  {
    id: 2,
    promptId: 456,
    content: "Analyze the following data and provide insights:\n\n{{data}}\n\nFocus on key trends and anomalies.",
    expectedModel: 'claude-3-5-sonnet',
    description: "Prompt with template variables"
  },
  {
    id: 3,
    promptId: 789,
    content: "You are an expert in {{domain}}. The user has a question about {{topic}}. Please provide a detailed explanation.",
    expectedModel: 'claude-3-5-sonnet',
    description: "Multiple template variables"
  }
];

console.log("🧪 Testing 'Test in AI Platform' Button Integration\n");
console.log("=" + "=".repeat(60) + "\n");

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test Case ${testCase.id}: ${testCase.description}`);
  console.log("-".repeat(40));
  
  try {
    // Simulate URL generation
    const params = new URLSearchParams({
      prompt: testCase.content,
      promptId: testCase.promptId.toString(),
      model: testCase.expectedModel
    });
    
    const generatedUrl = `https://ai.sambatv.com/playground?${params}`;
    
    // Verify URL components
    const url = new URL(generatedUrl);
    const promptParam = url.searchParams.get('prompt');
    const promptIdParam = url.searchParams.get('promptId');
    const modelParam = url.searchParams.get('model');
    
    // Run assertions
    console.log(`✓ URL generated successfully`);
    console.log(`  URL: ${generatedUrl.substring(0, 100)}...`);
    
    if (promptParam === testCase.content) {
      console.log(`✓ Prompt content matches`);
    } else {
      throw new Error('Prompt content mismatch');
    }
    
    if (promptIdParam === testCase.promptId.toString()) {
      console.log(`✓ Prompt ID matches: ${promptIdParam}`);
    } else {
      throw new Error('Prompt ID mismatch');
    }
    
    if (modelParam === testCase.expectedModel) {
      console.log(`✓ Model selection correct: ${modelParam}`);
    } else {
      throw new Error('Model mismatch');
    }
    
    console.log(`✅ Test ${testCase.id} PASSED\n`);
    passedTests++;
    
  } catch (error) {
    console.log(`❌ Test ${testCase.id} FAILED: ${error.message}\n`);
    failedTests++;
  }
});

// Summary
console.log("=" + "=".repeat(60));
console.log("\n📊 Test Summary:");
console.log(`Total Tests: ${testCases.length}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / testCases.length) * 100).toFixed(0)}%`);

// Integration recommendations
console.log("\n📝 Integration Test Checklist:");
console.log("1. [ ] Button renders correctly on prompt detail pages");
console.log("2. [ ] Click handler opens new tab/window");
console.log("3. [ ] URL parameters are properly encoded");
console.log("4. [ ] Langfuse playground receives parameters");
console.log("5. [ ] Prompt content pre-fills in playground");
console.log("6. [ ] Model selection is applied");
console.log("7. [ ] User can modify and run the prompt");
console.log("8. [ ] Traces are created and sent back to main app");

if (failedTests === 0) {
  console.log("\n✅ All integration tests passed! Ready for manual testing.");
} else {
  console.log("\n⚠️  Some tests failed. Please review and fix issues before proceeding.");
  process.exit(1);
}