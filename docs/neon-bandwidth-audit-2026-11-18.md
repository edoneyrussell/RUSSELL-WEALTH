# Neon network-transfer audit — November 18, 2026

## Scope and status

Local implementation and validation for Russell Wealth. Deployment configuration and database credentials were not changed. Earlier dashboard, localization, loading, and welcome-tour work was preserved. Changes only reduce future transfer after the updated backend and frontend deploy; the reported 4.1 GB already consumed is not recoverable.

Timestamped source backup: `backups/neon-bandwidth-20261118-135602` (464 files, environment secrets excluded). Backups are ignored by Git.

## Confirmed findings and targeted changes

| Location / function | Confirmed behavior | Optimization |
|---|---|---|
| [infrastructure_history.py](../backend/infrastructure_history.py), `observed_history` | Every infrastructure refresh fetched up to 17,280 individual observations over a full day. | SQL groups observations into at most 147 half-hour aggregates. Original raw retention, sample counts, observed availability, and worst-status blocks are preserved. |
| [App.tsx](../frontend/src/App.tsx), auth effect; [app.py](../backend/app.py), `api_me` | Navigation fetched the stored base64 profile photo even when only authentication/roles were needed. | `include_photo=0` returns identity/roles without querying/downloading the photo. Full profile/photo functionality remains. |
| [useAccountProfile.ts](../frontend/src/hooks/useAccountProfile.ts) | Downloaded profile/photo every 15 seconds, potentially from several mounted components. | 120-second foreground polling, immediate local profile-change refresh, concurrent request coalescing. |
| [sharedFetch.ts](../frontend/src/experience/sharedFetch.ts), customer/SOC fetch wrappers | Multiple hooks independently fetched the same account and profile endpoints. | Coalesce concurrent matching GETs. Independent response bodies and abort signals; no completed private response cache. Writes invalidate the in-flight generation. |
| [portfolioSync.ts](../frontend/src/utils/portfolioSync.ts), [useAccounts.ts](../frontend/src/hooks/useAccounts.ts) | Ten-second reads, overlapping focus listeners, and broadcast + storage notifications; account mutations also refreshed via a separate revision. | Thirty-second reconciliation, coalesced update signals, one source of mutation refresh. Actual committed trades/transfers still trigger immediate refresh. |
| [postgres_connection.py](../backend/postgres_connection.py), [postgres_adapter.py](../backend/postgres_adapter.py) | A new TLS/PostgreSQL connection was opened and closed for each database handle, including validation plus endpoint reads. | Lazy process-local pool: min 0, max 4 connections per worker, 60-second idle expiry, 10-second acquisition timeout. Roll back before return; never share transaction state or cache authorization. Direct maintenance-script connections remain direct. |
| [app.py](../backend/app.py), `validate_current_account` | SOC membership required a separate read on every request. | Membership existence joins the live account-validation query. Account status, role, access version and individual-session revocation are still checked on every authenticated request. |
| [active_sessions.py](../backend/active_sessions.py), [access_api.py](../backend/access_api.py), [incident_response.py](../backend/incident_response.py) | `SELECT *` read unused session columns and entire user rows, including photo columns, during checks/actions. Directory rendering also queried membership for each SOC user. | Explicit necessary fields; directory membership in the existing directory query. Password verification, protected-owner rules, role checks and audit actions remain. |
| [customer_accounts.py](../backend/customer_accounts.py), `list_accounts` | One holdings valuation query per account. | One ownership-filtered holdings query for all listed accounts, with the identical current pricing calculation. Balances/holdings are not cached. |
| [trading_api.py](../backend/trading_api.py), `transaction_history` | Downloaded all stock/banking transactions and account names, then merged/sorted in Python. | Ownership-filtered SQL union, server-side search and pagination: default 50, maximum 100 per page. Previous/Next controls retain access to the full history. Search covers all pages, and grouped trades are explicitly scoped to the current page. |
| [security_logs_api.py](../backend/security_logs_api.py), `combined_security_logs` | On page N, downloaded N pages from every source even for a single configured source. | Single-source reads use SQL LIMIT/OFFSET. Multi-source merging keeps its existing correct global ordering. |
| [app.py](../backend/app.py), `api_security_coverage` | Counted every security event just to verify the table was readable. | `SELECT 1 ... LIMIT 1`; still checks actual database access. |
| [app.py](../backend/app.py), activity map; [login_locations.py](../backend/login_locations.py) | Map queries read unused event details; location enrichment read an unused timestamp. | Select only fields consumed by the map/location feature. Accurate device/IP attribution remains. |
| [market_cache.py](../backend/market_cache.py), `read_history` | Repeated public, monthly-snapshot history requests re-read the same stored JSON. | Public history only: 60-second, 16-symbol process cache; copied results; invalidate on history/monthly-snapshot writes. Database identities use a fingerprint, not credentials, in cache keys. No balances, users, authentication or security snapshots are cached. |
| Polling components below | Coverage, maps and incident details continued polling hidden tabs; some allowed overlapping work. | Hidden-tab suspension, foreground refresh, and in-flight guards. Heartbeat remains every 60 seconds while visible, with immediate foreground revalidation. |

