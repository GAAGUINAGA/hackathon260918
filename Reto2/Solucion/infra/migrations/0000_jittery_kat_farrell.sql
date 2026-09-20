CREATE TYPE "public"."actor_kind" AS ENUM('user', 'system', 'ai');--> statement-breakpoint
CREATE TYPE "public"."ai_mode" AS ENUM('off', 'suggest', 'auto');--> statement-breakpoint
CREATE TYPE "public"."blocking_key" AS ENUM('B1', 'B2', 'B3', 'B4', 'embedding');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('pending', 'merged', 'rejected', 'auto_merged');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('active', 'merged');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('google', 'microsoft', 'icloud');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'completed', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('sync_full', 'sync_incremental', 'import', 'export', 'dedupe_scan');--> statement-breakpoint
CREATE TYPE "public"."outbox_event_type" AS ENUM('dedupe:scan', 'merge:auto', 'push.external', 'push.groups', 'sync.full', 'import:file', 'export:file');--> statement-breakpoint
CREATE TYPE "public"."push_state" AS ENUM('pending', 'synced', 'conflict', 'failed');--> statement-breakpoint
CREATE TYPE "public"."revision_operation" AS ENUM('create', 'update', 'withdraw', 'restore', 'restore_revision', 'merge');--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"region" text DEFAULT 'EC' NOT NULL,
	"language" text DEFAULT 'es' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"ai_mode" "ai_mode" DEFAULT 'off' NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"display_name" text,
	"company" text,
	"title" text,
	"notes" text,
	"notes_hash" text,
	"status" "contact_status" DEFAULT 'active' NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"value" text NOT NULL,
	"local_part" text NOT NULL,
	"domain" text NOT NULL,
	"email_local_key" text NOT NULL,
	"email_domain_key" text NOT NULL,
	"is_principal" boolean DEFAULT false NOT NULL,
	"user_locked" boolean DEFAULT false NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"raw_input" text NOT NULL,
	"e164" text,
	"is_normalized" boolean NOT NULL,
	"is_principal" boolean DEFAULT false NOT NULL,
	"user_locked" boolean DEFAULT false NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"label" text,
	"street" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"is_principal" boolean DEFAULT false NOT NULL,
	"user_locked" boolean DEFAULT false NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_normalized" text NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_normalized" text NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tag_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_category_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"remote_account_id" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "integration_status" DEFAULT 'active' NOT NULL,
	"refresh_token_ciphertext" text NOT NULL,
	"refresh_token_iv" text NOT NULL,
	"refresh_token_auth_tag" text NOT NULL,
	"sync_token" text,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"integration_account_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"remote_id" text NOT NULL,
	"etag" text,
	"pushed_etags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"push_state" "push_state" DEFAULT 'pending' NOT NULL,
	"deleted_remotely" boolean DEFAULT false NOT NULL,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"actor_kind" "actor_kind" NOT NULL,
	"actor_id" uuid,
	"operation" "revision_operation" NOT NULL,
	"field_changes" jsonb NOT NULL,
	"suggestion_id" uuid,
	"ai_model" text,
	"ai_prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_revisions_ai_reserve_chk" CHECK (("contact_revisions"."suggestion_id" IS NULL AND "contact_revisions"."ai_model" IS NULL AND "contact_revisions"."ai_prompt_version" IS NULL) OR "contact_revisions"."actor_kind" = 'ai')
);
--> statement-breakpoint
CREATE TABLE "duplicate_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"contact_id_low" uuid NOT NULL,
	"contact_id_high" uuid NOT NULL,
	"score" real NOT NULL,
	"signals" jsonb NOT NULL,
	"blocking_key" "blocking_key" NOT NULL,
	"status" "candidate_status" DEFAULT 'pending' NOT NULL,
	"identity_fingerprint" jsonb,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "duplicate_candidates_canonical_order_chk" CHECK ("duplicate_candidates"."contact_id_low" < "duplicate_candidates"."contact_id_high")
);
--> statement-breakpoint
CREATE TABLE "merge_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"survivor_contact_id" uuid NOT NULL,
	"victim_snapshots" jsonb NOT NULL,
	"actor_kind" "actor_kind" NOT NULL,
	"actor_id" uuid,
	"undone_at" timestamp with time zone,
	"state" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"event_type" "outbox_event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"job_type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"progress" jsonb,
	"error" text,
	"integration_account_id" uuid,
	"state" boolean DEFAULT true NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_phones" ADD CONSTRAINT "contact_phones_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_addresses" ADD CONSTRAINT "contact_addresses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tag_links" ADD CONSTRAINT "contact_tag_links_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tag_links" ADD CONSTRAINT "contact_tag_links_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_category_links" ADD CONSTRAINT "contact_category_links_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_category_links" ADD CONSTRAINT "contact_category_links_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_links" ADD CONSTRAINT "contact_links_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_links" ADD CONSTRAINT "contact_links_integration_account_id_integration_accounts_id_fk" FOREIGN KEY ("integration_account_id") REFERENCES "public"."integration_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_revisions" ADD CONSTRAINT "contact_revisions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_contact_id_low_contacts_id_fk" FOREIGN KEY ("contact_id_low") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_contact_id_high_contacts_id_fk" FOREIGN KEY ("contact_id_high") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_operations" ADD CONSTRAINT "merge_operations_survivor_contact_id_contacts_id_fk" FOREIGN KEY ("survivor_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_integration_account_id_integration_accounts_id_fk" FOREIGN KEY ("integration_account_id") REFERENCES "public"."integration_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_emails_contact_id_idx" ON "contact_emails" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_emails_owner_value_idx" ON "contact_emails" USING btree ("owner_id","value");--> statement-breakpoint
