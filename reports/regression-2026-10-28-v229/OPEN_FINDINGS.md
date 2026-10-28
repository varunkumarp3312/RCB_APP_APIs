# Open regression finding — REG-229-001

**Status:** Open; reproduced twice. **Area:** Add Funds duplicate-order response.

1. Sign in as the configured test player and get their user_id (collection requests 112 and 130).
2. Open the Add Funds payment page using request 131. Confirm the gateway starts the order and request 132 finds a pending PG deposit.
3. Reopen the exact same URL with the same order ID using request 133. Do not pay the order.

**Expected:** HTTP 200, X-Payin-Result=duplicate_order, X-Payin-Reason=duplicate; heading “Payment could not be started”; the documented repeat-order explanation, reference, home navigation and no WhatsApp button.

**Observed:** HTTP 200; heading “Adding funds is not available right now”. Four contract checks failed: duplicate verdict, reason, title and explanation. The repeat-order explanation is absent. Actual response headers were evaluated in memory but were not captured in the first two reports; future runs capture the three X-Payin headers.

**Evidence:** request 133 in api-execution-report.json and retest/api-execution-report.json. Both original full-run responses are preserved. The consolidated final-execution-report.json/.pdf contains the latest response.

**Impact established:** The repeat-order page does not give the required duplicate refusal. No duplicate charge or second PG order has been demonstrated. Check payment-service logs and order records before concluding that order creation itself is duplicated.

**Retest:** Replay the 22 new-feature scenarios with a dedicated test player and a fresh output directory after the service fix. This starts one unpaid order; no payment is needed.


## NEW-022 revised-scope retest

Per the user’s revised requirement, NEW-022 now uses a fresh unique order ID and amount INR 600, with HTTP 200 as its pass condition. The isolated retest returned HTTP 200: **PASS**. Order ID: 1793181535977125. Only the login/profile prerequisites and NEW-022 were executed. Payment completion and PG success were not asserted.

Evidence: new022-600-retest/api-execution-report.json and .pdf. The master suite reflects this revised scope. Earlier consolidated totals remain historical results under the original duplicate-order assertions. REG-229-001 was not retested under its original criteria and is not established as fixed.