## Polling intervals

All intervals are foreground reconciliation intervals. Initial reads and appropriate focus/online refreshes remain; mutations are never automatically retried.

| Resource | Before | After |
|---|---:|---:|
| SOC overview and active alerts | 5 s | 10 s |
| Alert review table | 5 s | 10 s |
| Login activity map | 5 s | 10 s |
| Full security logs | 5 s | 15 s |
| Security coverage configuration/access check | 5 s | 60 s |
| Infrastructure/deployment/uptime checks | 15 s | 60 s |
| Active sessions and account-access directory | 15 s | 30 s |
| Incident list | 15 s | 30 s |
| Selected incident detail/investigation | 15 s | 15 s, visible only |
| Accounts, balances, holdings, transactions | 10 s | 30 s + committed-action notifications |
| Saved watchlist membership | 10 s | 60 s + watchlist-change notifications |
| Profile/photo | 15 s | 120 s + profile-change notifications |
| Exchange status / saved market clock | 15 s | 60 s |
| Market asset catalogue | 60 s | 300 s |
| Watchlist quotes | 30 s | 60 s |
| Price-history chart | 60 s | 300 s |
| Selected symbol trading status | 15 s | 15 s, visible only |
| Session heartbeat | 60 s | 60 s, visible only + foreground validation |
| Chart animation / clock ticks | 1–5 s | Unchanged; these are local animation, not database reads. |

## Evidence, estimates and limits

- **Measured in an isolated fixture:** 17,280 uptime samples become at most 147 SQL result rows; serialized aggregate result bytes are less than 3% of the old raw result. Sample counts and availability remain equal. PostgreSQL wire bytes are not identical to JSON fixture bytes.
- **Estimated uptime-history transfer saving:** greater than 97% per full-day result, and approximately 99% for that history-read component when combined with 15→60-second polling. This does not include authorization, connection overhead or other endpoint traffic.
- **Estimated polling reductions at steady foreground use:** 50% for five→ten-second SOC reads; 67% for ten→thirty-second customer reads; 75% for infrastructure polling; 87.5% for profile polling; 91.7% for coverage polling. Not additive and not a percentage reduction of total project usage.
- **Measured authentication fixture:** a 64 KB photo is omitted from a lightweight response under 500 bytes. Normal profile requests still return the photo. Actual savings depend on real photo sizes and navigation volume.
- **Measured browser initial-load resource entries:** one each for account list, scoped portfolio, profile, exchanges, saved market clock, watchlist and each displayed quote. The full SOC and customer APIs returned 200 during local checks; transaction pagination returned 25 requested rows out of 97 existing entries.
- **No measured project-wide savings claim:** the 4.1 GB figure came from the user. Neon Console/Consumption API usage, production query-frequency statistics, active viewer hours and external export/replication settings were not available here. A total monthly GB reduction cannot be attributed or guaranteed from code inspection alone.

