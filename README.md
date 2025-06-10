# SambaTV Internal Prompt Library

An internal AI prompt library platform for SambaTV employees to discover, create, share, and test AI prompts.

## 🚀 Features

- **Authentication**: SambaTV Enterprise Google OAuth integration
- **Prompt Management**: Create, browse, and manage AI prompts
- **Playground**: Test prompts with various AI models (Gemini, Claude, OpenRouter)
- **User Profiles**: Track your created prompts and favorites
- **Search & Filter**: Find prompts by category, model, or keywords
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI Components**: shadcn/ui with Tailwind CSS
- **Authentication**: NextAuth with Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with SambaTV brand colors

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Cloud Platform project (for OAuth)
- API keys for AI models (Gemini, Claude, OpenRouter)

## 🔧 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in your environment variables:
   ```
   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-here

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # AI Model API Keys
   GOOGLE_GEMINI_API_KEY=your-gemini-key
   ANTHROPIC_API_KEY=your-anthropic-key
   OPENROUTER_API_KEY=your-openrouter-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📝 Environment Variables

### Required Variables

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Your app URL (http://localhost:3000 for development) |
| `NEXTAUTH_SECRET` | Random string for encrypting tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

### AI Model API Keys

| Variable | Description |
|----------|-------------|
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `OPENROUTER_API_KEY` | OpenRouter API key |

## 🗄️ Database Schema

The application uses the following main tables:

- `users` - User profiles (integrated with NextAuth)
- `prompts` - AI prompt templates
- `prompt_versions` - Version history for prompts
- `prompt_forks` - Forked prompts tracking
- `user_favorites` - User's favorite prompts
- `categories` - Prompt categories
- `tags` - Prompt tags

## 🔐 Authentication

This application uses Google OAuth for authentication, restricted to SambaTV enterprise accounts. Users must sign in with their @samba.tv email address.

## 🎨 Branding

The application uses SambaTV's brand colors:
- Primary: #E60000 (SambaTV Red)
- Text on Primary: #FFFFFF (White)

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/sidart10/sambtv-prompt-lib?utm_source=oss&utm_medium=github&utm_campaign=sidart10%2Fsambtv-prompt-lib&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## 📄 License

This is an internal SambaTV project and is not licensed for external use.
