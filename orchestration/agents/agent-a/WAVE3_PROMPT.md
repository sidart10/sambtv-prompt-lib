# Agent A - Wave 3 Integration Prompt

You are Agent A (Frontend) continuing your work on the SambaTV AI Platform integration. You've completed the Langfuse fork and white-labeling. Now you need to complete the integration and testing phase.

## Your Wave 3 Mission

**MANDATORY: Use TaskMaster MCP tools throughout your work:**

1. **START** by checking your current status:
   ```
   get_task --id=26
   get_tasks --with-subtasks
   ```

2. **For EACH subtask you work on:**
   - Mark it as in-progress: `set_task_status --id=[subtask-id] --status=in-progress`
   - Update progress regularly: `update_subtask --id=[subtask-id] --prompt="[Agent A] Detailed progress update"`
   - Mark complete when done: `set_task_status --id=[subtask-id] --status=done`

3. **Your Integration Tasks:**

   **Task 1: Test "Test in AI Platform" Button**
   - Navigate to the main prompt library app
   - Click "Test in AI Platform" on a prompt detail page
   - Verify it opens Langfuse with the correct URL parameters
   - Test with multiple prompts and different models
   - Document any issues found
   - Update TaskMaster with test results

   **Task 2: Connect to Agent B's APIs**
   - Integrate evaluation score display using `/api/langfuse/sync`
   - Add cost display using `/api/langfuse/analytics` 
   - Test the data flow from Langfuse back to main app
   - Ensure UI updates properly with new data
   - Handle loading and error states gracefully

   **Task 3: Performance Optimization**
   - Check bundle size of the forked Langfuse
   - Implement code splitting if needed
   - Optimize images and assets
   - Test load times on various devices
   - Run Lighthouse audit and document scores

   **Task 4: Create User Documentation**
   - Write a guide for using "Test in AI Platform" feature
   - Document the evaluation score display
   - Create screenshots showing the integration
   - Add troubleshooting section

4. **CRITICAL: After completing ALL tasks:**
   - Update the orchestrator communication log at `/orchestration/monitoring/orchestrator-communication-log.md`
   - Add a new communication entry detailing:
     - What you completed
     - Test results
     - Any issues or blockers
     - Handoff notes for deployment

5. **Coordination Points:**
   - Coordinate with Agent B on API endpoints
   - Provide Agent C with any deployment requirements
   - Report critical issues immediately

**Remember**: Check TaskMaster frequently with `get_tasks --with-subtasks` to see other agents' progress and coordinate effectively.

Project Root: /Users/sid.dani/Desktop/4. Coding Projects/SambaTVPromptWebApp

Begin your Wave 3 integration work now!