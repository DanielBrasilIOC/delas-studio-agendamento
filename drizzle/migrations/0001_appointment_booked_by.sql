ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS created_by_name text;

CREATE OR REPLACE FUNCTION public.appointment_set_creator()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NOT NULL AND public.is_staff(v_uid) THEN
    NEW.created_by := v_uid;
    NEW.source := 'painel';
    SELECT coalesce(nullif(btrim(p.display_name),''), p.email) INTO NEW.created_by_name FROM public.profiles p WHERE p.id = v_uid;
  ELSE
    NEW.created_by := NULL;
    NEW.created_by_name := NULL;
    NEW.source := 'site';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_appt_creator BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.appointment_set_creator();

UPDATE public.appointments a SET created_by_name = coalesce(nullif(btrim(p.display_name),''), p.email)
FROM public.profiles p WHERE a.created_by = p.id AND a.created_by_name IS NULL;