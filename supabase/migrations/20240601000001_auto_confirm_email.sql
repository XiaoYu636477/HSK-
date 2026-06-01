-- Fix: Auto-confirm email for new users (no email service needed)
-- This allows username+password registration without email verification

CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(NEW.email_confirmed_at, now()),
      confirmed_at = COALESCE(NEW.confirmed_at, now()),
      updated_at = now()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_signup_confirm_email ON auth.users;
CREATE TRIGGER on_signup_confirm_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();
