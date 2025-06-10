# SambaTV AI Platform Integration User Guide

## Overview

The SambaTV Prompt Library now integrates seamlessly with the SambaTV AI Platform (powered by Langfuse), enabling you to test, evaluate, and optimize your prompts with advanced LLM capabilities.

## Features

### 1. Test in AI Platform Button

Every prompt in the library now includes a **"Test in AI Platform"** button that allows you to:
- Instantly open your prompt in the AI Platform playground
- Test with different AI models (Claude, GPT-4, Gemini, etc.)
- Run evaluations and experiments
- Track performance metrics

### 2. Real-time Analytics Display

Prompts that have been tested show live analytics including:
- **Total Cost**: How much the prompt has cost to run
- **Average Quality**: Evaluation scores from testing
- **Response Time**: Average latency in milliseconds
- **Error Rate**: Reliability metrics

## Getting Started

### Step 1: Find a Prompt

1. Navigate to the SambaTV Prompt Library
2. Browse or search for a prompt you want to test
3. Click on the prompt to view its details

### Step 2: Test in AI Platform

1. On the prompt detail page, locate the **"Test in AI Platform"** button
2. Click the button - this will open the AI Platform in a new tab
3. The prompt will be pre-filled in the playground
4. The default model (Claude 3.5 Sonnet) will be selected

### Step 3: Run Tests and Evaluations

In the AI Platform:
1. Modify the prompt if needed
2. Add test inputs or variables
3. Select different models to compare
4. Run the prompt and see results
5. Add evaluation scores (quality, accuracy, etc.)

### Step 4: View Analytics

Back in the Prompt Library:
1. Refresh the prompt detail page
2. The **AI Platform Analytics** card will appear
3. View aggregated metrics from all test runs
4. See insights and trends

## Understanding the Analytics

### Metrics Explained

- **Total Cost**: Cumulative cost of all test runs
- **Avg Quality**: Average evaluation score (0-1 scale)
- **Avg Latency**: Average response time across all runs
- **Error Rate**: Percentage of failed runs

### Insights

The system provides automatic insights:
- Cost trends (increasing/decreasing/stable)
- Quality improvements over time
- Performance recommendations
- Reliability alerts

## Best Practices

### 1. Iterative Testing
- Test prompts with multiple inputs
- Try different model variants
- Compare performance across models

### 2. Evaluation Scoring
- Always add quality scores after testing
- Use consistent scoring criteria
- Document what each score represents

### 3. Cost Optimization
- Monitor cost trends regularly
- Test cheaper models if quality is acceptable
- Optimize prompt length when possible

### 4. Performance Monitoring
- Watch for latency spikes
- Track error rates over time
- Set up alerts for critical prompts

## Troubleshooting

### Button Not Working?
- Ensure you're logged in with your SambaTV account
- Check if pop-ups are blocked in your browser
- Try refreshing the page

### No Analytics Showing?
- Analytics appear after running tests in AI Platform
- Data syncs every 30 seconds
- Ensure evaluations include promptId metadata

### Authentication Issues?
- Use the same Google account for both systems
- Must be a @samba.tv email address
- Contact IT if access issues persist

## Advanced Features

### URL Parameters

When clicking "Test in AI Platform", these parameters are passed:
- `prompt`: The prompt content (URL encoded)
- `promptId`: Unique identifier for tracking
- `model`: Default model selection

### API Integration

Developers can access analytics programmatically:
```javascript
// Fetch analytics for a prompt
const response = await fetch(`/api/langfuse/analytics?promptId=${promptId}`);
const data = await response.json();
```

### Webhook Events

The system tracks these events automatically:
- Trace creation
- Score updates
- Error occurrences

## Security & Privacy

- All data stays within SambaTV's infrastructure
- Authentication required for all features
- No external services can access your prompts
- Evaluation data is encrypted in transit

## Support

For issues or questions:
1. Check this guide first
2. Try the troubleshooting steps
3. Contact the AI Platform team on Slack: #ai-platform-support
4. Report bugs: https://github.com/sambatv/prompt-library/issues

## Changelog

### Version 1.0 (January 2025)
- Initial integration with AI Platform
- Test in AI Platform button
- Real-time analytics display
- Automatic data synchronization

---

Last Updated: January 10, 2025