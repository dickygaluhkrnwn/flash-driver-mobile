import { FirebaseTimestamp } from './order';

export interface SupportTicket {
  id: string;
  userId: string;
  clientName?: string;
  email?: string;
  orderId?: string;
  issueType: string; 
  message: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  createdAt: Date | FirebaseTimestamp;
  updatedAt?: Date | FirebaseTimestamp;
}

export interface InsuranceClaim {
  id: string;
  orderId: string;
  userId: string;
  clientName?: string;
  clientEmail?: string;
  claimedAmount: number;
  reason: string;
  proofUrl?: string;
  proofImages?: string[]; // Tetap dipertahankan untuk backward compatibility
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'pending' | 'investigating' | 'approved' | 'rejected';
  resolvedBy?: string; // ID Admin Finance yang menyetujui
  createdAt: Date | FirebaseTimestamp;
  updatedAt?: Date | FirebaseTimestamp;
}

export interface AuditLog {
  id: string;
  action: string; // Deskripsi aktivitas
  adminEmail: string; // Email pelaku (Admin/System)
  targetModule: string; // Modul yang diubah
  performedBy?: string; // ID User/Admin
  targetId?: string; // ID entitas yang dimanipulasi
  details?: string;
  ipAddress?: string;
  // KODE DIBERSIHKAN: Timestamp dibuat super fleksibel agar fungsi formatTime aman dari Type Error
  timestamp: FirebaseTimestamp | Date | string | number | null | undefined;
}