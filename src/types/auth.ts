export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  avatarUrl?: string;
  lastLogin: string;
}

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarColor: string;
  description: string;
}
