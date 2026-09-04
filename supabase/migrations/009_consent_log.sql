-- Phase 1b mục 2 (04/09/2026): popup Điều khoản dịch vụ & Chính sách bảo mật bắt buộc sau khi
-- cài app + đăng nhập. Lưu lại từng lần người dùng bấm "Đồng ý và tiếp tục" để có bằng chứng
-- pháp lý (ai, đồng ý bản nào, lúc nào) -- không ghi đè, mỗi lần đồng ý là 1 dòng mới (lịch sử
-- đầy đủ nếu nội dung điều khoản đổi qua nhiều bản). Gọi từ app qua POST /api/consent, xem
-- app/api/consent/route.ts và Backend.submitConsent() (Android, Backend.java).

CREATE TABLE IF NOT EXISTS public.consent_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  consented BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON public.consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_created_at ON public.consent_log(created_at);

-- Enable RLS on consent_log
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own consent records
CREATE POLICY "Users can view own consent" ON public.consent_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent" ON public.consent_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can see all consent records
CREATE POLICY "Admins can view all consent" ON public.consent_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.consent_log IS
  'Lịch sử đồng ý Điều khoản dịch vụ & Chính sách bảo mật của người dùng app Android (mục 2, 04/09/2026). Ghi qua POST /api/consent, mỗi lần bấm Đồng ý là 1 dòng mới -- KHÔNG update/xoá, giữ đủ lịch sử làm bằng chứng.';
