-- ============================================================
-- HSK Application Database Schema
-- Clean migration for Supabase
-- ============================================================

-- 1. Custom Type
CREATE TYPE "public"."user_role" AS ENUM ('user', 'admin');

-- 2. Tables
CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "email" "text",
    "phone" "text",
    "role" "public"."user_role" DEFAULT 'user'::"public"."user_role" NOT NULL,
    "native_language" "text" DEFAULT 'en'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "invitation_code" "text",
    "membership" "text" DEFAULT 'pending'::"text" NOT NULL,
    "daily_limit" smallint DEFAULT 20 NOT NULL,
    "calls_today" smallint DEFAULT 0 NOT NULL,
    "total_calls" integer DEFAULT 0 NOT NULL,
    "last_call_date" "date",
    "expires_at" timestamp with time zone,
    "admin_note" "text",
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_membership_check" CHECK (("membership" = ANY (ARRAY['pending'::"text", 'trial'::"text", 'basic'::"text", 'pro'::"text", 'disabled'::"text"]))),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

CREATE TABLE "public"."invitation_codes" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "status" "text" DEFAULT 'unused'::"text" NOT NULL,
    "bound_user_id" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activated_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "nickname" "text",
    "daily_limit" smallint DEFAULT 20 NOT NULL,
    "calls_today" smallint DEFAULT 0 NOT NULL,
    "total_calls" integer DEFAULT 0 NOT NULL,
    "last_call_date" "date",
    CONSTRAINT "invitation_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invitation_codes_code_key" UNIQUE ("code"),
    CONSTRAINT "invitation_codes_status_check" CHECK (("status" = ANY (ARRAY['unused'::"text", 'used'::"text", 'disabled'::"text"]))),
    CONSTRAINT "invitation_codes_bound_user_id_fkey" FOREIGN KEY ("bound_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

CREATE SEQUENCE "public"."invitation_codes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."invitation_codes_id_seq" OWNED BY "public"."invitation_codes"."id";
ALTER TABLE ONLY "public"."invitation_codes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."invitation_codes_id_seq"'::"regclass");

CREATE TABLE "public"."corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "module" "text" NOT NULL,
    "input_text" "text",
    "input_image_url" "text",
    "input_audio_url" "text",
    "radar_data" "jsonb",
    "corrections_data" "jsonb",
    "exercises_data" "jsonb",
    "score_data" "jsonb",
    "suggestions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "hsk_level" "text",
    "module_type" "text",
    "exam_data" "jsonb",
    "practice_data" "jsonb",
    CONSTRAINT "corrections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "corrections_module_check" CHECK (("module" = ANY (ARRAY['essay'::"text", 'homework'::"text", 'oral'::"text", 'score'::"text"]))),
    CONSTRAINT "corrections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

CREATE TABLE "public"."learning_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "weak_dimensions" "jsonb",
    "plan_content" "jsonb",
    "exercises" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "learning_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "learning_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- 3. View
CREATE VIEW "public"."public_profiles" AS
 SELECT "id", "username", "role"
 FROM "public"."profiles";

-- 4. Functions
CREATE FUNCTION "public"."get_user_role"("uid" "uuid") RETURNS "public"."user_role"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

CREATE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'user'::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE FUNCTION "public"."activate_code_anonymous"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_row invitation_codes;
  v_expires timestamptz;
BEGIN
  SELECT * INTO v_row
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '邀请码不存在 / Код не найден');
  END IF;

  IF v_row.status = 'disabled' THEN
    RETURN jsonb_build_object('ok', false, 'error', '邀请码已禁用 / Код деактивирован');
  END IF;

  IF v_row.status = 'used' THEN
    v_expires := v_row.expires_at;
    RETURN jsonb_build_object(
      'ok',         true,
      'code',       v_row.code,
      'membership', 'trial',
      'expires_at', v_expires,
      'reused',     true
    );
  END IF;

  v_expires := COALESCE(v_row.expires_at, now() + interval '30 days');

  UPDATE invitation_codes
  SET status       = 'used',
      activated_at = now()
  WHERE code = p_code;

  RETURN jsonb_build_object(
    'ok',         true,
    'code',       p_code,
    'membership', 'trial',
    'expires_at', v_expires,
    'reused',     false
  );
