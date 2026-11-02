CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE public.app_role AS ENUM ('admin','editor');
CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','completed','cancelled','no_show');
CREATE TYPE public.price_type AS ENUM ('from','fixed');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "staff read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff read profiles" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_max_staff()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.user_roles WHERE user_id <> NEW.user_id) >= 2 THEN
    RAISE EXCEPTION 'Limite de 2 acessos administrativos atingido';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_max_staff BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.enforce_max_staff();

-- INVITES
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'editor',
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read invites" ON public.admin_invites FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin insert invites" ON public.admin_invites FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete invites" ON public.admin_invites FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND accepted_at IS NULL);

CREATE OR REPLACE FUNCTION public.check_invite_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  NEW.invited_by := auth.uid();
  IF (SELECT count(*) FROM public.user_roles) + (SELECT count(*) FROM public.admin_invites WHERE accepted_at IS NULL) >= 2 THEN
    RAISE EXCEPTION 'Limite de 2 acessos administrativos atingido';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_invite_limit BEFORE INSERT ON public.admin_invites FOR EACH ROW EXECUTE FUNCTION public.check_invite_limit();

-- New auth user: first user (created by the project owner, public signup disabled) becomes admin; invited users get their invited role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.admin_invites;
BEGIN
  INSERT INTO public.profiles(id, email, display_name)
  VALUES (NEW.id, lower(NEW.email), COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO inv FROM public.admin_invites WHERE email = lower(NEW.email) AND accepted_at IS NULL;
  IF FOUND THEN
    IF (SELECT count(*) FROM public.user_roles) < 2 THEN
      INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, inv.role);
      UPDATE public.admin_invites SET accepted_at = now() WHERE id = inv.id;
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SITE SETTINGS
CREATE TABLE public.site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp text,
  instagram text,
  address text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff update settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
INSERT INTO public.site_settings(id) VALUES (1);

-- SERVICES
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  description text,
  price_cents int NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  price_type public.price_type NOT NULL DEFAULT 'from',
  requires_length boolean NOT NULL DEFAULT false,
  price_short_cents int,
  price_medium_cents int,
  price_long_cents int,
  extra_long_addon_cents int,
  duration_minutes int NOT NULL DEFAULT 60 CHECK (duration_minutes >= 0 AND duration_minutes <= 600),
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active services" ON public.services FOR SELECT TO anon, authenticated USING (active OR public.is_staff(auth.uid()));
CREATE POLICY "staff insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update services" ON public.services FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete services" ON public.services FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- BUSINESS HOURS (weekday: 0=domingo ... 6=sábado)
CREATE TABLE public.business_hours (
  weekday int PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  is_open boolean NOT NULL DEFAULT false,
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '18:00',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CHECK (close_time > open_time)
);
GRANT SELECT ON public.business_hours TO anon;
GRANT SELECT, UPDATE ON public.business_hours TO authenticated;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read hours" ON public.business_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff update hours" ON public.business_hours FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
INSERT INTO public.business_hours(weekday, is_open) VALUES (0,false),(1,false),(2,true),(3,true),(4,true),(5,true),(6,true);

-- BLOCKED TIMES
CREATE TABLE public.blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_times TO authenticated;
GRANT ALL ON public.blocked_times TO service_role;
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all blocks" ON public.blocked_times FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  client_name text NOT NULL CHECK (char_length(client_name) BETWEEN 2 AND 100),
  client_phone text NOT NULL CHECK (client_phone ~ '^[0-9]{10,13}$'),
  hair_length text CHECK (hair_length IN ('curto','medio','longo')),
  extra_long boolean NOT NULL DEFAULT false,
  services jsonb NOT NULL,
  estimated_total_cents int NOT NULL,
  has_from_price boolean NOT NULL DEFAULT false,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'site',
  is_demo boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CONSTRAINT no_overlap EXCLUDE USING gist (tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending','confirmed'))
);
CREATE INDEX appointments_starts_idx ON public.appointments(starts_at);
GRANT SELECT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read appts" ON public.appointments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff update appts" ON public.appointments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "admin delete appts" ON public.appointments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- AUDIT LOG
CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  actor uuid,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log(table_name, record_id, action, actor, changes)
    VALUES (TG_TABLE_NAME, (to_jsonb(OLD)->>CASE WHEN TG_TABLE_NAME='business_hours' THEN 'weekday' ELSE 'id' END), TG_OP, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  INSERT INTO public.audit_log(table_name, record_id, action, actor, changes)
  VALUES (TG_TABLE_NAME, (to_jsonb(NEW)->>CASE WHEN TG_TABLE_NAME='business_hours' THEN 'weekday' ELSE 'id' END), TG_OP, auth.uid(),
    CASE WHEN TG_OP='UPDATE' THEN jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)) ELSE to_jsonb(NEW) END);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.touch_updated()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_services_touch BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.touch_updated();
CREATE TRIGGER trg_services_ins BEFORE INSERT ON public.services FOR EACH ROW EXECUTE FUNCTION public.touch_updated();
CREATE TRIGGER trg_hours_touch BEFORE UPDATE ON public.business_hours FOR EACH ROW EXECUTE FUNCTION public.touch_updated();
CREATE TRIGGER trg_settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated();
CREATE TRIGGER trg_appts_touch BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated();

