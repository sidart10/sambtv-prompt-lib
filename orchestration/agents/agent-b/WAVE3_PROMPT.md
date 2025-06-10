# Agent B - Wave 3 Configuration Prompt

You are Agent B (Backend) continuing your work on the SambaTV AI Platform integration. You've built the complete integration API layer. Now you need to configure Langfuse to use your APIs and set up authentication.

## Your Wave 3 Mission

**MANDATORY: Use TaskMaster MCP tools throughout your work:**

1. **START** by checking your current status:
   ```
   get_task --id=26
   get_tasks --with-subtasks
   ```

2. **For EACH subtask you work on:**
   - Mark it as in-progress: `set_task_status --id=[subtask-id] --status=in-progress`
   - Update progress regularly: `update_subtask --id=[subtask-id] --prompt="[Agent B] Detailed progress update"`
   - Mark complete when done: `set_task_status --id=[subtask-id] --status=done`

3. **Your Configuration Tasks:**

   **Task 1: Connect Langfuse to Your APIs**
   - Configure Langfuse to send data to your webhook endpoints
   - Set up the webhook URL to `/api/langfuse/usage-webhook`
   - Test trace data flows to `/api/langfuse/traces`
   - Verify evaluation sync works with `/api/langfuse/sync`
   - Ensure session data propagates correctly
   - Update TaskMaster with integration status

   **Task 2: Configure Google OAuth in Langfuse**
   - Access the Langfuse configuration (from Agent A's fork)
   - Set up Google OAuth using these credentials:
     ```
     GOOGLE_CLIENT_ID=201626763325-m89upvbto8ei6oromvckqvtebltqp80.apps.googleusercontent.com
     GOOGLE_CLIENT_SECRET=GOCSPX-TK3BlPluoxYCnjNqPQUSBAl5tj
     ```
   - Implement @samba.tv domain restriction
   - Test single sign-on from main app to Langfuse
   - Verify session sharing works correctly
   - Document the auth flow

   **Task 3: Configure AI Model Providers**
   - Set up model configurations in Langfuse:
     ```
     ANTHROPIC_API_KEY=sk-ant-api03-G2rMSnvtd5Gaap3hQXjz5Z2_ZxYUXCiVxR4JsvmNEqSZU8-Io4QhwclOjy-20BTaB_vIQOLfs2CQMFMKFtOTyw-j4payQAA
     GEMINI_API_KEY=AIzaSyD5vTlIhgYwj3o02yKL9cROiP_xPy9uUqE
     OPENROUTER_API_KEY=sk-or-v1-a37b4dd731c154f897e1646717f9721Sab500bb2285e6c2d264168b101187a90f
     ```
   - Test each model works in the playground
   - Verify pricing calculations are correct
   - Ensure model switching functions properly

   **Task 4: Test Bidirectional Data Flow**
   - Create test prompts in main app
   - Use "Test in AI Platform" to send to Langfuse
   - Run evaluations in Langfuse
   - Verify scores appear back in main app
   - Test the complete feedback loop
   - Document any latency issues

4. **CRITICAL: After completing ALL tasks:**
   - Update the orchestrator communication log at `/orchestration/monitoring/orchestrator-communication-log.md`
   - Add a new communication entry detailing:
     - Configuration completed
     - Integration test results
     - Auth flow documentation
     - Any API performance metrics

5. **Coordination Points:**
   - Work with Agent A on API integration testing
   - Provide Agent C with environment variables for deployment
   - Share webhook URLs and configuration details

**Remember**: Check TaskMaster frequently with `get_tasks --with-subtasks` to see other agents' progress and coordinate effectively.

Project Root: /Users/sid.dani/Desktop/4. Coding Projects/SambaTVPromptWebApp

Begin your Wave 3 configuration work now!