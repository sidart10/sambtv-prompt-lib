# Agent Integration Guide

This repository contains SambaTV's internal prompt library built with Next.js 15 and Supabase. The team wants to incorporate evaluation tooling from Arize Phoenix while keeping the project strictly for internal use.

## Goals
- Add collaborative evaluation features: dataset creation, LLM response generation, metrics, tracing, comparisons, and annotation/feedback.
- Reuse Phoenix packages under Elastic License 2.0 without exposing Phoenix as a hosted service to third parties.

## Implementation Plan
1. **Run Phoenix as a separate service**
   - Deploy Phoenix's Python backend separately.
   - Access it via its GraphQL API or the `@arizeai/phoenix-client` library.
   - Keep Arize's license notices intact.

2. **Integrate evaluations**
   - Use `arize-phoenix-evals` in a Python microservice to generate metrics.
   - Connect traces via `phoenix-otel` to capture LLM calls from this app.
   - Store evaluation results and traces in Supabase tables.

3. **Extend the Next.js app**
   - Add API routes or server actions to communicate with the Phoenix service.
   - Build UI pages for dataset management, trace viewing, result comparisons, and annotation workflows.
   - Leverage existing auth (NextAuth) for access control.

4. **Testing & linting**
   - After modifications, run `pnpm lint` and `pnpm test` to ensure code quality and passing tests.
   - Add new tests for integration endpoints and UI components.

5. **Documentation**
   - Update README and docs with setup instructions, environment variables, and usage notes for the Phoenix integration.
   - Document how to start the Phoenix service during development.

6. **License & Usage Notes**
   - This repository remains internal-only. Do not provide Phoenix as a managed service externally.
   - Retain the Elastic License 2.0 notice in any Phoenix-derived files.

7. **Gradual rollout**
   - Phase 1: Dataset creation & basic LLM evaluation metrics.
   - Phase 2: Add tracing and annotation features.
   - Phase 3: Provide side-by-side comparison tools and collaborative feedback.

Follow this guide when adding Phoenix features to ensure compliance and maintainability.

