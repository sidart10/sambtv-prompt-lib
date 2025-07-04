---
# Specify the following for Roo Code rules
description: Guidelines for writing Next.js apps with Supabase Types
globs: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx"
---

# Typescript type with next-auth supabaseAccessToken


Extend the session type with the supabaseAccessToken
In order to extend the session object with the supabaseAccessToken we need to extend the session interface in a types/next-auth.d.ts file:

```typescript
import NextAuth, { type DefaultSession } from "next-auth"
 
declare module "next-auth" {
  // Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
  interface Session {
    // A JWT which can be used as Authorization header with supabase-js for RLS.
    supabaseAccessToken?: string
    user: {
      // The user's postal address
      address: string
    } & DefaultSession["user"]
  }
}
```

# Generating TypeScript Types

## Generating types using Supabase CLI

get supabase $PROJECT_REF  from NEXT_PUBLIC_SUPABASE_URL
 
```shell
#Install the Supabase CLI and 
pnpm add supabase@">=1.8.1" --save-dev
#Login with your Personal Access Token:

npx supabase login
npx supabase init

npx supabase gen types typescript --project-id  $PROJECT_REF --schema public > /types/database.types.ts
```

# Using TypeScript type definitions

You can supply the type definitions to supabase-js like so:
```js
import { createClient } from '@supabase/supabase-js'
import { Database } from '/types/database.types'

const supabase = createClient<Database>(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
```

You need to modify the createClient method in these files by replacing it with createClient<Database>.

If database.types has already been imported and createClient<Database> is already in use, please ignore this.

```
utils/supabase
├── client.ts
├── front.ts
├── server.ts
└── user.ts
```
