export type TrackingStatus = 'pending' | 'pickup' | 'in_transit' | 'delivered' | 'cancelled' | 'refunded';

// ----------------------------------------------------------------------
// EXPORT DARI PAGE TRACKING (New Tracking Data Types)
// ----------------------------------------------------------------------
export type FirebaseTimestamp = { toDate?: () => Date; toMillis?: () => number; seconds?: number } | string | number | null | undefined;

export interface Order {
  id: string;
  userId: string;
  trackingNumber: string; // Nomor Resi / AWB
  origin: string;
  originCoords: { lat: number; lng: number };
  destination: string;
  destCoords: { lat: number; lng: number };
  weight: number;
  length: number;
  width: number;
  height: number;
  distanceKm: number;
  vehicle: string;
  totalPrice: number;
  status: TrackingStatus;
  assignedDriverId?: string;
  createdAt: Date | FirebaseTimestamp;
  updatedAt?: Date | FirebaseTimestamp;
}

export interface Quote {
  id: string; 
  quoteId?: string; // <-- KODE DIBERSIHKAN: Tambahkan quoteId secara eksplisit
  userId: string;
  name: string;
  email: string;
  phone: string;
  origin: string;
  originCountry: string;
  originCity?: string;   
  originDetail?: string; 
  destination: string;
  destCountry: string;
  destCity?: string;     
  destDetail?: string;   
  itemType: string; 
  weight: number;
  length: number;
  width: number;
  height: number;
  serviceType: string;
  status: string; 
  offeredPrice?: number; 
  customsDocUrl?: string; 

  // --- BARU DITAMBAHKAN UNTUK DETAIL ADMIN & CLIENT ---
  pickupDate?: string; 
  receiverName?: string;
  receiverPhone?: string;
  vendorName?: string;
  vendorBill?: number;
  trackingNumber?: string; // AWB / Resi Ekspedisi Forwarding
  adminNotes?: string;
  
  createdAt: Date | FirebaseTimestamp;
}

// ----------------------------------------------------------------------
// 🚀 BUG FIX: Ditambahkan deklarasi items?: DeliveryItem[] agar 
// dikenali di Layar AWB Mobile Driver
// ----------------------------------------------------------------------
export interface LocationDetail {
  address?: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  lat?: number;
  lng?: number;
  resi?: string;
  items?: DeliveryItem[]; // 👈 INI KUNCI PERBAIKANNYA
  [key: string]: unknown;
}

export interface MapDropItem {
  id: string;
  lng: number;
  lat: number;
  address: string;
  [key: string]: unknown;
}

export interface TrackingHistoryItem {
  id?: string | number;
  status: string;
  date: string;
  description?: string;
  location?: string;
  
  // 🚀 FASE 1: LIVE PROOF DI SETIAP TITIK TIMELINE
  proofUrl?: string; // Link foto live camera (Bisa pas pickup / delivered)
  note?: string;     // Catatan khusus dari kurir pas foto diambil
  
  [key: string]: unknown;
}

export interface TrackingData {
  id: string;
  category: "Domestik" | "Internasional";
  status?: string;
  statusSub?: string;
  origin?: LocationDetail | string; 
  destination?: LocationDetail | string; 
  destinations?: LocationDetail[];
  createdAt?: FirebaseTimestamp;
  trackingHistory?: TrackingHistoryItem[];
  driverCoords?: Coordinates;
  vehicleName?: string;
  serviceType?: string;
  resi?: string;
  [key: string]: unknown;
}

// ----------------------------------------------------------------------
// EXPORT DARI PAGE DESKTOP 
// ----------------------------------------------------------------------
export interface AdminPricingConfig {
  domestik?: {
    motor?: { baseFare: number; minKm: number; perKm: number; maxWeight: number };
    mobil?: { baseFare: number; minKm: number; perKm: number; maxWeight: number };
  };
  internasional?: {
    basePerKg?: number;
  };
  discounts?: {
    thresholdKg?: number;
    rate?: number;
  };
}

export interface EstimateData {
  chargeableWeight: number;
  finalEstimate: number;
  parameters: {
    actualWeight: number;
    volumeWeight: number;
    distanceTraveled: number;
    category: string;
    vehicleName: string;
  };
}

export interface OrderSummary {
  id: string;
  destination: string;
  weight: number | string;
  vehicle: string;
  totalCost: number;
}

