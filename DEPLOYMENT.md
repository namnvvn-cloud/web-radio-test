# Deployment Guide

This document provides step-by-step instructions for deploying the Web Radio Test platform.

## Phase 0: Local Development

### Prerequisites
- Node.js 18+
- Git
- GitHub account
- Supabase project (odeiphfrvmpajzmklkme)
- Voyage AI account

### Steps

1. **Clone and Setup**
   ```bash
   git clone https://github.com/namnvvn-cloud/web-radio-test.git
   cd web-radio-test
   npm install
   ```

2. **Configure Environment**
   ```bash
   # .env.local should already contain the credentials
   # If not, create it with the values from:
   # - Supabase Dashboard > Project Settings > API
   # - Voyage AI > API Keys
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

## Phase 0.5: Database Setup

### Step 1: Create app_pings Table in Supabase

1. Go to https://supabase.com/dashboard/project/odeiphfrvmpajzmklkme
2. Navigate to SQL Editor
3. Create a new query and copy the contents of: `supabase/migrations/001_create_app_pings_table.sql`
4. Run the query
5. Verify the table is created in the Tables section

### Step 2: Test the API Endpoint

```bash
curl -X POST http://localhost:3000/api/pings \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceInfo": {"device": "test", "os": "Android"},
    "signalData": {"strength": -50},
    "location": {"latitude": 21.0285, "longitude": 105.8542}
  }'
```

Expected response:
```json
{
  "id": 1,
  "timestamp": "2026-09-02T12:34:56.789Z"
}
```

## Phase 1: Deploy to Vercel

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Add Phase 0.5 implementation"
git push origin main
```

### Step 2: Deploy on Vercel

1. Visit https://vercel.com/new?teamSlug=namnv
2. Click "Select a Git Repository"
3. Enter: `namnvvn-cloud/web-radio-test`
4. Click "Import"
5. Configure Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - VOYAGE_API_KEY
   - NODE_ENV=production
6. Click "Deploy"

### Step 3: Verify Deployment

```bash
# Test the live endpoint
curl -X POST https://your-vercel-domain.vercel.app/api/pings \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-id"}'
```

## Phase 3: Payment gateways (MoMo / VNPay) — scaffold, inactive

Code is complete (`lib/payment/momo.ts`, `lib/payment/vnpay.ts`,
`app/api/subscriptions/*`, `/user/upgrade`) but does nothing until the
merchant env vars below are set in Vercel — **never commit these to the
repo, it is PUBLIC.** With any of them unset, `create-order` returns
HTTP 503 and the upgrade buttons show "chờ merchant keys".

MoMo (get from https://business.momo.vn, "Cổng thanh toán" → API keys):
   - MOMO_PARTNER_CODE
   - MOMO_ACCESS_KEY
   - MOMO_SECRET_KEY
   - MOMO_ENDPOINT (optional — defaults to MoMo's sandbox; set to
     `https://payment.momo.vn/v2/gateway/api/create` for production)
   - MOMO_REDIRECT_URL / MOMO_IPN_URL (optional — default to
     `NEXT_PUBLIC_SITE_URL` + `/user/upgrade/result` / `/api/subscriptions/momo/ipn`)

VNPay (get from VNPay merchant portal after ký hợp đồng):
   - VNPAY_TMN_CODE
   - VNPAY_HASH_SECRET
   - VNPAY_ENDPOINT (optional — defaults to VNPay's sandbox; set to
     `https://vnpayment.vn/paymentv2/vpcpay.html` for production)
   - VNPAY_RETURN_URL (optional — defaults to `NEXT_PUBLIC_SITE_URL` + `/user/upgrade/result`)

Also set once merchant keys exist:
   - NEXT_PUBLIC_SITE_URL=https://web-radio-test.vercel.app

Then in each gateway's merchant portal, register the IPN/webhook URL:
   - MoMo: `https://web-radio-test.vercel.app/api/subscriptions/momo/ipn`
   - VNPay: `https://web-radio-test.vercel.app/api/subscriptions/vnpay/ipn`

Giá gói Pro hiện là placeholder (`lib/payment/plans.ts`, 99.000đ/30 ngày) —
cần anh Nam xác nhận giá thật trước khi kích hoạt gateway.

## Phase 2 & 3: Future

See SOP_WebRadioTest_v1.2.md for upcoming phases.

## Troubleshooting

### "Failed to insert ping record"
- Check Supabase RLS policies
- Verify table exists with correct schema
- Check SUPABASE_SERVICE_ROLE_KEY is correct

### "Connection refused"
- Ensure Supabase project is running
- Check NEXT_PUBLIC_SUPABASE_URL is correct
- Verify network connectivity

### Environment variables not loading
- Check .env.local exists and is readable
- Restart dev server: `npm run dev`
- For Vercel, verify vars in Project Settings > Environment Variables

## Monitoring

### Supabase
- Monitor query usage: https://supabase.com/dashboard/project/odeiphfrvmpajzmklkme/stats/queries
- View logs: SQL Editor > Logs
- Check storage usage: Project Settings > Usage

### Vercel
- Monitor deployments: https://vercel.com/namnvvn/web-radio-test
- View logs: Deployment > Runtime Logs
- Check analytics: Analytics tab

## Support

For issues or questions, refer to:
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Vercel Docs: https://vercel.com/docs

---

**Phase 0.5 Status**: Initial setup complete  
**Last Updated**: 2026-09-02
