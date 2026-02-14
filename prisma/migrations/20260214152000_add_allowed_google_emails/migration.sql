-- CreateTable
CREATE TABLE "allowed_google_emails" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allowed_google_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allowed_google_emails_email_key" ON "allowed_google_emails"("email");

-- CreateIndex
CREATE INDEX "allowed_google_emails_is_active_idx" ON "allowed_google_emails"("is_active");

-- CreateIndex
CREATE INDEX "allowed_google_emails_created_by_user_id_idx" ON "allowed_google_emails"("created_by_user_id");

-- AddForeignKey
ALTER TABLE "allowed_google_emails" ADD CONSTRAINT "allowed_google_emails_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
