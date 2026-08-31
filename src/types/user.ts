import { FirebaseTimestamp } from './order';

export type Role = 'superadmin' | 'admin_finance' | 'admin_operational' | 'b2b' | 'b2c' | 'driver' | 'staff';

export interface UserPreferences {
  eReceipt?: boolean;
  eReceiptEmail?: string;
  proofOfDelivery?: boolean;
}

export interface UserNotifications {
  orders?: { push: boolean; email: boolean; whatsapp: boolean };
  billing?: { email: boolean; whatsapp: boolean };
  promos?: { email: boolean; sms: boolean };
  security?: { email: boolean; push: boolean };
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  phoneNumber?: string;
  photoURL?: string;
  
  // --- Field Spesifik B2B & Operasional ---
  companyName?: string;
  legalCompanyName?: string; // <-- BARU: Nama legal entitas perusahaan
  companyEmail?: string;     // <-- BARU: Email resmi perusahaan (jika beda dengan email login)
  companyPhone?: string;     // <-- BARU: Kontak resmi perusahaan
  depositBalance?: number;   // <-- BARU: Saldo prabayar/deposit klien B2B
  npwp?: string;
  defaultAddress?: string;
  picName?: string;
  industry?: string;
  monthlyVolume?: string;
  contractStatus?: 'Pending' | 'Approved' | 'Rejected' | null;
  b2bLimit?: number;
  b2bRequestedAt?: Date | FirebaseTimestamp;

  // --- 🚀 BARU: Field Spesifik Driver / Mitra ---
  partnerType?: 'Vendor' | 'Individual' | 'FleetDriver' | string;
  city?: string; // Digunakan untuk Geofencing Radar Order

  // --- Preferensi & Keamanan ---
  preferences?: UserPreferences;
  notifications?: UserNotifications;
  isSuspended?: boolean; // Indikator blokir/suspend untuk pengguna B2C/Driver
  
  // Menggunakan FirebaseTimestamp agar fleksibel saat parsing dari Firestore
  createdAt: Date | FirebaseTimestamp; 
  updatedAt?: Date | FirebaseTimestamp;
}

export interface B2BRequest {
  id: string;
  userId: string;
  companyName: string;
  businessType: string;
  npwp: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // ID admin yang menyetujui
  createdAt: Date | FirebaseTimestamp;
  updatedAt?: Date | FirebaseTimestamp;
}