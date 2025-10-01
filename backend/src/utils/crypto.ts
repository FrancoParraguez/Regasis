import bcrypt from "bcrypt";
export async function hashPassword(pw: string){ return bcrypt.hash(pw, 10); }
export async function comparePassword(pw: string, hash: string){ return bcrypt.compare(pw, hash); }
