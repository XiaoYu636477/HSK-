-- Feedback/Opinion system
CREATE TABLE IF NOT EXISTS "public"."feedbacks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "contact" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."feedbacks" ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback
CREATE POLICY "Anyone can submit feedback" ON "public"."feedbacks" FOR INSERT WITH CHECK (true);
-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON "public"."feedbacks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));
-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON "public"."feedbacks" FOR SELECT USING ("public"."is_admin"());
-- Admins can update feedback (mark as read)
CREATE POLICY "Admins can update feedback" ON "public"."feedbacks" FOR UPDATE USING ("public"."is_admin"());

CREATE INDEX IF NOT EXISTS "idx_feedbacks_user_id" ON "public"."feedbacks" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_is_read" ON "public"."feedbacks" USING "btree" ("is_read");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_created_at" ON "public"."feedbacks" USING "btree" ("created_at" DESC);
