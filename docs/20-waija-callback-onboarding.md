# Waija callback onboarding

URL: https://h6688.win/api/waija/callback

This endpoint only establishes a reachable HTTPS address for credential onboarding. It always returns HTTP 200 with `{"error":2,"balance":0}` and disables browser/CDN caching. It has no database, wallet, session, credential or transaction dependency. A 200 response means transport reachability, not successful signature validation or wallet integration. HEAD probes return no body; POST/OPTIONS also reject without touching funds.

Waija documents GET callbacks for balance, debit and credit. Before real-money sessions, implement signature validation using the provider's saltkey, the documented 30-second timestamp window, currency/player mapping, integer minor units, atomic ledger updates and call_id idempotency, including rollback and bonus_fs behavior. Keep api_login, api_password and saltkey in server-side Secrets; do not put them in source or chat. The existing NG adapter is not compatible merely by changing its API URL.

No v1.0 platform replacement or new-game rollout is included in this change.

References: https://documentation.waija.com/ ; https://documentation.waija.com/validation ; https://documentation.waija.com/balance ; https://documentation.waija.com/credit-and-debit
