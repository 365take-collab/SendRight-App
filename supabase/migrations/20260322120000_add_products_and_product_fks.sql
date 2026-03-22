BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tagline text,
  category text DEFAULT 'saas',
  status text DEFAULT 'building',
  url text,
  free_frontend_url text,
  price_display text,
  benefits jsonb DEFAULT '[]'::jsonb,
  usp text,
  target_audience text,
  authority_proof jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_seqs
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id);

CREATE INDEX IF NOT EXISTS idx_email_seqs_product
  ON public.email_seqs(product_id);

ALTER TABLE public.email_send_queue
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

COMMIT;
