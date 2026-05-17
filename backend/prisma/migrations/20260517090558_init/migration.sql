-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_scans" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "url" TEXT NOT NULL,
    "risk_score" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "is_phishing" BOOLEAN,
    "threat_category" VARCHAR(100),
    "features" JSONB,
    "explanations" JSONB,
    "vt_result" JSONB,
    "gsb_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_scans" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "subject" TEXT,
    "body" TEXT,
    "sender" VARCHAR(255),
    "risk_score" DOUBLE PRECISION,
    "flags" JSONB,
    "nlp_analysis" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threat_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "domain" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "threat_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "malicious_domains" (
    "id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "source" VARCHAR(100),
    "threat_type" VARCHAR(100),
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "malicious_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "malicious_domains_domain_key" ON "malicious_domains"("domain");

-- AddForeignKey
ALTER TABLE "url_scans" ADD CONSTRAINT "url_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_scans" ADD CONSTRAINT "email_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
