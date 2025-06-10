# Agent A Handoff Document

## Frontend/UI Work Completed

### Repository Setup
- **Location**: `/Users/sid.dani/Desktop/4. Coding Projects/SambaTVPromptWebApp/sambatv-ai-platform`
- **Branch**: `sambatv-customization`
- **Commit**: `977d75fb` - "feat: Apply SambaTV white-labeling to Langfuse"

### Completed White-Labeling
1. **Branding**: All "Langfuse" references changed to "SambaTV AI Platform"
2. **Colors**: Primary color updated to SambaTV red (#E50914)
3. **Logo**: New SambaTV logo and favicon implemented
4. **Navigation**: Added link back to prompt library

### Integration Points Created
1. **Test in AI Platform Button**
   - Location: `/components/test-in-ai-platform-button.tsx` (main app)
   - Functionality: Opens prompts in Langfuse playground with parameters
   - URL format: `https://ai.sambatv.com/playground?prompt={content}&promptId={id}&model=claude-3-5-sonnet`

2. **Back Navigation**
   - Added "← Back to Prompt Library" link in Langfuse sidebar
   - Target: `https://prompts.sambatv.com`

### Environment Assumptions
- Langfuse will be deployed at: `https://ai.sambatv.com`
- Main prompt library at: `https://prompts.sambatv.com`
- Same Google OAuth credentials will be used for both apps

## Next Steps for Other Agents

### Agent B (Backend) Requirements
1. Configure authentication in `/web/src/server/auth.ts`:
   - Use existing Google OAuth credentials from main app
   - Implement @samba.tv domain restriction
   - Ensure session sharing between apps

2. Configure model providers in `/packages/shared/src/server/llm/providers.ts`:
   - Add Anthropic API key
   - Add Google Gemini API key
   - Add OpenRouter API key
   - Set up proper pricing

3. Create data integration:
   - Add `langfuse_traces` table to main app's Supabase
   - Implement API endpoints for trace storage
   - Configure CORS for cross-origin requests

### Agent C (Infrastructure) Requirements
1. Local development:
   ```bash
   cd sambatv-ai-platform
   docker run -d --name langfuse-postgres \
     -e POSTGRES_USER=langfuse \
     -e POSTGRES_PASSWORD=langfuse \
     -e POSTGRES_DB=langfuse \
     -p 5432:5432 \
     postgres:15
   
   pnpm run db:migrate
   pnpm run dev
   ```

2. Production deployment:
   - Configure domain: ai.sambatv.com
   - Set up SSL certificate
   - Configure environment variables
   - Deploy using Docker or Vercel

3. Environment variables needed:
   ```env
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://ai.sambatv.com
   NEXTAUTH_SECRET=<same-as-main-app>
   GOOGLE_CLIENT_ID=<same-as-main-app>
   GOOGLE_CLIENT_SECRET=<same-as-main-app>
   ANTHROPIC_API_KEY=<your-key>
   GOOGLE_GEMINI_API_KEY=<your-key>
   OPENROUTER_API_KEY=<your-key>
   ```

### Integration Testing Checklist
- [ ] User can sign in with @samba.tv Google account
- [ ] "Test in AI Platform" button opens Langfuse with prompt
- [ ] Prompt content pre-fills in playground
- [ ] Model selection works
- [ ] Traces are created when running prompts
- [ ] "Back to Prompt Library" link works
- [ ] Visual branding is consistent

## Files Modified Summary
- **Branding**: LangfuseLogo.tsx, layout.tsx, sign-in.tsx, sign-up.tsx
- **Styling**: globals.css (color variables)
- **Assets**: icon.svg, favicon.ico, sambatv-logo.png
- **Navigation**: app-sidebar.tsx
- **Integration**: test-in-ai-platform-button.tsx (main app)

## Contact
For UI/Frontend questions, refer to:
- This handoff document
- SAMBATV_CUSTOMIZATION_SUMMARY.md in the fork
- The git commit history in sambatv-customization branch

---
Handoff Date: 2025-01-10
From: Agent A (Frontend/UI)
To: Agents B & C