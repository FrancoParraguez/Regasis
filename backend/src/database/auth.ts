import type { Role } from "../types/roles.js";
import { queryOne, query } from "./pool.js";

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: Role;
  providerId: string | null;
}

export interface DbRefreshToken {
  id: string;
  jti: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface RefreshTokenWithUser extends DbRefreshToken {
  user: DbUser;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  return queryOne<DbUser>(
    'SELECT id, email, name, password, role, provider_id AS "providerId" FROM app_user WHERE email = $1',
    [email]
  );
}

export async function findRefreshTokenWithUser(jti: string): Promise<RefreshTokenWithUser | null> {
  const rows = await query<DbRefreshToken & {
    user_id: string;
    user_email: string;
    user_name: string;
    user_role: Role;
    user_providerId: string | null;
    user_password: string;
  }>(
    'SELECT rt.id, rt.jti, rt.user_id AS "userId", rt.expires_at AS "expiresAt", rt.revoked, rt.created_at AS "createdAt", ' +
      'u.id AS user_id, u.email AS user_email, u.name AS user_name, u.role AS user_role, u.provider_id AS "user_providerId", u.password AS user_password ' +
      'FROM refresh_token rt JOIN app_user u ON u.id = rt.user_id WHERE rt.jti = $1',
    [jti]
  );

  const row = rows[0];
  if (!row) return null;

  const { user_id, user_email, user_name, user_role, user_providerId, user_password, ...rt } = row;
  return {
    ...rt,
    user: {
      id: user_id,
      email: user_email,
      name: user_name,
      role: user_role,
      providerId: user_providerId,
      password: user_password
    }
  };
}

export async function createRefreshToken(data: {
  jti: string;
  userId: string;
  expiresAt: Date;
}): Promise<DbRefreshToken> {
  const row = await queryOne<DbRefreshToken>(
    'INSERT INTO refresh_token (jti, user_id, expires_at) VALUES ($1, $2, $3) RETURNING id, jti, user_id AS "userId", expires_at AS "expiresAt", revoked, created_at AS "createdAt"',
    [data.jti, data.userId, data.expiresAt]
  );

  if (!row) {
    throw new Error("Failed to create refresh token");
  }

  return row;
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  await query('UPDATE refresh_token SET revoked = true WHERE jti = $1', [jti]);
}
