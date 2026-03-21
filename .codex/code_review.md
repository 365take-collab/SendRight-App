## Review guidelines

### Scope: blocking issues only
- Do NOT flag naming, formatting, missing comments, or stylistic preferences
- Only flag issues that cause security vulnerabilities, data loss, or production outages

### Prohibited patterns (always flag)
- Hardcoded return values (dictionary/map lookup instead of real logic)
- Stub implementations (returning null, empty arrays, or placeholder data)
- Test-only branches (if/switch handling only known test case values)
- Excessive type casting (`as any`, `as never`, `as unknown`)
- Committed `it.skip()` or `it.only()`
- Assertion removal or weakening
- Coverage threshold reduction
- Adding `continue-on-error: true`

### Security checks (always flag)
- Missing input validation (SQL injection, XSS, command injection)
- Missing authentication or authorization checks
- Hardcoded secrets (API keys, tokens, passwords)
- Missing Supabase RLS policies on new tables

### Project conventions (flag if violated)
- Import paths must use `@/` prefix (TypeScript/Next.js projects)
- API endpoints must apply authentication middleware
- Type definitions must match between API and frontend
- Python projects: type hints required on public functions
