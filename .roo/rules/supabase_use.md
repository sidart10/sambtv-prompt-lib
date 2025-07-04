---
# Specify the following for Roo Code rules
description: Guidelines for writing Next.js apps with Supabase Auth
globs: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx"
---

# Next.js app with Supabase 

## Overview of implementing Supabase Auth SSR

1. use @supabase/supabase-js and @supabase/ssr packages.
2. Set up environment variables.
3. Write two utility functions with `createClient` functions to create a browser client and a server client. 
4. Hook up middleware to refresh auth tokens



## CORRECT BROWSER CLIENT IMPLEMENTATION
This file /utils/supabase/client.ts is used to request user-related data under a logged-in state.
```typescript
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth"
import { useSession, signIn, signOut } from 'next-auth/react';
export async function createSupabaseClient() {

  const session = await auth()
  // @ts-ignore
  const { supabaseAccessToken } = session
  console.log(supabaseAccessToken)

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
        },
      }
    },

  )
}
```
Usage example reference

```typescript
import { getSupabaseClient } from '@/utils/supabase/server';
 // Query the 'notes' table to render the list of tasks
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('notes').select();
  if (error) {
    throw error;
  }
  const notes = data;
```


## CORRECT SERVER CLIENT IMPLEMENTATION
This file /utils/supabase/server.ts is used to access and modify all data will bypass RLS.
```typescript
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

async function createSupabaseAdminClient() {
	// server  api
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SECRET_KEY!,

	)
}
export { getSupabaseClient, createSupabaseAdminClient }
```
Usage example reference

```typescript
import { createSupabaseAdminClient } from '@/utils/supabase/server';
// This is where we receive Stripe webhook events
// It used to update the user data, send emails, etc...
// By default, it'll store the user in the database

const supabaseAdmin = await createSupabaseAdminClient();
const { data, error } = await supabaseAdmin.from('stripe_customers')
						.upsert({
							user_id: userId, stripe_customer_id: customerId,
							subscription_id: session.subscription, plan_active: true,
							plan_expires: subscription.current_period_end * 1000
						});
					if (error) {
						console.log('checkout.session.completed.....', error);
					}
```


