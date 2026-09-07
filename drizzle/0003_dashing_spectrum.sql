ALTER TABLE "guests" ADD COLUMN "username" varchar(50);--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "password_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "guests_username_idx" ON "guests" USING btree ("username");