END;
$$;

CREATE FUNCTION "public"."activate_code_anonymous"("p_code" "text", "p_nickname" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_row     invitation_codes;
  v_expires timestamptz;
BEGIN
  SELECT * INTO v_row
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '邀请码不存在 / Код не найден');
  END IF;

  IF v_row.status = 'disabled' THEN
    RETURN jsonb_build_object('ok', false, 'error', '邀请码已禁用 / Код деактивирован');
  END IF;

  v_expires := COALESCE(v_row.expires_at, now() + interval '30 days');

  IF v_row.status = 'used' THEN
    IF p_nickname IS NOT NULL THEN
      UPDATE invitation_codes SET nickname = p_nickname WHERE code = p_code;
    END IF;
    RETURN jsonb_build_object(
      'ok',          true,
      'code',        v_row.code,
      'nickname',    COALESCE(p_nickname, v_row.nickname),
      'membership',  'trial',
      'daily_limit', v_row.daily_limit,
      'expires_at',  v_expires,
      'reused',      true
    );
  END IF;

  UPDATE invitation_codes
  SET status = 'used',
      activated_at = now(),
      nickname = COALESCE(p_nickname, v_row.nickname)
  WHERE code = p_code;

  RETURN jsonb_build_object(
    'ok',          true,
    'code',        p_code,
    'nickname',    COALESCE(p_nickname, v_row.nickname),
    'membership',  'trial',
    'daily_limit', v_row.daily_limit,
    'expires_at',  v_expires,
    'reused',      false
  );
END;
$$;

CREATE FUNCTION "public"."activate_invitation_code"("p_code" "text", "p_user_id" "uuid", "p_trial_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_code_row invitation_codes;
  v_expires  timestamptz;
BEGIN
  SELECT * INTO v_code_row
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '邀请码不存在 / Код не найден');
  END IF;

  IF v_code_row.status != 'unused' THEN
    RETURN jsonb_build_object('ok', false, 'error', '邀请码已被使用或已禁用 / Код уже использован');
  END IF;

  v_expires := now() + (p_trial_days || ' days')::interval;
  IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at < v_expires THEN
    v_expires := v_code_row.expires_at;
  END IF;

  UPDATE invitation_codes
  SET status = 'used', bound_user_id = p_user_id, activated_at = now()
  WHERE code = p_code;

  RETURN jsonb_build_object(
    'ok',         true,
    'code',       p_code,
    'membership', 'trial',
    'expires_at', v_expires
  );
END;
$$;

CREATE FUNCTION "public"."bind_yucode"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_row invitation_codes;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '请先登录 / Please login first');
  END IF;

  IF EXISTS (SELECT 1 FROM invitation_codes WHERE bound_user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', '该账号已绑定小Yu码 / Already bound');
  END IF;

  SELECT * INTO v_row
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '邀请码不存在 / Код не найден');
  END IF;

  IF v_row.status = 'disabled' THEN
    RETURN jsonb_build_object('ok', false, 'error', '邀请码已禁用 / Код деактивирован');
  END IF;

  IF v_row.bound_user_id IS NOT NULL THEN
    IF v_row.bound_user_id = auth.uid() THEN
      RETURN jsonb_build_object('ok', true, 'code', p_code);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', '该码已被其他账号使用 / Code already used by another account');
    END IF;
  END IF;

  UPDATE invitation_codes
  SET status = 'used',
      activated_at = COALESCE(v_row.activated_at, now()),
      bound_user_id = auth.uid(),
      nickname = COALESCE((SELECT username FROM profiles WHERE id = auth.uid()), v_row.nickname)
  WHERE code = p_code;

  RETURN jsonb_build_object('ok', true, 'code', p_code);
END;
$$;

