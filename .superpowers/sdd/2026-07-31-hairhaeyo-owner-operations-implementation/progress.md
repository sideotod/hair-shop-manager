# SDD ledger — plan: docs/superpowers/plans/2026-07-31-hairhaeyo-owner-operations-implementation.md

Task 1: minor (deferred): persistent-file reopen test for seed idempotency
Task 1: fix round 1/5 (3 addressed, 0 open — refund linkage; JSON boundary; seed audit history; commits 366ed35..65d1593)
Task 1: complete (commits 8b8fc99..65d1593, review clean)

Task 2: fix round 1/5 (5 addressed, 2 open - production demo session secret; production demo password hash; commits 507d1c2..450775e)
Task 2: fix round 2/5 (2 addressed, 0 open - production demo session secret; production demo password hash; commits 450775e..f48445a)
Task 2: complete (commits 507d1c2..f48445a, review clean)

Task 3: review found 8 open items - telephone persistence; functional histories; payment preselection; print layouts; real segments; bulk/policy updates; strict date/time validation; behavioral tests
Task 3: fix round 1/5 (5 addressed, 3 open - configurable power/birthday segments; registration defaults from policy; remaining behavioral tests; commits 9847a20..707a29b)
Task 3: fix round 2/5 (3 addressed, 0 open - configurable segments; registration defaults; behavioral tests; commits 707a29b..d420d77)
Task 3: complete (commits 241b2b2..d420d77, review clean)
Task 3: post-completion build fix (commit 3153bfe - moved sync helpers out of use-server module; production build restored)

Task 4: review found 5 open items - validate before new customer mutation/server-generated id; reject archived booking resurrection; calendar month navigation; surfaced action errors/correction state; KST today
Task 4: fix round 1/5 (5 addressed, 0 open - mutation ordering; archived guard; calendar navigation; action errors; KST today; commits 3153bfe..39dd423)
Task 4: complete (commits d420d77..39dd423, review clean)

Task 5: review found 10 open items - split payment aggregation; points-used settlement; KST business dates; dynamic today; refund/correction UI and replacement; refundable point debt; ten services; error state; customer payment link; CSV escaping
Task 5: fix round 1/5 (7 criteria addressed, 4 issues open - points tender consistency; correction point projection; concurrent correction uniqueness; nonnegative payment pie; commits 9e34c50..dd8977c)
Task 5: fix round 2/5 (4 addressed, 0 open - points tender; correction projection; duplicate reversal constraint; nonnegative payment pie; commits dd8977c..dc90653)
Task 5: complete (commits 74ac605..dc90653, review clean)

Task 6: scope revised by user on 2026-08-03 - product and coupon workflows excluded; prepaid maps to existing payment-ledger workflow
Task 6: fix round 1/5 (6 addressed, 1 new open - filtered expense print period; commits b8c8184..23765a2)
Task 6: fix round 2/5 (1 addressed, 0 open - filtered expense print period; commits 23765a2..47a840b)
Task 6: complete (commits dc90653..47a840b, review clean)

Task 7: scope revised by user on 2026-08-03 - minimal dry-run messaging only; provider/templates/delivery history excluded
Task 7: fix round 1/5 (5 addressed, 0 open - recipient preview; deduplication; text normalization; sender; tests; commits 15d86f4 + cb0a73e)
Task 7: complete (commits 15d86f4 + cb0a73e, review clean; concurrent README/main merge preserved)

Task 8: review found 8 open items - dead settings; inaccurate coverage; error leak; visual defaults/contrast; overlay token scope; password tests; password whitespace; prepaid mapping
Task 8: fix round 1/5 (7 addressed, 2 open - prepaid coverage mapping; reminderText server limit; commits 45d3595..f0168e6)
Task 8: fix round 2/5 (2 addressed, 0 open - prepaid coverage mapping; reminderText server limit; commits f0168e6..d070357)
Task 8: complete (commits bef5fe5..d070357 excluding concurrent README commits, review clean)

Task 9: review found 3 open items - packaged SQLite data; unauthenticated loopback readiness; overly broad pending coverage status
Task 9: fix round 1/5 (3 addressed, 0 open - standalone data stripping; per-run health token; Naver-only pending rows; commit 505ca8f)
Task 9: complete (commit 505ca8f, review clean; main pushed)

Task 10 credential boundary: review found 2 open items - packaged helper path; native read-blob zeroing
Task 10 credential boundary: fix round 1/5 (2 addressed, 1 new open - real PowerShell smoke timeout; commits c8879ef..471eea4)
Task 10 credential boundary: fix round 2/5 (1 addressed, 0 open - test-local bounded timeout; commit 4334fc6)
Task 10 credential boundary: complete (commits c8879ef..4334fc6, scoped review approved)
Task 10 integration: review found 3 open items - raw error secret leak; reconnect checkpoint reset; safe correction message visibility
Task 10 integration: fix round 1/5 (3 addressed, 0 open; commit 81fb2ff)
Task 10 integration: complete (commits a204263..81fb2ff, scoped review approved)

Task 10 post-completion: startup sync guard moved out of render flow (commit ca481bf)
Task 10 post-completion: standalone packaged resource path fixed (commit 934ab47)
Task 10 post-completion: 1280px page overflow fixed (commit b81ff26)
Task 10 post-completion: recursive Tauri sidecar resources prevented (commit 75c940f)

Final fix wave (2026-08-03): review found 5 open items - trusted Naver sender/subject classification; same-UID cancellation archival recovery; phone-first/unambiguous-name customer matching; auth→credential→initial-import→metadata connection ordering with rollback; FUNCTION.md 5.2 mail-replacement guidance and traceability
Final fix wave: TDD RED confirmed 10 focused regression failures across RED runs, plus 1 follow-up traceability failure for remaining direct-API rows
Final fix wave: 5 addressed, 0 open - exact booking_noreply@naver.com sender and subject marker; idempotent cancellation archive retry; normalized phone and unique-active-name matching; credential deletion with prior disconnected checkpoint preservation; SmartPlace/app-password/single-owner FAQ and official links; mail-replacement coverage statuses
Final fix wave review: 2 follow-up findings addressed, 0 open - simplified unique-name matcher; rows 216/260/264 also mapped to user-approved mail replacement so coverage makes no direct API claim
Final fix wave verification: focused tests 45/45; full tests 185/185; typecheck passed; Next production build passed; npm production audit found 0 vulnerabilities
