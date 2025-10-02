export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  provider: string;
  department?: string;
  position?: string;
  color?: string;
  createdAt: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  image?: string;
  provider: string;
  department?: string;
  position?: string;
  color?: string;
  createdAt: string;
  lastLogin?: boolean;
  lastLoginTime?: string;
  lastLoginToday?: boolean;
  timeIn?: string;
  timeOut?: string;
  timeInToday?: string;
  timeOutToday?: string;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
}
