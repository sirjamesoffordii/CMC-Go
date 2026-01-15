# Security Advisory

## Known Vulnerabilities and Mitigations

### Fixed Vulnerabilities ✅

#### 1. xmldom (CRITICAL) - **FIXED**
- **CVE-2022-39353** (GHSA-crh6-fp67-6883): Multiple root nodes vulnerability
- **GHSA-5fg8-2547-mr8q**: XML serialization vulnerability  
- **Fix**: Upgraded from `xmldom@0.6.0` to `@xmldom/xmldom@0.9.5`
- **Status**: ✅ Resolved

### Remaining Vulnerabilities

#### 2. xlsx (HIGH) - MITIGATED
- **CVE-2023-30533** (GHSA-4r6h-8v6p-xvw6): Prototype Pollution vulnerability
- **GHSA-5pgg-2g8v-p4x9**: Regular Expression Denial of Service (ReDoS)
- **Affected Version**: 0.18.5 (latest on npm as of 2022)
- **Fix Available**: Version 0.19.3+ (only available from SheetJS CDN, not npm)
- **Mitigation**: 
  - xlsx is only used in `/scripts/ingest-excel.mjs` for importing trusted Excel seed data
  - This script is only run by administrators on controlled, trusted files
  - Not exposed to user uploads or untrusted input
  - Input validation added to reject malformed Excel files
- **Risk**: LOW (admin-only script with trusted data)
- **Recommendation**: When CDN access is available, upgrade to `xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`

#### 3. esbuild/vitest (MODERATE) - ACCEPTED RISK
- **GHSA-67mh-4wv8-2f99**: Development server request vulnerability
- **Affected**: esbuild <=0.24.2, vitest, vite-node, drizzle-kit, @vitest/coverage-v8
- **Fix Available**: Requires major version upgrade to vitest@4.x (breaking changes)
- **Mitigation**:
  - These are **development-only dependencies** (devDependencies)
  - Not included in production builds
  - Development servers should not be exposed to untrusted networks
- **Risk**: LOW (dev-only, not in production)
- **Recommendation**: Upgrade to vitest 4.x when time allows for testing breaking changes

## Best Practices

1. **xlsx Usage**: Only use for importing trusted, admin-provided seed data
2. **Development Environment**: Keep development servers isolated from public networks
3. **Regular Audits**: Run `npm audit` before each release
4. **Dependency Updates**: Monitor for security updates monthly

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com (DO NOT open a public issue).

Last Updated: 2026-01-15