CREATE OR REPLACE FUNCTION public.block_set_creator()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.created_by := auth.uid(); RETURN NEW; END $$;
CREATE TRIGGER trg_block_creator BEFORE INSERT ON public.blocked_times FOR EACH ROW EXECUTE FUNCTION public.block_set_creator();

CREATE TRIGGER audit_services AFTER INSERT OR UPDATE OR DELETE ON public.services FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_appts AFTER INSERT OR UPDATE OR DELETE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_blocks AFTER INSERT OR UPDATE OR DELETE ON public.blocked_times FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_hours AFTER UPDATE ON public.business_hours FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Validate appointment time against business hours and blocks (Sao Paulo local time)
CREATE OR REPLACE FUNCTION public.validate_appointment_time()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ls timestamp := NEW.starts_at AT TIME ZONE 'America/Sao_Paulo';
  le timestamp := NEW.ends_at AT TIME ZONE 'America/Sao_Paulo';
  bh public.business_hours;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.starts_at = OLD.starts_at AND NEW.ends_at = OLD.ends_at AND NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('pending','confirmed') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.starts_at < now() THEN
    RAISE EXCEPTION 'PAST_DATE: Não é possível agendar em datas/horários passados';
  END IF;
  SELECT * INTO bh FROM public.business_hours WHERE weekday = extract(dow FROM ls)::int;
  IF NOT bh.is_open THEN RAISE EXCEPTION 'CLOSED_DAY: O salão não atende neste dia'; END IF;
  IF ls::date <> le::date OR ls::time < bh.open_time OR le::time > bh.close_time THEN
    RAISE EXCEPTION 'OUT_OF_HOURS: Horário fora do expediente (% às %)', to_char(bh.open_time,'HH24:MI'), to_char(bh.close_time,'HH24:MI');
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_times b WHERE tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(NEW.starts_at,NEW.ends_at,'[)')) THEN
    RAISE EXCEPTION 'BLOCKED: Este horário está bloqueado na agenda';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_appt BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_time();

-- Public booking RPC (server-side pricing, duration and conflict validation)
CREATE OR REPLACE FUNCTION public.create_booking(
  p_name text, p_phone text, p_service_ids uuid[], p_hair_length text,
  p_extra_long boolean, p_starts_at timestamptz, p_notes text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  v_name text := btrim(coalesce(p_name,''));
  v_notes text := nullif(btrim(coalesce(p_notes,'')), '');
  s public.services;
  v_items jsonb := '[]'::jsonb;
  v_total int := 0; v_dur int := 0; v_from boolean := false; v_needs_len boolean := false;
  v_price int; v_code text; v_staff boolean := public.is_staff(auth.uid());
  v_end timestamptz;
BEGIN
  IF char_length(v_name) < 2 OR char_length(v_name) > 100 THEN RAISE EXCEPTION 'INVALID: Informe um nome válido'; END IF;
  IF v_phone LIKE '55%' AND char_length(v_phone) >= 12 THEN v_phone := substr(v_phone, 3); END IF;
  IF char_length(v_phone) NOT BETWEEN 10 AND 11 THEN RAISE EXCEPTION 'INVALID: Telefone inválido (informe DDD + número)'; END IF;
  IF p_service_ids IS NULL OR array_length(p_service_ids,1) IS NULL OR array_length(p_service_ids,1) > 10 THEN
    RAISE EXCEPTION 'INVALID: Escolha ao menos um serviço'; END IF;
  IF v_notes IS NOT NULL AND char_length(v_notes) > 1000 THEN RAISE EXCEPTION 'INVALID: Observações muito longas'; END IF;
  IF p_hair_length IS NOT NULL AND p_hair_length NOT IN ('curto','medio','longo') THEN RAISE EXCEPTION 'INVALID: Comprimento inválido'; END IF;

  FOR s IN SELECT * FROM public.services WHERE id = ANY(p_service_ids) AND active ORDER BY sort_order LOOP
    IF s.requires_length THEN
      v_needs_len := true;
      IF p_hair_length IS NULL THEN RAISE EXCEPTION 'INVALID: Informe o comprimento do cabelo para %', s.name; END IF;
      v_price := CASE p_hair_length WHEN 'curto' THEN s.price_short_cents WHEN 'medio' THEN s.price_medium_cents ELSE s.price_long_cents END;
      IF coalesce(p_extra_long,false) THEN v_price := v_price + coalesce(s.extra_long_addon_cents,0); END IF;
    ELSE
      v_price := s.price_cents;
    END IF;
    v_total := v_total + coalesce(v_price,0);
    v_dur := v_dur + s.duration_minutes;
    IF s.price_type = 'from' THEN v_from := true; END IF;
    v_items := v_items || jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category, 'price_cents', v_price, 'price_type', s.price_type);
  END LOOP;
  IF jsonb_array_length(v_items) <> array_length(p_service_ids,1) THEN RAISE EXCEPTION 'INVALID: Serviço indisponível'; END IF;
  IF v_dur < 15 THEN v_dur := 15; END IF;
  v_end := p_starts_at + make_interval(mins => v_dur);

  v_code := 'DL-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  BEGIN
    INSERT INTO public.appointments(code, client_name, client_phone, hair_length, extra_long, services, estimated_total_cents, has_from_price, notes, starts_at, ends_at, source, created_by)
    VALUES (v_code, v_name, v_phone, CASE WHEN v_needs_len THEN p_hair_length END, v_needs_len AND coalesce(p_extra_long,false), v_items, v_total, v_from, v_notes, p_starts_at, v_end,
      CASE WHEN v_staff THEN 'painel' ELSE 'site' END, CASE WHEN v_staff THEN auth.uid() END);
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'CONFLICT: Este horário acabou de ser reservado. Escolha outro horário.';
  END;

  RETURN jsonb_build_object('code', v_code, 'starts_at', p_starts_at, 'ends_at', v_end, 'services', v_items,
    'estimated_total_cents', v_total, 'has_from_price', v_from, 'hair_length', CASE WHEN v_needs_len THEN p_hair_length END,
    'extra_long', v_needs_len AND coalesce(p_extra_long,false), 'client_name', v_name);
