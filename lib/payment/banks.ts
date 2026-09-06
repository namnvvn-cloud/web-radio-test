/**
 * 15 ngân hàng nội địa phổ biến nhất tại VN, cho dropdown "Thẻ nội địa"
 * ở /user/upgrade. Đây chỉ là danh sách hiển thị — phương thức "Thẻ nội
 * địa" chưa xử lý thanh toán thật (chưa nối cổng Napas/OnePay/Payoo,
 * cần merchant key riêng), xem ghi chú "Sắp ra mắt" tại nơi dùng.
 */
export const VN_BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'CTG', name: 'VietinBank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'SHB', name: 'SHB' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'AGR', name: 'Agribank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
] as const

export type VnBankCode = (typeof VN_BANKS)[number]['code']
