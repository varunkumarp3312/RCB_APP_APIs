# ALL_TEST_CASE - Production API Execution Report

**Executed:** 2026-10-26 (IST)  
**Target:** `https://api.rcbmatka.com`  
**Result:** 57 passed / 0 failed / 0 not run across 57 checks.  
**Evidence:** Response excerpts are sanitized; personal, authentication, payment, account, and financial values are redacted. Login credentials are not reproduced.

## Summary

| Metric | Count |
|---|---:|
| Total checks | 57 |
| Passed | 57 |
| Failed | 0 |
| HTTP 200 | 48 |
| HTTP 400 (expected invalid input) | 1 |
| HTTP 401 (expected authentication refusal) | 3 |
| HTTP 404 (expected removed routes) | 5 |

This was a constrained production run: one authorized login followed by read-only queries and harmless refusal cases. It did not place a bet or withdrawal, change account/bank/contact settings, close or create a support conversation, or initiate a payment. Security testing was limited to authentication and response-data checks; no exploitation was attempted.

## Test cases

### TC-01 - One authorized production login

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/user-login`
- **Test data:** `"credentials supplied privately"`
- **Check:** Token and credential not included in report.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Login successful",
  "token": "[REDACTED]",
  "data": {
    "id": "[REDACTED]",
    "username": "[REDACTED]",
    "mobile": "[REDACTED]",
    "device_id": "[REDACTED]",
    "credit": "[REDACTED]",
    "has_received_bonus": true
  }
}
```

### TC-02 - Profile shape, numeric balance and withdrawal limits

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/get-profile-usser`
- **Test data:** `"(none)"`
- **Check:** Profile and API response format.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Your profile, balance and app settings.",
  "data": {
    "bonus_qualifying_deposit": {
      "amount": "[REDACTED]",
      "order_id": "[REDACTED]",
      "deposit_id": "[REDACTED]",
      "at": "2026-06-29T12:00:40.633Z"
    },
    "_id": "[REDACTED]",
    "app_id": "[REDACTED]",
    "user_id": "[REDACTED]",
    "mobile": "[REDACTED]",
    "username": "[REDACTED]",
    "device_id": "[REDACTED]",
    "color": "green",
    "inactive_reason": "",
    "status": "active",
    "registered_by": "[REDACTED]",
    "has_received_bonus": true,
    "credit": "[REDACTED]",
    "win_amount": "[REDACTED]",
    "loss_amount": "[REDACTED]",
    "withdraw_min...[truncated]
```

### TC-03 - App setting allowlist

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/app-setting-list`
- **Test data:** `"(none)"`
- **Check:** Allows _id and exactly 15 app fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The app settings.",
  "data": {
    "_id": "[REDACTED]",
    "max_deposit": "49999",
    "max_withdraw": "5000",
    "min_deposit": "100",
    "min_withdraw": "1",
    "per_day_withdraw_request": "30",
    "whatsapp_Number": "",
    "withdraw_close_time": "23:59",
    "withdraw_enable_disable": "yes",
    "withdraw_open_time": "00:00",
    "home_screen_marquee": "Welcome TO RCB Matka No.1  TRUSTED APP . PLAY BIG WIN BIG.",
    "deposit_on_off": "on",
    "whatsapp_Number_first": "",
    "apk_version": "3",
    "withdraw_upi": "[REDACTED]",
    "bonus_unlock_min_deposit": 500
  }
}
```

### TC-04 - Public contact settings allowlist

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/front-user-contact-us`
- **Test data:** `"(none)"`
- **Check:** Allows _id and exactly 15 app fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The contact details and app settings.",
  "data": [
    {
      "_id": "[REDACTED]",
      "max_deposit": "49999",
      "max_withdraw": "5000",
      "min_deposit": "100",
      "min_withdraw": "1",
      "per_day_withdraw_request": "30",
      "whatsapp_Number": "",
      "withdraw_close_time": "23:59",
      "withdraw_enable_disable": "yes",
      "withdraw_open_time": "00:00",
      "home_screen_marquee": "Welcome TO RCB Matka No.1  TRUSTED APP . PLAY BIG WIN BIG.",
      "deposit_on_off": "on",
      "whatsapp_Number_first": "",
      "apk_version": "3",
      "withdraw_upi": "false",
      "bonus_unlock...[truncated]
```

### TC-05 - Profile settingData allowlist

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/get-profile-usser`
- **Test data:** `"(profile read)"`
- **Check:** Fields=16; extras=
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Your profile, balance and app settings.",
  "data": {
    "bonus_qualifying_deposit": {
      "amount": "[REDACTED]",
      "order_id": "[REDACTED]",
      "deposit_id": "[REDACTED]",
      "at": "2026-06-29T12:00:40.633Z"
    },
    "_id": "[REDACTED]",
    "app_id": "[REDACTED]",
    "user_id": "[REDACTED]",
    "mobile": "[REDACTED]",
    "username": "[REDACTED]",
    "device_id": "[REDACTED]",
    "color": "green",
    "inactive_reason": "",
    "status": "active",
    "registered_by": "[REDACTED]",
    "has_received_bonus": true,
    "credit": "[REDACTED]",
    "win_amount": "[REDACTED]",
    "loss_amount": "[REDACTED]",
    "withdraw_min...[truncated]
```

