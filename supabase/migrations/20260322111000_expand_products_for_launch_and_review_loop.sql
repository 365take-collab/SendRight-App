BEGIN;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS revenue_last_30d numeric DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cac numeric DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ltv numeric DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS email_priority_weight numeric DEFAULT 1.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS launch_status text DEFAULT 'none';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS launch_starts_at timestamptz;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS launch_ends_at timestamptz;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS auto_pause_threshold numeric DEFAULT -5000;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand text DEFAULT 'launchx';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lp_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text;

CREATE TABLE IF NOT EXISTS public.email_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid,
  product_id uuid REFERENCES public.products(id),
  hook_type text,
  send_count int DEFAULT 0,
  open_count int DEFAULT 0,
  click_count int DEFAULT 0,
  first_sent_at timestamptz,
  last_sent_at timestamptz,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_perf_product
  ON public.email_performance(product_id);

CREATE INDEX IF NOT EXISTS idx_email_perf_status
  ON public.email_performance(status);

CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id),
  tier int NOT NULL,
  name text NOT NULL,
  price_jpy int NOT NULL,
  stripe_price_id text,
  billing_interval text,
  trial_days int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_product
  ON public.pricing_tiers(product_id);

ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS hook_type text;

ALTER TABLE public.email_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

COMMIT;
