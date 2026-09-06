-- Phase 2 mục "Thanh toán" (06/09/2026): admin panel > Thanh toán cho phép admin
-- (1) bật/tắt thu phí, (2) nhập giá gói Pro/tháng, (3) nhập tài khoản ngân hàng
-- nhận tiền. Người dùng ở /user/upgrade chọn 1 trong 5 phương thức (chuyển khoản
-- ngân hàng, MoMo, VNPay, thẻ nội địa, Visa/USD); chỉ "chuyển khoản ngân hàng" xử
-- lý thật (tạo payment_requests, admin duyệt tay) -- MoMo/VNPay/thẻ nội địa/Visa
-- là UI đầy đủ nhưng "Sắp ra mắt" cho tới khi có merchant key thật (xem
-- lib/payment/momo.ts, lib/payment/vnpay.ts).

-- ============================================================================
-- TABLE: payment_settings (đúng 1 dòng, id=1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payment_enabled BOOLEAN NOT NULL DEFAULT false,
  monthly_price_vnd INTEGER NOT NULL DEFAULT 99000 CHECK (monthly_price_vnd >= 0),
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  bank_branch TEXT,
  momo_phone TEXT,
  vnpay_note TEXT,
  usd_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.payment_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Mọi user đã đăng nhập đọc được (để hiển thị giá/tài khoản nhận tiền ở
-- /user/upgrade). Ghi chỉ qua service role (API admin), không có policy INSERT/UPDATE.
CREATE POLICY "Authenticated users can view payment settings" ON public.payment_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: payment_requests -- 1 dòng / 1 lần user báo "đã thanh toán"
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'momo', 'vnpay', 'atm_card', 'visa')),
  bank_selected TEXT,
  amount_vnd INTEGER NOT NULL,
  amount_usd NUMERIC(10,2),
  fx_rate NUMERIC(12,4),
  order_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment requests" ON public.payment_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment requests" ON public.payment_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment requests" ON public.payment_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- subscriptions.payment_method: mở rộng thêm 3 phương thức mới
-- ============================================================================
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_method_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_payment_method_check
  CHECK (payment_method IN ('momo', 'vnpay', 'stripe', 'none', 'bank_transfer', 'atm_card', 'visa'));

SELECT 'payment_settings + payment_requests migration done' AS status;