CREATE FUNCTION "public"."increment_api_call"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_row invitation_codes;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_logged_in');
  END IF;

  SELECT * INTO v_row
  FROM invitation_codes
  WHERE bound_user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_bound');
  END IF;

  IF v_row.status = 'disabled' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'disabled');
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF v_row.last_call_date IS NULL OR v_row.last_call_date < CURRENT_DATE THEN
    UPDATE invitation_codes
    SET calls_today    = 1,
        last_call_date = CURRENT_DATE,
        total_calls    = total_calls + 1
    WHERE bound_user_id = auth.uid();
    RETURN jsonb_build_object('ok', true, 'calls_today', 1, 'daily_limit', v_row.daily_limit);
  END IF;

  IF v_row.calls_today >= v_row.daily_limit THEN
    RETURN jsonb_build_object(
      'ok',          false,
      'reason',      'limit_reached',
      'calls_today', v_row.calls_today,
      'daily_limit', v_row.daily_limit
    );
  END IF;

  UPDATE invitation_codes
  SET calls_today = calls_today + 1,
      total_calls = total_calls + 1
  WHERE bound_user_id = auth.uid();

  RETURN jsonb_build_object(
    'ok',          true,
    'calls_today', v_row.calls_today + 1,
    'daily_limit', v_row.daily_limit
  );
END;
$$;

-- 5. Trigger: auto-create profile on signup
CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

-- 6. Indexes
CREATE INDEX "idx_corrections_hsk_level" ON "public"."corrections" USING "btree" ("user_id", "hsk_level") WHERE ("hsk_level" IS NOT NULL);
CREATE INDEX "idx_corrections_practice" ON "public"."corrections" USING "btree" ("user_id", "module", "created_at" DESC) WHERE ("module" = 'practice'::"text");
CREATE INDEX "idx_corrections_user_module" ON "public"."corrections" USING "btree" ("user_id", "module", "created_at" DESC);
CREATE INDEX "idx_invitation_codes_code" ON "public"."invitation_codes" USING "btree" ("code");
CREATE INDEX "idx_invitation_codes_status" ON "public"."invitation_codes" USING "btree" ("status");
CREATE INDEX "idx_profiles_membership" ON "public"."profiles" USING "btree" ("membership");

-- 7. Row Level Security
ALTER TABLE "public"."corrections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invitation_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."learning_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- 8. Policies
-- corrections
CREATE POLICY "Users can view own corrections" ON "public"."corrections" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert own corrections" ON "public"."corrections" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete own corrections" ON "public"."corrections" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));

-- invitation_codes
CREATE POLICY "Users can view their bound code" ON "public"."invitation_codes" FOR SELECT TO "authenticated" USING (("bound_user_id" = "auth"."uid"()));
CREATE POLICY "可查询未使用邀请码" ON "public"."invitation_codes" FOR SELECT USING (("status" = 'unused'::"text"));
CREATE POLICY "管理员可查全部邀请码" ON "public"."invitation_codes" FOR SELECT USING ("public"."is_admin"());
CREATE POLICY "管理员可管理邀请码" ON "public"."invitation_codes" USING ("public"."is_admin"());
CREATE POLICY "Admins full access to invitation_codes" ON "public"."invitation_codes" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));

-- learning_plans
CREATE POLICY "Users can view own plans" ON "public"."learning_plans" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert own plans" ON "public"."learning_plans" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));

-- profiles
CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK ((NOT ("role" IS DISTINCT FROM "public"."get_user_role"("auth"."uid"()))));
CREATE POLICY "管理员可查所有用户" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"());
CREATE POLICY "管理员可改所有用户" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"());
CREATE POLICY "Admins have full access to profiles" ON "public"."profiles" TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = 'admin'::"public"."user_role"));

-- 9. Storage bucket for uploads
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type")
VALUES ('uploads', 'uploads', NULL, now(), now(), true, false, NULL, NULL, NULL, 'STANDARD')
ON CONFLICT ("id") DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view files" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'uploads'::"text"));
CREATE POLICY "Anyone can upload files" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'uploads'::"text"));
CREATE POLICY "Users can delete own files" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'uploads'::"text"));
