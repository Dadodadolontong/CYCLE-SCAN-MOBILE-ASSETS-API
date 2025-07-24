# Supabase Configuration Setup

This project can work with both production Supabase and localhost Supabase instances.

## Switching to Localhost Supabase

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Start local Supabase**:
   ```bash
   supabase start
   ```

3. **Update configuration**:
   - Open `src/config/supabase.ts`
   - Change `USE_LOCALHOST = false` to `USE_LOCALHOST = true`
   - Update the `LOCALHOST_CONFIG` with your local Supabase details if needed

4. **Get your local credentials**:
   ```bash
   supabase status
   ```
   This will show your local API URL and anon key.

5. **Update localhost config** (if different from defaults):
   ```typescript
   const LOCALHOST_CONFIG = {
     url: "http://localhost:54321", // Your local API URL
     anonKey: "your-local-anon-key"  // Your local anon key
   };
   ```

## Switching Back to Production

1. Open `src/config/supabase.ts`
2. Change `USE_LOCALHOST = true` to `USE_LOCALHOST = false`

## Auto-Detection

The system will automatically detect if you're running on localhost and suggest using local Supabase if `USE_LOCALHOST` is not explicitly set to `false`.

## Migration Commands

When using localhost Supabase, you can run migrations:

```bash
# Reset local database
supabase db reset

# Apply specific migration
supabase migration up

# Generate types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Database Schema Sync

To sync your local database with production:

```bash
# Pull production schema
supabase db pull

# Or link to existing project
supabase link --project-ref your-project-ref
```

## Environment-Specific Considerations

### **Local Development**
- Storage buckets are created automatically
- Email testing uses Inbucket (localhost:54324)
- Edge functions run on localhost:54329
- All data is ephemeral unless persisted

### **Production Deployment**
- Ensure all secrets are configured in Supabase dashboard
- Storage buckets must be created via migrations
- Email confirmation may be required
- Edge functions auto-deploy with git pushes

## Testing Both Environments

### **Test Local Setup**
```bash
# Start local Supabase
supabase start

# Reset with seed data
supabase db reset

# Test edge functions locally
curl -X POST http://localhost:54321/functions/v1/process-locations-csv \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.csv"}'
```

### **Test Production Setup**
- Switch `USE_LOCALHOST = false`
- Verify production URLs and keys
- Test authentication flows
- Verify storage permissions

## Common Issues and Solutions

### **Local Issues**
- If functions fail: Check `supabase functions serve`
- If auth fails: Verify anon key matches `supabase status`
- If storage fails: Check bucket creation in migrations

### **Production Issues**
- If 404 on functions: Check deployment logs
- If auth fails: Verify site URL in Supabase dashboard
- If CORS errors: Check allowed origins

## Security Notes

⚠️ **Important**: 
- Local anon keys are safe to commit (they're default values)
- Production keys should never be committed to git
- Always test security policies in both environments
- Rate limiting works differently in local vs production
```