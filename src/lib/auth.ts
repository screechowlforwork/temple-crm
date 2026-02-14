import { prisma } from "./prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const JWT_SECRET = process.env.JWT_SECRET;

function getJwtSecret(): string {
  if (JWT_SECRET) {
    return JWT_SECRET;
  }
  if (process.env.NODE_ENV !== "production") {
    return "dev-secret-change-me";
  }
  throw new Error("JWT_SECRET is required in production");
}

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  roleName: string;
  email?: string | null;
};

const ENV_ALLOWED_GOOGLE_EMAILS = (process.env.ALLOWED_GOOGLE_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

async function isGoogleEmailAllowed(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();

  const allowlistRecord = await prisma.allowedGoogleEmail.findUnique({
    where: { email: normalizedEmail },
    select: { isActive: true },
  });
  if (allowlistRecord) {
    return allowlistRecord.isActive;
  }

  if (ENV_ALLOWED_GOOGLE_EMAILS.length === 0) {
    return false;
  }

  return ENV_ALLOWED_GOOGLE_EMAILS.includes(normalizedEmail);
}

async function buildSessionUser(user: {
  id: string;
  username: string;
  displayName: string;
  roleId: string;
  email?: string | null;
}): Promise<SessionUser | null> {
  const role = await prisma.role.findUnique({
    where: { id: user.roleId },
    select: { name: true },
  });
  if (!role) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roleName: role.name,
    email: user.email ?? null,
  };
}

async function getActiveSessionUserById(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user || !user.isActive) {
    return null;
  }
  return buildSessionUser(user);
}

async function createUniqueUsernameFromEmail(email: string): Promise<string> {
  const localPart = email.split("@")[0] ?? "user";
  const base = localPart.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24) || "user";
  let candidate = base;
  let counter = 1;

  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    candidate = `${base}${counter}`.slice(0, 32);
    counter += 1;
  }

  return candidate;
}

async function upsertGoogleUser(params: {
  email: string;
  googleSub: string;
  displayName: string;
}): Promise<SessionUser | null> {
  const staffRole = await prisma.role.findUnique({ where: { name: "Staff" } });
  if (!staffRole) {
    return null;
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: params.email }, { googleSub: params.googleSub }],
    },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: params.email,
        googleSub: params.googleSub,
        displayName: params.displayName,
        isActive: true,
      },
    });
    return buildSessionUser(updated);
  }

  const username = await createUniqueUsernameFromEmail(params.email);
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const created = await prisma.user.create({
    data: {
      username,
      passwordHash,
      displayName: params.displayName,
      email: params.email,
      googleSub: params.googleSub,
      roleId: staffRole.id,
      isActive: true,
    },
  });
  return buildSessionUser(created);
}

const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = profile?.email?.toLowerCase();
      const googleSub = profile?.sub;
      if (!email || !googleSub) {
        console.warn("[auth] google sign-in denied: missing email/sub", {
          hasEmail: Boolean(email),
          hasSub: Boolean(googleSub),
        });
        return false;
      }
      if (!(await isGoogleEmailAllowed(email))) {
        console.warn("[auth] google sign-in denied: email not in allowlist", { email });
        return false;
      }

      const user = await upsertGoogleUser({
        email,
        googleSub,
        displayName: profile?.name ?? email,
      });
      if (!user) {
        console.warn("[auth] google sign-in denied: failed to upsert app user", { email });
      }
      return !!user;
    },
    async jwt({ token }) {
      const email = token.email?.toLowerCase();
      if (!email) {
        return token;
      }

      const user = await prisma.user.findFirst({
        where: { email },
      });

      if (!user || !user.isActive) {
        delete (token as Record<string, unknown>).appUser;
        return token;
      }

      const sessionUser = await buildSessionUser(user);
      if (!sessionUser) {
        delete (token as Record<string, unknown>).appUser;
        return token;
      }

      (token as Record<string, unknown>).appUser = sessionUser;
      return token;
    },
    async session({ session, token }) {
      const appUser = (token as Record<string, unknown>).appUser as SessionUser | undefined;
      if (appUser) {
        (session as { user: SessionUser }).user = appUser;
      }
      return session;
    },
  },
};

export const { handlers, auth } = NextAuth(authConfig);

export async function authenticateUser(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !user.isActive) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return buildSessionUser(user);
}

export function createToken(user: SessionUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "24h" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUser(
  req?: NextRequest
): Promise<SessionUser | null> {
  const authSession = await auth();
  const authUser = (authSession?.user ?? null) as SessionUser | null;
  if (authUser?.id && authUser.roleName) {
    return authUser;
  }

  let token: string | undefined;

  if (req) {
    token = req.cookies.get("token")?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get("token")?.value;
  }

  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.id) {
    return null;
  }
  return getActiveSessionUserById(decoded.id);
}

export function requireRole(
  user: SessionUser | null,
  allowedRoles: string[]
): void {
  if (!user) {
    throw new Error("認証が必要です");
  }
  if (!allowedRoles.includes(user.roleName)) {
    throw new Error("権限がありません");
  }
}

export function canEditTransactions(user: SessionUser | null): boolean {
  if (!user) return false;
  return ["Admin", "OfficeManager"].includes(user.roleName);
}

export function canDelete(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.roleName === "Admin";
}
