# Supabase setup checklist

The current website does not require Supabase because it has no persisted
application data. Use this checklist if enquiry storage, authentication, an
admin dashboard, or uploads are added later.

- [ ] Create Supabase project
- [ ] Configure project URL
- [ ] Configure anon/public key
- [ ] Create only the database tables required by a confirmed feature
- [ ] Run `supabase/schema.sql`
- [ ] Enable RLS on every application table
- [ ] Apply `supabase/rls.sql`
- [ ] Configure Supabase Auth if protected pages are added
- [ ] Create Storage buckets only if uploads are added
- [ ] Configure Storage policies only if uploads are added
- [ ] Connect the frontend using browser-safe anon credentials
- [ ] Test CRUD operations with RLS enabled
- [ ] Test authentication and logout
- [ ] Test file uploads and file access policies
- [ ] Build the frontend
- [ ] Push the export to GitHub
- [ ] Enable GitHub Pages
- [ ] Test the production website