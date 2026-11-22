import type { Timestamp } from 'firebase/firestore';
import type { RoleKey } from './rbac';

export type UserStatus = 'aktif' | 'nonaktif';

export interface UserProfile {
  uid: string;
  nama: string;
  email: string;
  roles: RoleKey[];
  status: UserStatus;
  mustChangePassword?: boolean;
  staffId?: string | null;
  studentId?: string | null;
  guardianId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type StudentStatus = 'aktif' | 'lulus' | 'keluar' | 'pindah';

export interface Student {
  id: string;            // = NIS
  nis: string;
  nisn?: string;
  nism?: string;
  nama: string;
  jk: 'L' | 'P';
  tempatLahir?: string;
  tanggalLahir?: string; // YYYY-MM-DD
  alamat?: string;
  kelurahan?: string;
  kecamatan?: string;
  classId?: string | null;
  className?: string | null;
  academicYearId?: string | null;
  fotoFileId?: string | null;
  status: StudentStatus;
  archived: boolean;
  archiveReason?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Staff {
  id: string;
  nip?: string;
  nama: string;
  jabatan?: string;
  hp?: string;
  email?: string;
  userUid?: string | null;
  fotoFileId?: string | null;
  status: 'aktif' | 'nonaktif';
  createdAt?: Timestamp;
}

export interface Guardian {
  id: string;
  nama: string;
  hubungan?: string;
  hp?: string;
  pekerjaan?: string;
  userUid?: string | null;
  createdAt?: Timestamp;
}

export type LinkStatus = 'menunggu' | 'terverifikasi' | 'ditolak';

export interface GuardianLink {
  id: string; // `${studentId}_${guardianId}`
  studentId: string;
  studentName: string;
  guardianId: string;
  guardianName: string;
  hubungan?: string;
  status: LinkStatus;
  catatan?: string;
  createdBy?: string;
  verifiedBy?: string | null;
  verifiedAt?: Timestamp | null;
  createdAt?: Timestamp;
}

export interface AcademicYear {
  id: string;           // mis. "2026-2027"
  nama: string;         // "2026/2027"
  semesterAktif: 'Ganjil' | 'Genap';
  isActive: boolean;
}

export interface SchoolClass {
  id: string;           // mis. "2026-2027_4A"
  academicYearId: string;
  tingkat: number;
  nama: string;         // "4A"
  waliKelasUid?: string | null;
  waliKelasNama?: string | null;
  archived?: boolean;
}

export interface Subject {
  id: string;
  kode: string;
  nama: string;
  kelompok?: string;
  archived?: boolean;
}

export interface SchoolSettings {
  namaMadrasah: string;
  alamat: string;
  nsm?: string;
  npsn?: string;
  kepalaMadrasah?: string;
  telepon?: string;
  logoFileId?: string | null;
  maxUploadMb: number;
  batasPersetujuanPengeluaran?: number;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorNama: string;
  aksi: string;
  koleksi: string;
  docId: string;
  sebelum?: unknown;
  sesudah?: unknown;
  alasan?: string;
  waktu: Timestamp;
}