Neon counts database-to-client traffic through its proxy, including direct and pooled connections. HTTP/gzip and smaller Vercel bundles alone do not reduce SQL bytes transferred from Neon. See [Neon's transfer documentation](https://neon.com/docs/introduction/network-transfer) and [Psycopg pooling semantics](https://www.psycopg.org/psycopg3/docs/advanced/pool.html).

## Remaining attention

1. Deploy both updated services, then compare the Neon usage increase over comparable 24–48-hour periods. Rough remaining allowance at the reported usage: 0.9 GB. Actual monitoring and public traffic can still exhaust the allowance; no fixed-volume guarantee is possible for unrestricted traffic.
2. Incident lists and the SOC user directory still return complete lists; their polling is reduced. Very large deployments should add coordinated server-side filtering/pagination rather than silently hiding older incidents or users.
3. Merging local and live log databases still fetches up to N pages from each source for page N. The production single-source path is fixed; globally correct multi-source keyset pagination is a separate change.
4. Portfolio history remains bounded at 10,000 observations per account and is fetched fresh. Range-based history loading could further reduce older/larger portfolios without discarding chart coverage.
5. No active background scheduler, recurring dump or export was found in the repository. The market refresh is an explicitly run monthly job. Hosted Neon integrations, replication, external cron jobs and open database GUI tools were not independently inspectable and remain possible contributors.
6. Counts/trend aggregates over security events still execute live. Appropriate indexes help compute cost, but do not by themselves reduce returned network bytes. Authentication/authorization checks intentionally remain uncached.
7. Pools are process-local, capped at four connections **per worker**, and not a shared cross-worker cache. No connection string or deployment settings were changed. Public history cache invalidation across workers has a maximum 60-second TTL; account and security state are excluded.

## Validation

- Frontend production TypeScript/Vite build: passed.
- Frontend tests: 43 passed.
- Backend tests: 152 passed, including PostgreSQL temporary-table verification and a real pooled-connection rollback/reuse test; no live customer tables were modified by these checks.
- Python syntax/import validation: compileall passed; full application imports exercised by tests.
- Covered regressions include authentication, immediate suspension/revocation, owner protections, account isolation, buy/sell and transfer correctness, conservation/idempotence, SOC alerts/escalation, sessions, locations, logs, incidents, uptime results, pagination/search, and public-cache invalidation.
- Browser checks used live authenticated local API reads and isolated UI checks; no real trades or transfers were submitted.
- `git diff --check`: passed.

## Files modified in this bandwidth phase

- [backend/access_api.py](../backend/access_api.py)
- [backend/active_sessions.py](../backend/active_sessions.py)
- [backend/app.py](../backend/app.py)
- [backend/customer_accounts.py](../backend/customer_accounts.py)
- [backend/incident_response.py](../backend/incident_response.py)
- [backend/infrastructure_history.py](../backend/infrastructure_history.py)
- [backend/login_locations.py](../backend/login_locations.py)
- [backend/market_cache.py](../backend/market_cache.py)
- [backend/postgres_adapter.py](../backend/postgres_adapter.py)
- [backend/postgres_connection.py](../backend/postgres_connection.py)
- [backend/security_logs_api.py](../backend/security_logs_api.py)
- [backend/tests/test_bandwidth.py](../backend/tests/test_bandwidth.py)
- [backend/tests/test_bandwidth_postgres.py](../backend/tests/test_bandwidth_postgres.py)
- [backend/trading_api.py](../backend/trading_api.py)
- [frontend/src/App.tsx](../frontend/src/App.tsx)
- [frontend/src/components/AllSecurityLogs.tsx](../frontend/src/components/AllSecurityLogs.tsx)
- [frontend/src/components/CustomerSearch.tsx](../frontend/src/components/CustomerSearch.tsx)
- [frontend/src/components/GlobalMarketsClock.tsx](../frontend/src/components/GlobalMarketsClock.tsx)
- [frontend/src/components/SecurityActivityMap.tsx](../frontend/src/components/SecurityActivityMap.tsx)
- [frontend/src/components/SecurityAlerts.tsx](../frontend/src/components/SecurityAlerts.tsx)
- [frontend/src/components/SecurityCoverage.tsx](../frontend/src/components/SecurityCoverage.tsx)
- [frontend/src/components/SignInLocationPrompt.tsx](../frontend/src/components/SignInLocationPrompt.tsx)
- [frontend/src/components/StockPriceHistory.tsx](../frontend/src/components/StockPriceHistory.tsx)
- [frontend/src/demo/customerDemo.ts](../frontend/src/demo/customerDemo.ts)
- [frontend/src/demo/securityDemo.ts](../frontend/src/demo/securityDemo.ts)
- [frontend/src/experience/sharedFetch.ts](../frontend/src/experience/sharedFetch.ts)
- [frontend/src/experience/useRemoteData.ts](../frontend/src/experience/useRemoteData.ts)
- [frontend/src/hooks/useAccountProfile.ts](../frontend/src/hooks/useAccountProfile.ts)
- [frontend/src/hooks/useAccounts.ts](../frontend/src/hooks/useAccounts.ts)
- [frontend/src/hooks/useActiveAlerts.ts](../frontend/src/hooks/useActiveAlerts.ts)
- [frontend/src/hooks/useExchanges.ts](../frontend/src/hooks/useExchanges.ts)
- [frontend/src/hooks/usePortfolio.ts](../frontend/src/hooks/usePortfolio.ts)
- [frontend/src/hooks/useSecurityOverview.ts](../frontend/src/hooks/useSecurityOverview.ts)
- [frontend/src/hooks/useTransactions.ts](../frontend/src/hooks/useTransactions.ts)
- [frontend/src/hooks/useWatchlist.ts](../frontend/src/hooks/useWatchlist.ts)
- [frontend/src/hooks/useWatchlistQuotes.ts](../frontend/src/hooks/useWatchlistQuotes.ts)
- [frontend/src/i18n/fr.json](../frontend/src/i18n/fr.json)
- [frontend/src/onboarding/WelcomeTour.tsx](../frontend/src/onboarding/WelcomeTour.tsx)
- [frontend/src/screens/AccessManagement.tsx](../frontend/src/screens/AccessManagement.tsx)
- [frontend/src/screens/ActiveSessions.tsx](../frontend/src/screens/ActiveSessions.tsx)
- [frontend/src/screens/CustomerSettings.tsx](../frontend/src/screens/CustomerSettings.tsx)
- [frontend/src/screens/Incident.tsx](../frontend/src/screens/Incident.tsx)
- [frontend/src/screens/NetworkInfrastructure.tsx](../frontend/src/screens/NetworkInfrastructure.tsx)
- [frontend/src/screens/SecurityDashboard.tsx](../frontend/src/screens/SecurityDashboard.tsx)
- [frontend/src/screens/TradeExplore.tsx](../frontend/src/screens/TradeExplore.tsx)
- [frontend/src/screens/Transactions.tsx](../frontend/src/screens/Transactions.tsx)
- [frontend/src/utils/portfolioSync.ts](../frontend/src/utils/portfolioSync.ts)
- [frontend/tests/sharedFetch.test.ts](../frontend/tests/sharedFetch.test.ts)
- [requirements.txt](../requirements.txt)

## Welcome-tour follow-up

The requested follow-up now preloads route code only, prevents manual wheel/touch/keyboard scrolling, and uses event-driven geometry rather than repeated 300 ms layout polling. Tour steps advance locally without waiting for a database write; only starting/exiting/completing writes progress. Cards have stable responsive sizing. All 13 steps were verified without clipped controls on desktop and a 320×568 French phone layout; scroll input was prevented and normal scrolling restored on completion.

Only the registration sign-in may claim the automatic invitation, once. A later login or reload never resumes an unfinished tour automatically. Settings can explicitly replay it. This behavior is verified by backend tests, including a real second-login flow against disposable accounts.

Follow-up files: [welcome_tour.py](../backend/welcome_tour.py), [registration_api.py](../backend/registration_api.py), [access_api.py](../backend/access_api.py), [App.tsx](../frontend/src/App.tsx), [WelcomeTour.tsx](../frontend/src/onboarding/WelcomeTour.tsx), [preload.ts](../frontend/src/onboarding/preload.ts), [welcome-tour.css](../frontend/src/onboarding/welcome-tour.css), [fr.json](../frontend/src/i18n/fr.json), and [test_welcome_tour.py](../backend/tests/test_welcome_tour.py).
