# Kato.8 CRM

Standalone sales and client CRM for Kato.8 Studios. It is designed to sit beside the Blind Sight advertising tool, not inside it.

## Features

- Shared client pipeline with live Supabase Realtime updates
- Magic-link sign-in
- Company, contacts, deal value, stage, scope, notes, and next actions
- Deep-link intake from the advertising tool, for example:

  `https://kato-8-crm.vercel.app/?company=Acme%20Inc&scope=Branded%20throwable&value=25000&source=blind-sight-ads`

- Local demo fallback when Supabase is not configured

## Configure shared live data

1. Create a Supabase project.
2. In the Supabase SQL editor, run [schema.sql](./schema.sql).
3. Copy `config.example.js` to `config.js` and fill in the project URL and anon key.
4. Add the production URL to Supabase Auth → URL Configuration → Redirect URLs.
5. Deploy the folder to Vercel:

   ```bash
   npx vercel --prod
   ```

Never put a Supabase service-role key in `config.js`; the browser only needs the publishable anon key.

## Integration

The advertising tool should link to the CRM with URL parameters for sponsor context. The CRM keeps the tools separate while making handoff immediate. The CRM's `config.js` contains the advertising tool URL used by the top navigation.
