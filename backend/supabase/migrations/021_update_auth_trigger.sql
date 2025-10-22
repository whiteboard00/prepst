-- Migration: Update Auth Trigger for Name Field
-- Description: Update the trigger function to use the new 'name' field instead of 'full_name'

-- Update the trigger function to use the new name field
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

-- The trigger itself doesn't need to be recreated, just the function
