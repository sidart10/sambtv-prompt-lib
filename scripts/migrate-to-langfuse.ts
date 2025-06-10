#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { syncPromptToLangfuse } from '../lib/langfuse/client';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migratePromptsToLangfuse() {
  console.log('Starting Langfuse migration...');
  
  try {
    // Fetch all published prompts
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch prompts:', error);
      return;
    }

    console.log(`Found ${prompts?.length || 0} prompts to migrate`);

    let successCount = 0;
    let errorCount = 0;

    // Process prompts in batches
    const batchSize = 10;
    for (let i = 0; i < (prompts?.length || 0); i += batchSize) {
      const batch = prompts!.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (prompt) => {
        try {
          await syncPromptToLangfuse({
            id: prompt.id,
            title: prompt.title,
            content: prompt.content,
            description: prompt.description,
            tags: prompt.tags,
            model: prompt.model,
            temperature: prompt.temperature
          });
          
          console.log(`✓ Migrated prompt ${prompt.id}: ${prompt.title}`);
          successCount++;
        } catch (error) {
          console.error(`✗ Failed to migrate prompt ${prompt.id}:`, error);
          errorCount++;
        }
      });
      
      await Promise.all(batchPromises);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < (prompts?.length || 0)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\nMigration complete!');
    console.log(`Successfully migrated: ${successCount} prompts`);
    console.log(`Failed: ${errorCount} prompts`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function migratePlaygroundSessions() {
  console.log('\nMigrating playground sessions...');
  
  try {
    // Get recent playground analytics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('event_type', 'playground_generate')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch playground events:', error);
      return;
    }

    console.log(`Found ${events?.length || 0} playground sessions to migrate`);

    let tracesCreated = 0;

    for (const event of events || []) {
      if (event.event_data && event.event_data.model) {
        try {
          // Create a trace record for historical data
          const { error: traceError } = await supabase
            .from('langfuse_traces')
            .insert({
              langfuse_trace_id: `historical_${event.id}`,
              prompt_id: event.event_data.promptId || null,
              token_usage: {
                promptTokens: event.event_data.inputTokens || 0,
                completionTokens: event.event_data.outputTokens || 0,
                totalTokens: (event.event_data.inputTokens || 0) + (event.event_data.outputTokens || 0)
              },
              total_cost: event.event_data.cost || 0,
              latency_ms: event.event_data.duration || null,
              created_at: event.created_at
            });

          if (!traceError) {
            tracesCreated++;
          }
        } catch (error) {
          console.error(`Failed to migrate session ${event.id}:`, error);
        }
      }
    }

    console.log(`Created ${tracesCreated} historical trace records`);
    
  } catch (error) {
    console.error('Session migration failed:', error);
  }
}

// Run migrations
async function main() {
  console.log('Langfuse Data Migration Tool');
  console.log('===========================\n');
  
  const args = process.argv.slice(2);
  const skipPrompts = args.includes('--skip-prompts');
  const skipSessions = args.includes('--skip-sessions');
  
  if (!skipPrompts) {
    await migratePromptsToLangfuse();
  }
  
  if (!skipSessions) {
    await migratePlaygroundSessions();
  }
  
  console.log('\nAll migrations complete!');
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Run the migration
main();