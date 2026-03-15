export interface YearbookMember {
  id: string;
  name: string;
  position?: string;
  quote?: string;
  photo?: string; // Cloudinary URL
}

export interface YearbookDepartment {
  id: string;
  name: string;
  members: YearbookMember[];
  activityPhotos: string[]; // Cloudinary URLs
}

export interface Yearbook {
  _id?: string;
  year: string;
  coverPhoto?: string;
  departments: YearbookDepartment[];
  createdAt: Date;
  updatedAt: Date;
}
