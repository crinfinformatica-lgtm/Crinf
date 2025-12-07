
export enum UserType {
  USER = 'USER',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
  MASTER = 'MASTER'
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  comment?: string;
  date: string;
  reply?: string; // Vendor's reply
  replyDate?: string;
}

export interface VendorVisibility {
  showPhone: boolean;
  showAddress: boolean;
  showWebsite: boolean;
}

export interface Vendor {
  id: string;
  name: string; // Nome fantasia / Nome do prestador
  document: string; // CNPJ or CPF
  phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  distance?: number; // Calculated dynamically in UI
  categories: string[];
  description: string;
  website?: string;
  socialMedia?: string;
  photoUrl: string;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  type?: UserType;
  visibility: VendorVisibility; // New privacy settings
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  address: string;
  phone?: string;
  type: UserType;
  photoUrl?: string; // For Google Auth
  password?: string; // Added optional password field
}

export interface Location {
  lat: number;
  lng: number;
}

export interface SecurityLog {
  id: string;
  timestamp: number;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAIL' | 'PASSWORD_CHANGE' | 'BAN_ACTION';
  details: string;
  ip?: string; // Simulated in frontend
}

export interface AppState {
  currentUser: User | Vendor | null;
  users: User[]; // Track all registered users
  vendors: Vendor[];
  bannedDocuments: string[]; // Blacklist for CPF/CNPJ
  searchQuery: string;
  selectedCategory: string | null;
  userLocation: Location | null;
  securityLogs: SecurityLog[]; // New field for security auditing
}

export const CATEGORIES = [
  "Restaurante", "Mecânica", "Salão de Beleza", "Encanador", 
  "Eletricista", "Padaria", "Informática", "Limpeza", "Jardinagem", 
  "Costura", "Aulas Particulares", "Saúde"
];
