export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  dob?: string;
  gender?: string;
  avatarUrl?: string;
  role: 'customer' | 'admin' | 'staff';
}