### TC-06 - Main market list schema/timezone

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/main-market-list`
- **Test data:** `"(none)"`
- **Check:** Checks list, phase/bidding and timezone.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Today's main markets: 57, 38 of them taking bids now.",
  "server_time": "2026-10-26T13:37:23+05:30",
  "timezone": "Asia/Kolkata",
  "data": [
    {
      "id": "[REDACTED]",
      "market_name": "Sai Morning",
      "market_id": "[REDACTED]",
      "type": "mainmarket",
      "open_time": "09:15",
      "close_time": "10:15",
      "open_result_time": "09:25",
      "close_result_time": "10:25",
      "betStatus": "Close",
      "openstatus": "Close",
      "closestatus": "Close",
      "betStatusMsg": "Close For Today",
      "result": "***-**-***",
      "phase": "closed",
      "bidding": "none",
      "...[truncated]
```

### TC-07 - Starline list schema/timezone

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/kingstarline-market-list`
- **Test data:** `"(none)"`
- **Check:** Checks list, phase/bidding and timezone.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Today's Starline draws: 13, 9 of them taking bids now.",
  "server_time": "2026-10-26T13:37:23+05:30",
  "timezone": "Asia/Kolkata",
  "data": [
    {
      "id": "[REDACTED]",
      "market_name": "10:30 AM",
      "market_id": "[REDACTED]",
      "type": "kingstarline",
      "close_time": "10:25",
      "close_result_time": "10:30",
      "betStatus": "Close",
      "betStatusMsg": "Close For Today",
      "result": "***-*",
      "phase": "closed",
      "bidding": "none",
      "close_bids_until": "10:25",
      "status_text": "Closed for today."
    },
    {
      "id": "[REDACTED]",
      "market_name"...[truncated]
```

### TC-08 - King Jackpot list schema/timezone

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/kingjackport-market-list`
- **Test data:** `"(none)"`
- **Check:** Checks list, phase/bidding and timezone.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Today's King Jackpot draws: 13, 9 of them taking bids now.",
  "server_time": "2026-10-26T13:37:24+05:30",
  "timezone": "Asia/Kolkata",
  "data": [
    {
      "id": "[REDACTED]",
      "market_name": "Jackpot 10:00 AM",
      "market_id": "[REDACTED]",
      "type": "kingjackport",
      "close_time": "09:55",
      "close_result_time": "10:00",
      "betStatus": "Close",
      "betStatusMsg": "Close For Today",
      "result": "**",
      "phase": "closed",
      "bidding": "none",
      "close_bids_until": "09:55",
      "status_text": "Closed for today."
    },
    {
      "id": "[REDACTED]",
      "mar...[truncated]
```

### TC-09 - Support contacts configured-or-empty response

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/support-contacts`
- **Test data:** `"(none)"`
- **Check:** Expected configured lists or documented empty response.
- **Sanitized response excerpt:**

```json
{
  "success": "2",
  "message": "No support WhatsApp or call number is switched on right now.",
  "data": {
    "whatsapp": [],
    "call": [],
    "email": "[REDACTED]",
    "telegram": "https://www.googlercbmatka.com/"
  }
}
```

### TC-10 - Support WhatsApp configured-or-empty response

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/support-whatsapp`
- **Test data:** `"(none)"`
- **Check:** Documented empty-or-configured response.
- **Sanitized response excerpt:**

```json
{
  "success": "2",
  "message": "No support WhatsApp number is switched on right now."
}
```