CREATE INDEX "contact_emails_owner_local_domain_idx" ON "contact_emails" USING btree ("owner_id","email_local_key","email_domain_key");--> statement-breakpoint
CREATE INDEX "contact_phones_contact_id_idx" ON "contact_phones" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_phones_owner_e164_idx" ON "contact_phones" USING btree ("owner_id","e164");--> statement-breakpoint
CREATE INDEX "contact_addresses_contact_id_idx" ON "contact_addresses" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_owner_name_normalized_live_idx" ON "tags" USING btree ("owner_id","name_normalized") WHERE "tags"."state" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_owner_name_normalized_live_idx" ON "categories" USING btree ("owner_id","name_normalized") WHERE "categories"."state" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_tag_links_live_idx" ON "contact_tag_links" USING btree ("contact_id","tag_id") WHERE "contact_tag_links"."state" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_category_links_live_idx" ON "contact_category_links" USING btree ("contact_id") WHERE "contact_category_links"."state" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "integration_accounts_live_idx" ON "integration_accounts" USING btree ("owner_id","provider","remote_account_id") WHERE "integration_accounts"."state" = true;--> statement-breakpoint
CREATE INDEX "contact_links_contact_id_idx" ON "contact_links" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_links_live_idx" ON "contact_links" USING btree ("integration_account_id","remote_id") WHERE "contact_links"."state" = true;--> statement-breakpoint
CREATE INDEX "contact_revisions_contact_id_idx" ON "contact_revisions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "duplicate_candidates_owner_idx" ON "duplicate_candidates" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "duplicate_candidates_pair_live_idx" ON "duplicate_candidates" USING btree ("contact_id_low","contact_id_high") WHERE "duplicate_candidates"."state" = true;--> statement-breakpoint
CREATE INDEX "merge_operations_survivor_idx" ON "merge_operations" USING btree ("survivor_contact_id");--> statement-breakpoint
CREATE INDEX "outbox_unprocessed_idx" ON "outbox" USING btree ("processed_at","created_at");--> statement-breakpoint
CREATE INDEX "jobs_owner_status_idx" ON "jobs" USING btree ("owner_id","status");