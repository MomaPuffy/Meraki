// NextAuth session and JWT interfaces
export interface AuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    position?: string;
  };
}

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  position?: string;
}

export interface AuthJWT {
  id?: string;
  position?: string;
}