### TC-11 - Onboarding WhatsApp configured-or-empty response

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/onboarding-whatsapp`
- **Test data:** `"(none)"`
- **Check:** Documented empty-or-configured response.
- **Sanitized response excerpt:**

```json
{
  "success": "2",
  "message": "No sign-up WhatsApp number is switched on right now."
}
```

### TC-12 - Player game rates response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/my-game-rates`
- **Test data:** `"(none)"`
- **Check:** Read-only; no bids placed.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Your game rates: the standard rates.",
  "data": {
    "unit": 10,
    "kingjackport": {
      "jodi_digit": {
        "rate": 1000,
        "min": 5,
        "max": 100000
      },
      "jodi_digit_bulk": {
        "rate": 100,
        "min": 5,
        "max": 100000
      },
      "group_jodi": {
        "rate": 100,
        "min": 5,
        "max": 100000
      }
    },
    "mainmarket": {
      "single_digit": {
        "rate": 100,
        "min": 5,
        "max": 10000
      },
      "single_digit_bulk": {
        "rate": 10,
        "min": 5,
        "max": 10000
      },
      "single_pana": {
      ...[truncated]
```

### TC-13 - Main-market rate limits response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/main-market-gameRate-list`
- **Test data:** `"(none)"`
- **Check:** Read-only; no bids placed.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The min and max bid of 16 main market games.",
  "data": {
    "single_digit": {
      "min": 5,
      "max": 10000
    },
    "single_pana": {
      "min": 5,
      "max": 10000
    },
    "double_pana": {
      "min": 5,
      "max": 10000
    },
    "triple_pana": {
      "min": 5,
      "max": 10000
    },
    "sp_dp_tp": {
      "min": 5,
      "max": 10000
    },
    "sp_motor": {
      "min": 5,
      "max": 10000
    },
    "dp_motor": {
      "min": 5,
      "max": 10000
    },
    "jodi_digit": {
      "min": 5,
      "max": 10000
    },
    "half_sangam_a": {
      "min": 5,
      "max": 10000
    ...[truncated]
```

### TC-14 - Starline rate limits response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/king-starline-gameRate-list`
- **Test data:** `"(none)"`
- **Check:** Read-only; no bids placed.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The min and max bid of 12 Starline games.",
  "data": {
    "sp_dp_tp": {
      "min": 5,
      "max": 1000
    },
    "triple_pana": {
      "min": 5,
      "max": 1000
    },
    "single_pana_bulk": {
      "min": 5,
      "max": 10000
    },
    "single_digit": {
      "min": 5,
      "max": 10000
    },
    "sp_motor": {
      "min": 5,
      "max": 10000
    },
    "single_digit_bulk": {
      "min": 5,
      "max": 100000
    },
    "group_pana": {
      "min": 5,
      "max": 10000
    },
    "double_pana_bulk": {
      "min": 5,
      "max": 10000
    },
    "double_pana": {
      "min": 5,
      "max...[truncated]
```

### TC-15 - Jackpot rate limits response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/king-jackport-gameRate-list`
- **Test data:** `"(none)"`
- **Check:** Read-only; no bids placed.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The min and max bid of 4 King Jackpot games.",
  "data": {
    "jodi_digit": {
      "min": 5,
      "max": 100000
    },
    "jodi_digit_bulk": {
      "min": 5,
      "max": 100000
    },
    "group_jodi": {
      "min": 5,
      "max": 100000
    },
    "digits_based_jodi": {
      "min": 5,
      "max": 100000
    }
  }
}
```

### TC-16 - Number list singlePana

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/number-list`
- **Test data:** `{"type":"singlePana"}`
- **Check:** Expected 120 unique values.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The 120 panas for Single Pana.",
  "data": [
    "120",
    "123",
    "124",
    "125",
    "126",
    "127",
    "128",
    "129",
    "130",
    "134",
    "135",
    "136",
    "137",
    "138",
    "139",
    "140",
    "145",
    "146",
    "147",
    "148",
    "149",
    "150",
    "156",
    "157",
    "158",
    "159",
    "160",
    "167",
    "168",
    "169",
    "170",
    "178",
    "179",
    "180",
    "189",
    "190",
    "230",
    "234",
    "235",
    "236",
    "237",
    "238",
    "239",
    "240",
    "245",
    "246",
    "247",
    "248",
    "249",
    "250",
    "256",
    "257",...[truncated]
```

### TC-17 - Number list doublePana

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/number-list`
- **Test data:** `{"type":"doublePana"}`
- **Check:** Expected 90 unique values.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The 90 panas for Double Pana.",
  "data": [
    "100",
    "110",
    "112",
    "113",
    "114",
    "115",
    "116",
    "117",
    "118",
    "119",
    "122",
    "133",
    "144",
    "155",
    "166",
    "177",
    "188",
    "199",
    "200",
    "220",
    "223",
    "224",
    "225",
    "226",
    "227",
    "228",
    "229",
    "233",
    "244",
    "255",
    "266",
    "277",
    "288",
    "299",
    "300",
    "330",
    "334",
    "335",
    "336",
    "337",
    "338",
    "339",
    "344",
    "355",
    "366",
    "377",
    "388",
    "399",
    "400",
    "440",
    "445",
    "446",
...[truncated]
```

### TC-18 - Number list triplePana

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/number-list`
- **Test data:** `{"type":"triplePana"}`
- **Check:** Expected 10 unique values.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The 10 panas for Triple Pana.",
  "data": [
    "000",
    "111",
    "222",
    "333",
    "444",
    "555",
    "666",
    "777",
    "888",
    "999"
  ]
}
```

### TC-19 - Number list halfSangam

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/number-list`
- **Test data:** `{"type":"halfSangam"}`
- **Check:** Expected 220 unique values including 344
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The 220 panas for Half Sangam.",
  "data": [
    "000",
    "100",
    "110",
    "111",
    "112",
    "113",
    "114",
    "115",
    "116",
    "117",
    "118",
    "119",
    "120",
    "122",
    "123",
    "124",
    "125",
    "126",
    "127",
    "128",
    "129",
    "130",
    "133",
    "134",
    "135",
    "136",
    "137",
    "138",
    "139",
    "140",
    "144",
    "145",
    "146",
    "147",
    "148",
    "149",
    "150",
    "155",
    "156",
    "157",
    "158",
    "159",
    "160",
    "166",
    "167",
    "168",
    "169",
    "170",
    "177",
    "178",
    "179",
    "180",...[truncated]
```

### TC-20 - Number list fullSangam

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/number-list`
- **Test data:** `{"type":"fullSangam"}`
- **Check:** Expected 220 unique values including 344
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "The 220 panas for Full Sangam.",
  "data": [
    "000",
    "100",
    "110",
    "111",
    "112",
    "113",
    "114",
    "115",
    "116",
    "117",
    "118",
    "119",
    "120",
    "122",
    "123",
    "124",
    "125",
    "126",
    "127",
    "128",
    "129",
    "130",
    "133",
    "134",
    "135",
    "136",
    "137",
    "138",
    "139",
    "140",
    "144",
    "145",
    "146",
    "147",
    "148",
    "149",
    "150",
    "155",
    "156",
    "157",
    "158",
    "159",
    "160",
    "166",
    "167",
    "168",
    "169",
    "170",
    "177",
    "178",
    "179",
    "180",...[truncated]
```

### TC-21 - Negative: unknown number-list type

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/number-list`
- **Test data:** `{"type":"invalid-test-type"}`
- **Check:** Harmless invalid value; no state change.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "Unknown list type. Send type as one of: singlePana, doublePana, triplePana, halfSangam, fullSangam."
}
```

### TC-22 - Withdrawal permission numeric fields

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/withdraw-manage-permission`
- **Test data:** `"(none)"`
- **Check:** Verifies stable business-field types.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Withdrawals: ₹1 to ₹5000 a time, 30 requests a day, from 00:00 to 23:59 (IST).",
  "data": {
    "min_withdraw": 1,
    "max_withdraw": 5000,
    "opentime": "00:00",
    "closetime": "23:59",
    "min_deposit": 100,
    "max_deposit": 49999,
    "per_day": 30,
    "source": "app",
    "withdrawals_enabled": true
  }
}
```

### TC-23 - Withdrawal limits agree across profile and limits endpoint

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/withdraw-manage-permission`
- **Test data:** `"profile vs permission"`
- **Check:** Compares source/min/max/per-day.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Withdrawals: ₹1 to ₹5000 a time, 30 requests a day, from 00:00 to 23:59 (IST).",
  "data": {
    "min_withdraw": 1,
    "max_withdraw": 5000,
    "opentime": "00:00",
    "closetime": "23:59",
    "min_deposit": 100,
    "max_deposit": 49999,
    "per_day": 30,
    "source": "app",
    "withdrawals_enabled": true
  }
}
```

### TC-24 - Bank account list response shape/privacy

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/withdraw-list-bank-account`
- **Test data:** `"(none)"`
- **Check:** No reviewer email/id/timestamp fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Your bank account ending 9012 is waiting for approval.",
  "data": [
    {
      "reason": null,
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "user_name": "[REDACTED]",
      "mobile": "[REDACTED]",
      "account_number": "[REDACTED]",
      "ifsc_code": "[REDACTED]",
      "bank_name": "State Bank of India",
      "account_holder_name": "[REDACTED]",
      "status": "pending",
      "created_at": "2026-06-29T12:07:41.198Z",
      "updated_at": "2026-10-24T08:13:46.370Z",
      "in_use": false
    }
  ]
}
```

### TC-25 - Approved bank list response shape/privacy

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/withdraw-list-bank-account-success`
- **Test data:** `"(none)"`
- **Check:** No reviewer email/id/timestamp fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "You have no approved bank account yet.",
  "data": []
}
```

### TC-26 - Withdrawal history excludes staff fields

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/withdraw-request-list?page=1&status=all`
- **Test data:** `"(none)"`
- **Check:** Checks player response privacy fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 1 of 2: 10 of your 16 withdrawal requests.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "user_name": "[REDACTED]",
      "mobile": "[REDACTED]",
      "amount": "[REDACTED]",
      "account_number": "[REDACTED]",
      "bank_name": "AU Small Bank",
      "ifsc_code": "[REDACTED]",
      "withdraw_payment_type": "bank",
      "account_holder_name": "[REDACTED]",
      "admin_approve": "no",
      "status": "pending",
      "reason": null,
      "date": "24-10-2026",
      "date_time": "2026-10-24 13:43:44",
      "total_withdraw": "[REDACTED]",
      "total_count_withdraw": 3,
      "...[truncated]
```

### TC-27 - Deposit channel allowlist and effective min/max

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/getway-list`
- **Test data:** `"(none)"`
- **Check:** No sensitive bank config fields; requires session.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "1 payment channel open for deposits.",
  "data": [
    {
      "_id": "[REDACTED]",
      "name": "PG",
      "min": 100,
      "max": 100000,
      "type": "online",
      "upi_id": "[REDACTED]",
      "status": "active",
      "effective_min": 100,
      "effective_max": 49999
    }
  ],
  "deposit_limits": {
    "min_deposit": 100,
    "max_deposit": 49999
  }
}
```

### TC-28 - Negative: getway-list requires session

- **Result:** PASS (HTTP 401)
- **Endpoint:** `GET /api/getway-list`
- **Test data:** `"(none)"`
- **Check:** No-token auth boundary.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "You are not logged in. Send your session token as Authorization: Bearer <token>."
}
```

### TC-29 - Main market history page 1

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/main-market-bet-history`
- **Test data:** `{"page":1}`
- **Check:** Page and total metadata present.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 1 of 8: 10 of your 75 main market bids.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "user_name": "[REDACTED]",
      "mobile": "[REDACTED]",
      "market_id": "[REDACTED]",
      "market_type": "mainmarket",
      "game_type_name": "triple_pana",
      "bet_key": 555,
      "bet_key1": 0,
      "bet_amount": 10,
      "session": "open",
      "result": "pending",
      "date": "24-10-2026",
      "date_time": "2026-10-24 14:31:08",
      "win_Amt": 0,
      "created_at": "2026-10-24T09:01:08.415Z",
      "updated_at": "2026-10-24T09:01:08.649Z",
      "__v": 0
   ...[truncated]
```

### TC-30 - Starline history page 1

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/kingstarline-market-bet-history`
- **Test data:** `{"page":1}`
- **Check:** Page and total metadata present.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 1 of 5: 10 of your 46 Starline bids.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "user_name": "[REDACTED]",
      "mobile": "[REDACTED]",
      "market_id": "[REDACTED]",
      "market_type": "kingstarline",
      "game_type_name": "triple_pana",
      "bet_key": 555,
      "bet_key1": 0,
      "bet_amount": 10,
      "win_amount": "[REDACTED]",
      "session": "open",
      "date": "24-10-2026",
      "date_time": "2026-10-24 17:21:01",
      "result": "loss",
      "bet_date": "24-10-2026",
      "bet_date_time": "2026-10-24 14:31:18",
      "rate": 7000,
      "declaratio...[truncated]
```

### TC-31 - King Jackpot history page 1

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/kingJackport-market-bet-history`
- **Test data:** `{"page":1}`
- **Check:** Page and total metadata present.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 1 of 1: 10 of your 10 King Jackpot bids.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "user_name": "[REDACTED]",
      "mobile": "[REDACTED]",
      "market_id": "[REDACTED]",
      "market_type": "kingjackport",
      "game_type_name": "group_jodi",
      "bet_key": 17,
      "bet_key1": 0,
      "bet_amount": 10,
      "session": "close",
      "result": "pending",
      "date": "24-10-2026",
      "date_time": "2026-10-24 14:31:21",
      "win_Amt": 0,
      "created_at": "2026-10-24T09:01:21.876Z",
      "updated_at": "2026-10-24T09:01:22.118Z",
      "__v": 0
 ...[truncated]
```

### TC-32 - History negative/boundary: page zero normalization

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/main-market-bet-history`
- **Test data:** `{"page":0}`
- **Check:** Paging/filter boundary; read-only.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 1 of 8: 10 of your 75 main market bids.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "user_name": "[REDACTED]",
      "mobile": "[REDACTED]",
      "market_id": "[REDACTED]",
      "market_type": "mainmarket",
      "game_type_name": "triple_pana",
      "bet_key": 555,
      "bet_key1": 0,
      "bet_amount": 10,
      "session": "open",
      "result": "pending",
      "date": "24-10-2026",
      "date_time": "2026-10-24 14:31:08",
      "win_Amt": 0,
      "created_at": "2026-10-24T09:01:08.415Z",
      "updated_at": "2026-10-24T09:01:08.649Z",
      "__v": 0
   ...[truncated]
```

### TC-33 - History negative/boundary: string page parsing

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/main-market-bet-history`
- **Test data:** `{"page":"2"}`
- **Check:** Paging/filter boundary; read-only.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 2 of 8: 10 of your 75 main market bids.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "user_name": "[REDACTED]",
      "mobile": "[REDACTED]",
      "market_id": "[REDACTED]",
      "market_type": "mainmarket",
      "game_type_name": "triple_pana",
      "bet_key": 555,
      "bet_key1": 0,
      "bet_amount": 10,
      "session": "open",
      "result": "pending",
      "date": "24-10-2026",
      "date_time": "2026-10-24 14:31:02",
      "win_Amt": 0,
      "created_at": "2026-10-24T09:01:02.630Z",
      "updated_at": "2026-10-24T09:01:02.868Z",
      "__v": 0
   ...[truncated]
```

### TC-34 - History negative/boundary: beyond-end page

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/main-market-bet-history`
- **Test data:** `{"page":9999}`
- **Check:** Paging/filter boundary; read-only.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 9999 is past the end: there are 8 pages of main market bids.",
  "data": [],
  "pagination": 10000,
  "totalRecords": 75,
  "totalNumberPage": 8,
  "total_win_amount": "[REDACTED]"
}
```

### TC-35 - History negative/boundary: unmatched market filter

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/main-market-bet-history`
- **Test data:** `{"page":1,"market_id":"[REDACTED]"}`
- **Check:** Paging/filter boundary; read-only.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "No main market bids match these filters.",
  "data": [],
  "pagination": 2,
  "totalRecords": 0,
  "totalNumberPage": 0,
  "total_win_amount": "[REDACTED]"
}
```

### TC-36 - Win total is numeric across filter

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/main-market-bet-history`
- **Test data:** `{"page":1,"result":["win"]}`
- **Check:** Win summary includes numeric total.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 1 of 1: 4 of your 4 matching bids.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "user_name": "[REDACTED]",
      "mobile": "[REDACTED]",
      "market_id": "[REDACTED]",
      "market_type": "mainmarket",
      "game_type_name": "single_digit",
      "bet_key": 9,
      "bet_key1": 0,
      "bet_amount": 20,
      "win_amount": "[REDACTED]",
      "session": "open",
      "date": "02-10-2026",
      "date_time": "2026-10-02 11:45:00",
      "result": "win",
      "bet_date": "02-10-2026",
      "bet_date_time": "2026-10-02 08:40:00",
      "rate": 100,
      "declaration_key...[truncated]
```

### TC-37 - Passbook all page 1

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/passbook-list`
- **Test data:** `{"page":1,"type":"all"}`
- **Check:** Page/filter + whole-ledger counts and totals.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 1 of 8: 20 of your 141 entries.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "mobile": "[REDACTED]",
      "username": "[REDACTED]",
      "type": "deposit",
      "open_amount": 3021,
      "amount": "[REDACTED]",
      "close_amount": 3341,
      "remark": "Win Amount ( 03:30PM Dp Motor :open 320 )",
      "action_by": "User",
      "bet_id": "[REDACTED]",
      "bet_entry": "win",
      "date": "24-10-2026",
      "date_time": "2026-10-24 17:21:01",
      "created_at": "2026-10-24T11:51:02.071Z",
      "updated_at": "2026-10-24T11:51:02.071Z",
      "__v": 0
    },
    {
...[truncated]
```

### TC-38 - Passbook all page 2

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/passbook-list`
- **Test data:** `{"page":2,"type":"all"}`
- **Check:** Page/filter + whole-ledger counts and totals.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 2 of 8: 20 of your 141 entries.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "mobile": "[REDACTED]",
      "username": "[REDACTED]",
      "type": "withdraw",
      "open_amount": 3111,
      "amount": "[REDACTED]",
      "close_amount": 3101,
      "remark": "Bid ( 03:30PM : Single Pana Bulk : open ) 137",
      "action_by": "User",
      "bet_id": "[REDACTED]",
      "bet_entry": "stake",
      "date": "24-10-2026",
      "date_time": "2026-10-24 14:31:12",
      "created_at": "2026-10-24T09:01:12.554Z",
      "updated_at": "2026-10-24T09:01:12.554Z",
      "__v": 0
    },
...[truncated]
```

### TC-39 - Passbook credit page 1

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/passbook-list`
- **Test data:** `{"page":1,"type":"credit"}`
- **Check:** Page/filter + whole-ledger counts and totals.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 1 of 1: 15 of your 15 credit entries.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "mobile": "[REDACTED]",
      "username": "[REDACTED]",
      "type": "deposit",
      "open_amount": 3021,
      "amount": "[REDACTED]",
      "close_amount": 3341,
      "remark": "Win Amount ( 03:30PM Dp Motor :open 320 )",
      "action_by": "User",
      "bet_id": "[REDACTED]",
      "bet_entry": "win",
      "date": "24-10-2026",
      "date_time": "2026-10-24 17:21:01",
      "created_at": "2026-10-24T11:51:02.071Z",
      "updated_at": "2026-10-24T11:51:02.071Z",
      "__v": 0
    },
...[truncated]
```

### TC-40 - Passbook debit page 1

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/passbook-list`
- **Test data:** `{"page":1,"type":"debit"}`
- **Check:** Page/filter + whole-ledger counts and totals.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 1 of 7: 20 of your 126 debit entries.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "mobile": "[REDACTED]",
      "username": "[REDACTED]",
      "type": "withdraw",
      "open_amount": 2931,
      "amount": "[REDACTED]",
      "close_amount": 2921,
      "remark": "Bid ( Jackpot03:00PM : Group Jodi : close ) 17",
      "action_by": "User",
      "bet_id": "[REDACTED]",
      "bet_entry": "stake",
      "date": "24-10-2026",
      "date_time": "2026-10-24 14:31:21",
      "created_at": "2026-10-24T09:01:22.197Z",
      "updated_at": "2026-10-24T09:01:22.197Z",
      "__v": 0
...[truncated]
```

### TC-41 - Passbook all page 9999

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/passbook-list`
- **Test data:** `{"page":9999,"type":"all"}`
- **Check:** Page/filter + whole-ledger counts and totals.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Page 9999 is past the end: there are 8 pages of entries.",
  "data": [],
  "totalRecords": 141,
  "totalNumberPage": 8,
  "page": 9999,
  "pageSize": 20,
  "type": "all",
  "counts": {
    "all": 141,
    "credit": "[REDACTED]",
    "debit": 126
  },
  "totals": {
    "money_in": "[REDACTED]",
    "money_out": "[REDACTED]"
  }
}
```

### TC-42 - Passbook legacy request with no page

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/passbook-list`
- **Test data:** `"no page"`
- **Check:** Compatibility mode returns all rows.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Your Passbook: 141 entries, newest first.",
  "data": [
    {
      "_id": "[REDACTED]",
      "user_id": "[REDACTED]",
      "mobile": "[REDACTED]",
      "username": "[REDACTED]",
      "type": "deposit",
      "open_amount": 3021,
      "amount": "[REDACTED]",
      "close_amount": 3341,
      "remark": "Win Amount ( 03:30PM Dp Motor :open 320 )",
      "action_by": "User",
      "bet_id": "[REDACTED]",
      "bet_entry": "win",
      "date": "24-10-2026",
      "date_time": "2026-10-24 17:21:01",
      "created_at": "2026-10-24T11:51:02.071Z",
      "updated_at": "2026-10-24T11:51:02.071Z",
      "__v": 0
    },
 ...[truncated]
```

### TC-43 - Notification list response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/notifiaction-list?page=1`
- **Test data:** `"(none)"`
- **Check:** Checks documented JSON/message fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "You have no notifications today.",
  "data": [],
  "totalRecords": 0,
  "unread": 0,
  "total": 0,
  "page": 1,
  "totalNumberPage": 1,
  "window": "today",
  "window_start": "2026-10-25T18:30:00.000Z",
  "clears_at": "2026-10-26T18:30:00.000Z"
}
```

### TC-44 - Unread support count response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/user-chat-count`
- **Test data:** `"(none)"`
- **Check:** Checks documented JSON/message fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "No unread replies from support.",
  "count": 0
}
```

### TC-45 - Referral summary response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/referral-summary`
- **Test data:** `"(none)"`
- **Check:** Checks documented JSON/message fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Your Refer & Earn summary: 2 friends referred.",
  "data": {
    "program": {
      "referral_enabled": true,
      "reward_amount": 100,
      "friend_reward_enabled": true,
      "friend_reward_amount": 50,
      "joining_enabled": true,
      "joining_amount": 50,
      "min_deposit": 500
    },
    "code": "RCBU5CU7",
    "share_text": "Play on RCB Matka with me! Use my referral code RCBU5CU7 when you join, then add ₹500 or more in one deposit: you get ₹50 and I get ₹100.",
    "qualified": true,
    "qualified_at": "2026-10-06T08:46:41.099Z",
    "joining_bonus": null,
    "friend_bonus": null,
    "lock...[truncated]
```

### TC-46 - Market timetable response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/main-market-time-table`
- **Test data:** `"(none)"`
- **Check:** Checks documented JSON/message fields.
- **Sanitized response excerpt:**

```json
{
  "success": true,
  "message": "Time table (IST): 57 main markets, 13 Starline draws, 13 King Jackpot draws.",
  "data": [
    {
      "_id": "[REDACTED]",
      "market_type": "mainmarket",
      "market_name": "Sai Morning",
      "market_id": "[REDACTED]",
      "open_time": "09:15",
      "close_time": "10:15",
      "open_result_time": "09:25",
      "close_result_time": "10:25",
      "sunday": true,
      "monday": true,
      "tuesday": true,
      "wednesday": true,
      "thursday": true,
      "friday": true,
      "saturday": true
    },
    {
      "_id": "[REDACTED]",
      "market_type": "mainmarket",
      "market_name": "R...[truncated]
```

### TC-47 - Game rates response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `GET /api/game-rate-list`
- **Test data:** `"(none)"`
- **Check:** Checks documented JSON/message fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "Game rates: 7 main market games, 4 Starline games, 3 King Jackpot games.",
  "mainMarketRatedata": [
    {
      "_id": "[REDACTED]",
      "name": "Single Digits",
      "game_rate": "100",
      "max_bid": "10000",
      "min_bid": "5",
      "name_slug": "single_digit",
      "created_at": "2026-10-26T08:07:49.432Z",
      "updated_at": "2026-10-26T08:07:49.432Z"
    },
    {
      "_id": "[REDACTED]",
      "name": "Jodi Digits",
      "game_rate": "1000",
      "max_bid": "10000",
      "min_bid": "5",
      "name_slug": "jodi_digit",
      "created_at": "2026-10-26T08:07:49.432Z",
      "updated_at": "2...[truncated]
```

### TC-48 - Video list response shape

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/video-list`
- **Test data:** `"(none)"`
- **Check:** Checks documented JSON/message fields.
- **Sanitized response excerpt:**

```json
{
  "success": "1",
  "message": "How to Play: 1 video.",
  "data": [
    {
      "_id": "[REDACTED]",
      "link": "https://www.youtube.com/watch?v=KLuTLF3x9sA",
      "title": "How To Play",
      "created_at": "2026-01-12T13:04:15.627Z",
      "updated_at": "2026-01-12T13:04:15.627Z",
      "__v": 0
    }
  ],
  "count": 1
}
```

### TC-49 - Negative: unsupported notification type

- **Result:** PASS (HTTP 200)
- **Endpoint:** `POST /api/update-notification`
- **Test data:** `{"type":"invalid-test-type","status":"on"}`
- **Check:** Refusal case; invalid enum.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "Unknown notification type. Send type as one of: main_notification, game_notification, kingstarline_notification, kingjacport_notification."
}
```

### TC-50 - Removed route returns JSON 404 (request 61)

- **Result:** PASS (HTTP 404)
- **Endpoint:** `POST /api/kingstarline-market-result-history`
- **Test data:** `"(none)"`
- **Check:** Removed route/method response contract.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "There is no POST /api/kingstarline-market-result-history on this server. Check the address and the method (GET or POST)."
}
```

### TC-51 - Removed route returns JSON 404 (request 86)

- **Result:** PASS (HTTP 404)
- **Endpoint:** `POST /api/active-chat`
- **Test data:** `"(none)"`
- **Check:** Removed route/method response contract.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "There is no POST /api/active-chat on this server. Check the address and the method (GET or POST)."
}
```

### TC-52 - Removed route returns JSON 404 (request 93)

- **Result:** PASS (HTTP 404)
- **Endpoint:** `POST /api/submit-idea`
- **Test data:** `"(none)"`
- **Check:** Removed route/method response contract.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "There is no POST /api/submit-idea on this server. Check the address and the method (GET or POST)."
}
```

### TC-53 - Removed route returns JSON 404 (request 95)

- **Result:** PASS (HTTP 404)
- **Endpoint:** `POST /api/register-step1`
- **Test data:** `"(none)"`
- **Check:** Removed route/method response contract.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "There is no POST /api/register-step1 on this server. Check the address and the method (GET or POST)."
}
```

### TC-54 - Removed route returns JSON 404 (request 67)

- **Result:** PASS (HTTP 404)
- **Endpoint:** `POST /api/deposit-status`
- **Test data:** `"(none)"`
- **Check:** Removed route/method response contract.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "There is no POST /api/deposit-status on this server. Check the address and the method (GET or POST)."
}
```

### TC-55 - Security: protected profile rejects forged token

- **Result:** PASS (HTTP 401)
- **Endpoint:** `GET /api/get-profile-usser`
- **Test data:** `"(none)"`
- **Check:** Invalid token rejected.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "Your session has expired. Please log in again."
}
```

### TC-56 - Security: protected profile rejects absent token

- **Result:** PASS (HTTP 401)
- **Endpoint:** `GET /api/get-profile-usser`
- **Test data:** `"(none)"`
- **Check:** Missing token rejected.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "You are not logged in. Send your session token as Authorization: Bearer <token>."
}
```

### TC-57 - Negative: malformed JSON rejected safely

- **Result:** PASS (HTTP 400)
- **Endpoint:** `POST /api/number-list`
- **Test data:** `"malformed JSON body"`
- **Check:** 400 JSON error response.
- **Sanitized response excerpt:**

```json
{
  "success": "0",
  "message": "The request body is not valid JSON."
}
```

## Coverage caveat

This report records only the 57 executed checks and does not claim exhaustive production feature or vulnerability coverage. See [ALL_TEST_CASE_COVERAGE_BUGS.md](./ALL_TEST_CASE_COVERAGE_BUGS.md) for remaining app/admin/payment workflows, environmental limits, and coverage gaps.
