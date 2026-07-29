# Deployment preflight

Read-only preflight for the exact accepted Tapestry release. No remote command, migration, publish, activation, or rollback was executed.

- Candidate hash: `1216a676f827da554bb9dc0e5d1c53490b6c2d7762a41548a9ae797f3bb83624`
- Decision: **NO-GO**
- Generated: 2026-07-23T03:12:29.904Z

| Result | Check | Detail |
| --- | --- | --- |
| HOLD | accepted-release-artifact | hash=1216a676f827da554bb9dc0e5d1c53490b6c2d7762a41548a9ae797f3bb83624; files=717; bytes=34522833 |
| HOLD | tapestry-lockfile | package-lock.json absent; build currently relies on the checked-in package manifest only |
| PASS | webstudio-lockfile | package-lock.json present |
| HOLD | runtime-env-presence | .env absent; only .env.example is present |
| PASS | migration-compatibility-scan | conversion migration has no destructive DROP/TRUNCATE operations |
| HOLD | migration-backup | database backup cannot be verified without the deployment host and explicit credentials |
| HOLD | active-release-snapshot | active release pointer/rollback id requires read-only access to the live publisher/storage |
| HOLD | deployment-authorization | deploy.sh, migration, publish, and activation are outward-facing; no explicit authorization supplied |

A **NO-GO** is expected until Steve explicitly authorizes the outward-facing deployment and provides/opens the deployment context needed to capture the active-release snapshot and verify the database backup.
