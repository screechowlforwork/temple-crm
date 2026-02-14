import type { DefaultSession } from "next-auth";
import type { SessionUser } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: SessionUser & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appUser?: SessionUser;
  }
}
