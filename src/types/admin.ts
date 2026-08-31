import { DynamicVehicle } from "./order";

export interface DashboardStats {
  totalB2B: number;
  totalDrivers: number;
  totalOrdersToday: number;
  totalRevenueToday: number;
  totalWeightToday: number;
  activeTickets: number;
  avgOrderValueWeekly: number;
  unpaidB2B: number;
  ordersCompleted: number;
  ordersCancelled: number;
}

export interface ChartData {
  label: string;
  value: number;
  dateStr: string;
}

export interface ActiveNode {
  id: string;
  origin: string;
  destination: string;
  status: string;
  vehicle: string;
  coords?: { lat: number; lng: number }; 
}

// DIPERBARUI: Struktur lengkap mencakup seluruh ekosistem Fleet Management
export interface DriverData {
  id: string;
  name: string; // Nama Sopir atau Nama PIC Vendor
  email?: string; // <-- BARU: Email pendaftar/entitas
  vehicleType: string;
  phone?: string; 
  balance?: number;
  isSuspended?: boolean;
  status?: "Pending" | "Active" | "Suspended" | "Rejected";
  
  // BARU: Klasifikasi Kemitraan
  partnerType?: "Individual" | "Vendor" | "FleetDriver" | "FleetVehicle";
  
  // BARU: Data Individu / Supir Pribadi / Supir Vendor
  nik?: string;
  simNumber?: string;
  licensePlate?: string;
  
  // BARU: Data Vendor (Perusahaan) & Perbankan
  companyName?: string;
  npwp?: string;
  bankName?: string;    // <-- BARU: Informasi Perbankan Vendor
  bankAccount?: string; // <-- BARU: Informasi Perbankan Vendor
  
  // BARU: Afiliasi (Penaut antara Truk/Sopir ke Vendor Perusahaan)
  vendorId?: string;
  vendorName?: string;
  driverId?: string;    // <-- BARU: Relasi Truk ke Sopir
  driverName?: string;  // <-- BARU: Relasi Truk ke Sopir
  
  // BARU: Media & Kelengkapan Dokumen
  baseAddress?: string;
  baseCoords?: { lat: number; lng: number };
  fotoProfileUrl?: string;
  fotoKtpUrl?: string;
  fotoSimUrl?: string;
  npwpUrl?: string;
  stnkUrl?: string;
  kirUrl?: string;
  
  // Metadata
  createdAt?: unknown; // Firebase Timestamp
  
  // Menangkap properti lain yang mungkin belum terdefinisi
  [key: string]: unknown;
}

// Konfigurasi Tarif dari Halaman Pricing Admin
export interface PricingConfig {
  b2bDiscount: number;
  tarifPorter: number;
  customVehicles: DynamicVehicle[];
  [key: string]: unknown;
}