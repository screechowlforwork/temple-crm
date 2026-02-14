-- AlterTable
ALTER TABLE "users"
ADD COLUMN "email" TEXT,
ADD COLUMN "google_sub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");
