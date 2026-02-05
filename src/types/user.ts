export interface UserProfile {
  _id?: { toString(): string}
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

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  timeInImage?: {
    url: string;
    thumbnail: string;
    public_id?: string;
    status?: "pending" | "processing" | "completed" | "failed";
    uploadJobId?: string;
    error?: string;
  };
  timeOutImage?: {
    url: string;
    thumbnail: string;
    public_id?: string;
    status?: "pending" | "processing" | "completed" | "failed";
    uploadJobId?: string;
    error?: string;
  };
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown; // Index signature for DataTable compatibility
}

export interface UserAttendanceModalData {
  user: {
    id: string;
    name: string;
    email: string;
    department?: string;
    position?: string;
  };
  attendance: AttendanceRecord[];
}
