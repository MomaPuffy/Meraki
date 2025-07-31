export interface AttendanceRecord {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  timeInImage?: {
    url: string;
    thumbnail: string;
    public_id: string;
  };
  timeOutImage?: {
    url: string;
    thumbnail: string;
    public_id: string;
  };
  createdAt: string;
  updatedAt?: string;
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