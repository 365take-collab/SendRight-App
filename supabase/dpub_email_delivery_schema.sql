-- dpub-style email delivery tables
-- Apply via Supabase MCP execute_sql against project prenzqrbizqvuawxlqwl.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.dpub_email_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text UNIQUE NOT NULL,
  brand text NOT NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  sender_email text NOT NULL,
  sent_date timestamptz,
  greeting_pattern text,
  hook_text text,
  authority_elements jsonb DEFAULT '[]'::jsonb,
  bullet_benefits jsonb DEFAULT '[]'::jsonb,
  cta_pattern text,
  scarcity_elements jsonb DEFAULT '[]'::jsonb,
  ps_section text,
  tracking_link_count int DEFAULT 0,
  word_count int,
  paragraph_count int,
  link_count int,
  cta_count int,
  urgency_score smallint DEFAULT 0,
  personalization_score smallint DEFAULT 0,
  raw_body_excerpt text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dpub_email_processed (
  gmail_message_id text PRIMARY KEY,
  processed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email_type text NOT NULL,
  brand_voice text,
  emotion_tag text,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  placeholder_schema jsonb NOT NULL,
  source_pattern_ids jsonb,
  performance_score double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_seqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  product_name text NOT NULL,
  target_segment text,
  status text DEFAULT 'draft',
  cadence_config jsonb DEFAULT '{"sends_per_day":5,"hours":[7,10,12,17,19]}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seq_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_id uuid REFERENCES public.email_seqs(id) ON DELETE CASCADE,
  position int NOT NULL,
  template_id uuid REFERENCES public.email_templates(id),
  delay_hours int DEFAULT 0,
  subject text NOT NULL,
  body_html text NOT NULL,
  emotion_tag text,
  email_type text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (seq_id, position)
);

CREATE TABLE IF NOT EXISTS public.subscriber_seq_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_email text NOT NULL,
  seq_id uuid REFERENCES public.email_seqs(id) ON DELETE CASCADE,
  current_step int DEFAULT 0,
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  last_sent_at timestamptz,
  next_send_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (subscriber_email, seq_id)
);

CREATE TABLE IF NOT EXISTS public.email_send_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_email text NOT NULL,
  seq_id uuid REFERENCES public.email_seqs(id),
  step_id uuid REFERENCES public.seq_steps(id),
  subject text NOT NULL,
  body_html text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text DEFAULT 'pending',
  send_attempts int DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_email text NOT NULL,
  seq_id uuid,
  step_position int,
  gmail_message_id text,
  sent_at timestamptz DEFAULT now(),
  UNIQUE (subscriber_email, seq_id, step_position)
);

CREATE INDEX IF NOT EXISTS idx_dpub_patterns_type
  ON public.dpub_email_patterns(email_type);

CREATE INDEX IF NOT EXISTS idx_dpub_patterns_brand
  ON public.dpub_email_patterns(brand);

CREATE INDEX IF NOT EXISTS idx_sub_state_next
  ON public.subscriber_seq_state(next_send_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_send_queue_pending
  ON public.email_send_queue(scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.dpub_email_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpub_email_processed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_seqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seq_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_seq_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

COMMIT;
