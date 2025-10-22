-- Migration: Simplify Name Field
-- Description: Add name column and update trigger

-- 1. Add the new name column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- 2. Migrate existing data from full_name to name
UPDATE users 
SET name = COALESCE(full_name, email)
WHERE name IS NULL;

-- 3. Update the trigger function to use the new name field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;