END $$;
REVOKE ALL ON FUNCTION public.create_booking(text,text,uuid[],text,boolean,timestamptz,text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_booking(text,text,uuid[],text,boolean,timestamptz,text) TO anon, authenticated;

-- Public busy intervals for a local date (no personal data)
CREATE OR REPLACE FUNCTION public.get_busy_intervals(p_date date)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH day AS (SELECT (p_date::timestamp AT TIME ZONE 'America/Sao_Paulo') AS d0, ((p_date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo') AS d1)
  SELECT a.starts_at, a.ends_at FROM public.appointments a, day
   WHERE a.status IN ('pending','confirmed') AND a.starts_at < day.d1 AND a.ends_at > day.d0
  UNION ALL
  SELECT b.starts_at, b.ends_at FROM public.blocked_times b, day
   WHERE b.starts_at < day.d1 AND b.ends_at > day.d0
$$;
REVOKE ALL ON FUNCTION public.get_busy_intervals(date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_busy_intervals(date) TO anon, authenticated;

-- Initial catalog (durations are initial configurable estimates, not provided by the salon)
INSERT INTO public.services(category, name, description, price_cents, price_type, requires_length, price_short_cents, price_medium_cents, price_long_cents, extra_long_addon_cents, duration_minutes, sort_order) VALUES
('CABELO','CORTE COM SECAGEM',NULL,8000,'from',false,NULL,NULL,NULL,NULL,60,10),
('CABELO','CORTE COM ESCOVA',NULL,12000,'from',false,NULL,NULL,NULL,NULL,75,20),
('CABELO','CORTE TRATAMENTO (com secagem)',NULL,17000,'from',false,NULL,NULL,NULL,NULL,90,30),
('CABELO','ESCOVA',NULL,7000,'from',false,NULL,NULL,NULL,NULL,60,40),
('CABELO','APLICAÇÃO DE TINTURA',NULL,9000,'from',false,NULL,NULL,NULL,NULL,90,50),
('CABELO','RETOQUE',NULL,7000,'from',false,NULL,NULL,NULL,NULL,90,60),
('CABELO','TINTURA COMPLETA',NULL,12000,'from',false,NULL,NULL,NULL,NULL,120,70),
('CABELO','TUBO EXTRA DE TINTA (unidade)',NULL,4000,'fixed',false,NULL,NULL,NULL,NULL,0,80),
('CABELO','PRANCHA',NULL,2500,'from',false,NULL,NULL,NULL,NULL,30,90),
('CABELO','BABYLISS',NULL,3500,'from',false,NULL,NULL,NULL,NULL,45,100),
('PROGRESSIVA','PROGRESSIVA','Preço conforme o comprimento. EXTRA LONGO/VOLUMOSO: adicional de R$ 30 sobre o preço do comprimento escolhido.',16000,'fixed',true,16000,19000,25000,3000,180,200),
('MECHAS','MECHAS','Preço conforme o comprimento. EXTRA LONGO/VOLUMOSO: adicional de R$ 50 sobre o preço do comprimento escolhido.',35000,'fixed',true,35000,40000,55000,5000,240,300),
('MORENA ILUMINADA','MORENA ILUMINADA',NULL,30000,'from',false,NULL,NULL,NULL,NULL,240,400),
('TRATAMENTO + ESCOVA','LINHA GOLD','Wella, L''oreal, Sebastian e Aneethun',15000,'fixed',false,NULL,NULL,NULL,NULL,90,500),
('TRATAMENTO + ESCOVA','LINHA BRANCA',NULL,12000,'fixed',false,NULL,NULL,NULL,NULL,75,510),
('CRONOGRAMA CAPILAR','CRONOGRAMA CAPILAR — 4 SESSÕES','Agendamento da primeira sessão; as demais são combinadas no salão.',43000,'fixed',false,NULL,NULL,NULL,NULL,60,600);