// ----------------------------------------------------------------------
// EXPORT DARI PAGE BOOKING
// ----------------------------------------------------------------------
export interface Coordinates {
  lng: number;
  lat: number;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface OriginData {
  address: string;
  detail: string;
  senderName: string;
  senderPhone: string;
}

export interface DeliveryItem {
  id: string;
  name: string;
  weightType?: "Kecil" | "Sedang" | string;
  dimType?: "S" | "M" | "L" | string;
  weightVal?: number;
  weight?: number; 
  length?: number;
  width?: number;
  height?: number;
  value?: number;
}

export interface OrderBreakdown {
  deliveryFee: number;
  insuranceFee: number;
  porterFee: number;
  tollFee: number;
  b2bDiscount: number;
  grandTotal: number;
}

export interface DashboardOrder {
  id: string;
  category: "domestik" | "internasional";
  origin: string;
  destination: string;
  weight: number;
  dimensions: string;
  type: string;
  status: string;
  statusSub: string;
  date: string;
  timestamp: number; 
  
  // --- KEUANGAN & PROMO ---
  price: number; 
  finalPrice?: number; 
  promoCode?: string; 
  discountAmount?: number; 
  breakdown?: OrderBreakdown; 
  paymentStatus?: string; 
  paymentMethod?: string; 
  
  // --- OPERASIONAL & LOG PENGIRIMAN ---
  vehicle?: string;
  driverName?: string;
  driverPhone?: string;
  resi?: string; 
  trackingHistory?: TrackingHistoryItem[]; 

  // 🚀 FASE 1: BUKTI DARI KURIR DI DASHBOARD
  pickupProofUrl?: string;
  pickupNote?: string;
  deliveryProofUrl?: string;
  deliveryNote?: string;

  // --- DATA KLIEN ---
  senderName?: string;
  receiverName?: string;
  senderPhone?: string;
  receiverPhone?: string;
  email?: string;
  items?: DeliveryItem[];
}

export interface DropDestination {
  id: string;
  resi?: string;
  address: string;
  detail: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string;
  items: DeliveryItem[];
  lng?: number;
  lat?: number;
}

export interface DynamicVehicle {
  id: string;
  name: string;
  isMotor: boolean;
  category?: "Motor" | "Mobil" | "Truk"; 
  maxWeight: number;
  baseFare: number;
  minKm: number;
  perKm: number;
  insurancePercent?: number;
  dimS?: { p: number; l: number; t: number };
  dimM?: { p: number; l: number; t: number };
  dimL?: { p: number; l: number; t: number };
  imageUrl?: string; 
}

// ----------------------------------------------------------------------
// EXPORT DARI PAGE DETAIL ORDER & ADMIN FINANCE
// ----------------------------------------------------------------------
export interface OrderDetail {
  id: string;
  category?: string; // Optional karena di database utama kadang tidak ada
  userId?: string;
  email?: string;
  status: string;
  statusSub?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt?: FirebaseTimestamp;
  verifiedAt?: FirebaseTimestamp;
  paidAt?: string | FirebaseTimestamp; // Tambahan dari DB
  resi?: string;
  quoteId?: string;
  origin?: LocationDetail | string;
  senderName?: string;
  senderPhone?: string;
  destinations?: LocationDetail[];
  destination?: string;
  serviceType?: string;
  vehicleName?: string;
  vehicleId?: string; // Tambahan dari DB
  vehicle?: string;
  totalWeight?: number;
  weight?: number;
  totalDistance?: number;
  driverId?: string; 
  driverName?: string;
  driverPhone?: string;
  driverCoords?: Coordinates; // Tambahan dari DB
  porterCount?: number; // Tambahan dari DB
  isB2BApplied?: boolean; // Tambahan dari DB
  totalItemValue?: number;
  breakdown?: OrderBreakdown;
  finalGrandTotal?: number;
  totalCost?: number;
  offeredPrice?: number;
  appliedPromoCode?: string;
  discountPromoAmount?: number;
  trackingHistory?: TrackingHistoryItem[];
  receiptUrl?: string | null;

  // 🚀 FASE 1: DETAIL AWB PUNYA DATA PROOF
  pickupProofUrl?: string;
  pickupNote?: string;
  deliveryProofUrl?: string;
  deliveryNote?: string;

  [key: string]: unknown; // Extra fields
}