import type { Role } from "./roles.js";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  providerId?: string | null;
}
