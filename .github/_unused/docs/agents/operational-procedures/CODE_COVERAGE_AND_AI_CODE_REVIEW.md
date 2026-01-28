# Code Coverage & PR Review Notes

This document is a lightweight reference for agents working on PRs to `staging`.

## CI workflow (source of truth)

- Workflow file: `.github/workflows/test-and-coverage.yml`
- Trigger: pushes + PRs targeting `staging`
- Database: MySQL 8 service, seeded via `pnpm db:push:yes` then `pnpm db:seed`
- Tests + coverage: `pnpm test -- --coverage`
- Coverage upload: `coverage/lcov.info` uploaded via `codecov/codecov-action@v5`

## Required secrets

- `CODECOV_TOKEN` (recommended) — enables Codecov upload.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (optional) — enables sourcemap upload.
  - The workflow skips sourcemap upload if `SENTRY_AUTH_TOKEN` is missing.

## Local usage

- Run tests with coverage: `pnpm test -- --coverage`
- If your tests require DB state, use the same sequence as CI:
  - `pnpm db:push:yes`
  - `pnpm db:seed`

## Practical notes for agents

- If CI fails in the DB setup steps, fix migrations/seed scripts first.
- Codecov upload failures should not block the PR if tests pass (CI is configured with `fail_ci_if_error: false`). ### Required Environment Variables

                                                                                                                                                                                                                                                        For the workflow to function properly, ensure these are set:

                                                                                                                                                                                                                                                        **GitHub Repository Settings**:
                                                                                                                                                                                                                                                        - `CODECOV_TOKEN` (required) - Upload coverage reports

                                                                                                                                                                                                                                                        - **Railway Deployment**:
                                                                                                                                                                                                                                                        - - `DATABASE_URL` - Connection string for production database

                                                                                                                                                                                                                                                          - ### Troubleshooting

                                                                                                                                                                                                                                                          - #### Coverage Not Uploading

                                                                                                                                                                                                                                                          - **Symptom**: Workflow runs but Codecov doesn't receive reports

                                                                                                                                                                                                                                                          - **Solutions**:
                                                                                                                                                                                                                                                          - 1. Verify `CODECOV_TOKEN` is set in GitHub Secrets
                                                                                                                                                                                                                                                            2. 2. Check workflow logs for upload errors
                                                                                                                                                                                                                                                               3. 3. Ensure Jest coverage reports are generated (`./coverage/coverage-final.json` exists)
                                                                                                                                                                                                                                                                  4. 4. Verify token has valid permissions in Codecov dashboard

                                                                                                                                                                                                                                                                     5. #### AI Code Review Not Commenting on PRs

                                                                                                                                                                                                                                                                     6. **Symptom**: Sentry AI bot doesn't comment on pull requests

                                                                                                                                                                                                                                                                     7. **Solutions**:
                                                                                                                                                                                                                                                                     8. 1. Confirm "Enable AI Code Review" is toggled ON in Sentry settings
                                                                                                                                                                                                                                                                        2. 2. Ensure GitHub integration is properly connected
                                                                                                                                                                                                                                                                           3. 3. Check that PR has sufficient code changes to analyze
                                                                                                                                                                                                                                                                              4. 4. Verify organization still has active AI features enabled

                                                                                                                                                                                                                                                                                 5. #### Tests Failing Locally but Not in CI

                                                                                                                                                                                                                                                                                 6. **Solutions**:
                                                                                                                                                                                                                                                                                 7. 1. Ensure Node.js version matches workflow (v18)
                                                                                                                                                                                                                                                                                    2. 2. Check that test database environment variables are set
                                                                                                                                                                                                                                                                                       3. 3. Verify PostgreSQL is running locally
                                                                                                                                                                                                                                                                                          4. 4. Check for timezone-dependent tests

                                                                                                                                                                                                                                                                                             5. ---

                                                                                                                                                                                                                                                                                             6. ## Next Steps

                                                                                                                                                                                                                                                                                             7. ### Recommended Actions

                                                                                                                                                                                                                                                                                             8. 1. **Add CODECOV_TOKEN to GitHub**
                                                                                                                                                                                                                                                                                                2.    - Go to Repository Settings → Secrets
                                                                                                                                                                                                                                                                                                      -    - Add the token from Codecov dashboard

                                                                                                                                                                                                                                                                                                           - 2. **Configure Jest Coverage Thresholds**
                                                                                                                                                                                                                                                                                                             3.    - Update `jest.config.js` with desired coverage targets
                                                                                                                                                                                                                                                                                                                   -    - Set thresholds appropriate for your project

                                                                                                                                                                                                                                                                                                                        - 3. **Review First PR with AI**
                                                                                                                                                                                                                                                                                                                          4.    - Create a test PR to see AI Code Review in action
                                                                                                                                                                                                                                                                                                                                -    - Verify Codecov comments appear with coverage reports

                                                                                                                                                                                                                                                                                                                                     - 4. **Monitor Coverage Trends**
                                                                                                                                                                                                                                                                                                                                       5.    - Watch Codecov dashboard as PRs are merged
                                                                                                                                                                                                                                                                                                                                             -    - Track coverage improvements over time

                                                                                                                                                                                                                                                                                                                                                  - ### Related Documentation

                                                                                                                                                                                                                                                                                                                                                  - - [Sentry Setup](SENTRY_ERROR_MONITORING.md) - Error monitoring and performance tracking
                                                                                                                                                                                                                                                                                                                                                    - - [CMC Go Brief](/.github/agents/CMC_GO_BRIEF.md) - Product + architecture snapshot
                                                                                                                                                                                                                                                                                                                                                      - - [GitHub Actions Documentation](https://docs.github.com/actions)
                                                                                                                                                                                                                                                                                                                                                        - - [Codecov Documentation](https://docs.codecov.io/)

                                                                                                                                                                                                                                                                                                                                                          - ---

                                                                                                                                                                                                                                                                                                                                                          ## Summary

                                                                                                                                                                                                                                                                                                                                                          Your CMC-Go project now has:
                                                                                                                                                                                                                                                                                                                                                          - ✅ Automated test execution on every commit
                                                                                                                                                                                                                                                                                                                                                          - - ✅ Code coverage tracking with Codecov
                                                                                                                                                                                                                                                                                                                                                            - - ✅ Pull request coverage reports
                                                                                                                                                                                                                                                                                                                                                              - - ✅ AI-powered code review on all PRs
                                                                                                                                                                                                                                                                                                                                                                - - ✅ Generative AI insights for error monitoring

                                                                                                                                                                                                                                                                                                                                                                  - These tools work together to improve code quality, catch bugs early, and maintain visibility into test coverage and code health.
