import { OrderDetail, FirebaseTimestamp } from './order';

export interface Invoice {
  id: string;
  orderId: string; // Relasi ke pesanan
  userId: string; // Bisa B2B atau B2C
  amount: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date | FirebaseTimestamp;
  paidAt?: Date | FirebaseTimestamp;
  createdAt: Date | FirebaseTimestamp;
}

// Menggantikan "Driver Wallet" dengan Corporate Balance yang lebih enterprise
export interface CorporateBalance {
  userId: string; // ID User B2B atau Driver
  balance: number; // Deposit (Prabayar)
  creditLimit: number; // Limit Tempo (Pascabayar)
  usedCredit: number; // Hutang berjalan
  updatedAt: Date | FirebaseTimestamp;
}

export interface WalletLog {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'deduction' | 'credit_payment' | 'refund';
  description: string;
  recordedBy?: string; // Jika admin yang menginput manual
  createdAt: Date | FirebaseTimestamp;
}

export interface Promo {
  id: string; // Kode Promo (Document ID)
  type: 'percentage' | 'fixed';
  value: number;
  quota: number;
  usedCount: number;
  expiresAt: string | Date | FirebaseTimestamp;
  isActive?: boolean;
  targetService?: 'all' | 'domestik' | 'forwarding'; 
  targetUser?: string; // Spesifik ke email user tertentu, atau "all"
}

// ----------------------------------------------------------------------
// EXPORT DARI PAGE PEMBAYARAN
// ----------------------------------------------------------------------
export interface PaymentMethod {
  bankName: string;
  accountNumber: string;
  accountName: string;
  color: string;
}

export interface PaymentConfig {
  transferBank: PaymentMethod[];
  qrisImageUrl: string | null;
}

// ----------------------------------------------------------------------
// DATA VIEW MODEL UNTUK FINANCE REPORTS & RECEIVABLES
// ----------------------------------------------------------------------
export interface FinanceReport {
  id: string;
  date: string;
  time: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  originAddress: string;
  destAddress: string;
  serviceType: string;
  vehicleName: string;
  weight: number;
  paymentMethod: string;
  paymentStatus: string;
  baseFee: number;
  insuranceFee: number;
  porterFee: number;
  tollFee: number;
  b2bDiscount: number;
  promoCode: string;
  promoDiscount: number;
  amount: number; 
  timestamp: number;
  rawObj: OrderDetail; 
}

export interface UnpaidOrder {
  id: string;
  date: string;
  originAddress: string;
  destAddress: string;
  amount: number;
  status: string;
  weight?: number;  // <-- KODE DIBERSIHKAN: Kompatibilitas data receivables
  vehicle?: string; // <-- KODE DIBERSIHKAN: Kompatibilitas data receivables
}

export interface B2BClientDebt {
  id: string; 
  name: string;
  email: string;
  phone?: string;    // <-- TAMBAHAN DARI KEBUTUHAN HALAMAN DETAIL (Print Invoice)
  address?: string;  // <-- TAMBAHAN DARI KEBUTUHAN HALAMAN DETAIL (Print Invoice)
  unpaidCount: number;
  totalDebt: number;
  orders: UnpaidOrder[];
}

// ----------------------------------------------------------------------
// EXPORT DARI ALUR CANCEL & REFUND
// ----------------------------------------------------------------------
export interface RefundRequest {
  id: string;
  orderId: string;
  userId: string;
  clientName?: string; 
  nominal: number;
  alasan: string;
  rekeningTujuan: string; // Format: "Nama Bank - No Rekening - Atas Nama"
  status: 'Pending' | 'Approved' | 'Rejected';
  proofUrl?: string; // Bukti transfer pengembalian dana dari Finance
  createdAt: Date | FirebaseTimestamp;
  processedAt?: Date | FirebaseTimestamp;
}

// ----------------------------------------------------------------------
// EXPORT DARI WALLET CLIENTS (B2B)
// ----------------------------------------------------------------------
export interface B2BWalletData {
  id: string;
  name: string;
  companyName: string;
  email: string;
  depositBalance: number;
}

// ----------------------------------------------------------------------
// EXPORT DARI WALLET TOPUPS
// ----------------------------------------------------------------------
export interface TopupRequest {
  id: string;
  userId: string;
  clientName: string;
  amount: number;
  proofUrl: string;
  status: "Pending" | "Disetujui" | "Ditolak";
  createdAt: FirebaseTimestamp;
  userType?: "Driver" | "B2B";
}

// ----------------------------------------------------------------------
// EXPORT DARI WALLET WITHDRAWALS
// ----------------------------------------------------------------------
export interface WithdrawalRequest {
  id: string;
  driverId: string;
  amount: number;
  status: "Pending" | "Processing" | "Disetujui" | "Ditolak"; 
  timestamp: FirebaseTimestamp; 
  driverName?: string; 
  driverPhone?: string;
  partnerType?: string;
  
  // 🚀 FASE 1: PENAMBAHAN FIELD METODE PENARIKAN & REKENING TUJUAN
  method?: "Manual_Bank" | "DANA_API"; // Jalur penarikan
  accountNumber?: string;              // Nomor Rekening atau Nomor HP DANA
  bankName?: string;                   // Khusus untuk metode Manual_Bank
  accountName?: string;                // Atas Nama Rekening/DANA
  danaReferenceId?: string;            // ID Pelacakan API DANA (Jika pakai DANA_API)
}

// ----------------------------------------------------------------------
// EXPORT DARI PRICING CONFIG
// ----------------------------------------------------------------------
export interface AdminDynamicVehicle {
  id: string;
  name: string;
  category?: string;
  maxWeight?: number;
  isMotor?: boolean;
  baseFare?: number;
  minKm?: number;
  perKm?: number;
  insurancePercent?: number;
  appCommission?: number;
  imageUrl?: string;
  [key: string]: unknown; // Allow additional dynamic fields
}

export interface AdminPricingConfig {
  b2bDiscount: number;
  tarifPorter: number;
  customVehicles: AdminDynamicVehicle[];
  [key: string]: unknown;
}

// ==========================================
// INTEGRASI PAYMENT GATEWAY (DANA API & SNAP)
// ==========================================
export interface DanaResourceInfo {
  type: string;
  value: string;
  [key: string]: unknown;
}

export interface DanaResponseBody {
  resultInfo: {
    resultStatus: string;
    resultCodeId: string;
    resultMsg: string;
  };
  merchantResourceInfoList?: DanaResourceInfo[];
  [key: string]: unknown;
}

// 🚀 TAMBAHAN BARU UNTUK API CHECK-STATUS & INQUIRY
export interface CheckStatusPayload {
  withdrawalId: string;
  driverId: string;
  amount: number;
}

export interface DanaSnapInquiryResponse {
  responseCode: string;
  responseMessage?: string;
  latestTransactionStatus: string;
  [key: string]: unknown;
}

// 🚀 TAMBAHAN BARU UNTUK API INQUIRY & TOPUP DANA
export interface DanaInquiryPayload {
  partnerReferenceNo: string;
  customerNumber: string;
  amount: number;
}

export interface DanaInquiryResponse {
  responseCode: string;
  responseMessage?: string;
  customerName?: string;
  additionalInfo?: {
    customerName?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// 🚀 TAMBAHAN BARU UNTUK API TOPUP/DISBURSEMENT DANA
export interface DanaTopupResponse {
  responseCode: string;
  responseMessage?: string;
  [key: string]: unknown;
}