-- Mila schema v0.1  (PostgreSQL 14+)
-- LEGAL REVIEW REQUIRED: retention periods and legal bases are placeholders to be set by the owner.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------- Identity ----------
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  locale text NOT NULL DEFAULT 'he' CHECK (locale IN ('he','en')),
  country_code char(2),
  birth_year int,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','support','compliance','admin','super_admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','pending_deletion')),
  email_verified_at timestamptz,
  totp_secret_enc text,
  ai_memory_enabled boolean NOT NULL DEFAULT false,
  training_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- ---------- Plans, usage, billing ----------
CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,                       -- free | pro | ultra (admin-editable)
  name text NOT NULL,
  monthly_messages int NOT NULL,
  monthly_images int NOT NULL,
  monthly_code_requests int NOT NULL,
  allowed_models text[] NOT NULL DEFAULT '{}',
  price_minor int,                           -- MISSING CONFIGURATION: owner sets prices
  currency char(3),
  active boolean NOT NULL DEFAULT true
);
INSERT INTO plans(id,name,monthly_messages,monthly_images,monthly_code_requests,allowed_models)
VALUES ('free','Free',30,3,10,'{}'),('pro','Pro',1000,100,300,'{}'),('ultra','Ultra',5000,500,1500,'{}')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  plan_id text NOT NULL REFERENCES plans(id),
  status text NOT NULL CHECK (status IN ('active','cancel_requested','cancelled','past_due','ended')),
  billing_period text CHECK (billing_period IN ('monthly','yearly')),
  provider text, provider_subscription_id text,
  current_period_end timestamptz,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subs_user_idx ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS usage_counters (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period text NOT NULL,                      -- YYYY-MM
  kind text NOT NULL CHECK (kind IN ('message','image','code')),
  used int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period, kind)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL, provider_payment_id text NOT NULL,
  amount_minor int NOT NULL, currency char(3) NOT NULL,
  vat_minor int, status text NOT NULL,
  invoice_ref text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)      -- double-charge / replay protection
);

CREATE TABLE IF NOT EXISTS webhook_events (
  provider text NOT NULL, event_id text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

-- ---------- Chat ----------
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'שיחה חדשה',
  mode text NOT NULL DEFAULT 'chat' CHECK (mode IN ('chat','code','image')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conv_user_idx ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  provider text, model text,
  status text NOT NULL DEFAULT 'complete' CHECK (status IN ('complete','stopped','error')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS msg_conv_idx ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key text NOT NULL, original_name text NOT NULL,
  mime text NOT NULL, size_bytes bigint NOT NULL,
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','clean','infected','error')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_models (
  id text PRIMARY KEY,                       -- "anthropic:claude-sonnet-5-5"
  provider text NOT NULL, model text NOT NULL, label text NOT NULL,
  min_plan text NOT NULL DEFAULT 'free' REFERENCES plans(id),
  enabled boolean NOT NULL DEFAULT false
);

-- ---------- Moderation / reports ----------
CREATE TABLE IF NOT EXISTS moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  stage text NOT NULL CHECK (stage IN ('input','output')),
  result text NOT NULL CHECK (result IN ('allowed','blocked','unconfigured','error')),
  categories text[], created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  reason text NOT NULL, details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','actioned','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Legal documents & consent ----------
CREATE TABLE IF NOT EXISTS legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  requires_acceptance boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS legal_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  lang text NOT NULL CHECK (lang IN ('he','en')),
  version int NOT NULL,
  title text NOT NULL, body_md text NOT NULL,
  change_reason text,
  is_material_change boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','legal_review','published','archived')),
  published_at timestamptz, effective_at timestamptz,
  created_by uuid REFERENCES users(id),
  UNIQUE (document_id, lang, version)
);
CREATE TABLE IF NOT EXISTS user_legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES legal_document_versions(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  screen text NOT NULL, ip_hash text, user_agent text
);
CREATE TABLE IF NOT EXISTS user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('marketing_email','marketing_sms','ai_training','ai_memory')),
  granted boolean NOT NULL,
  source text NOT NULL, scope text,
  created_at timestamptz NOT NULL DEFAULT now(),     -- append-only history; latest row wins
  ip_hash text
);
CREATE INDEX IF NOT EXISTS consents_idx ON user_consents(user_id, purpose, created_at DESC);
CREATE TABLE IF NOT EXISTS marketing_suppression (
  email citext PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), source text
);
CREATE TABLE IF NOT EXISTS cookie_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  anon_id text, analytics boolean NOT NULL DEFAULT false, marketing boolean NOT NULL DEFAULT false,
  policy_version int, created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Privacy management ----------
CREATE TABLE IF NOT EXISTS privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  contact_email citext NOT NULL,
  kind text NOT NULL CHECK (kind IN ('access','correction','deletion','objection','complaint')),
  details text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','identity_check','in_progress','completed','rejected')),
  decision_reason text,           -- e.g. legal retention duty. LEGAL REVIEW REQUIRED
  received_at timestamptz NOT NULL DEFAULT now(), due_at timestamptz, closed_at timestamptz
);
CREATE TABLE IF NOT EXISTS data_processors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, purpose text, data_types text[], processing_country text,
  agreement_status text NOT NULL DEFAULT 'MISSING CONFIGURATION',
  legal_review_note text
);
CREATE TABLE IF NOT EXISTS data_processing_records (   -- registry of databases / datasets
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, contents text, purposes text, owner text,
  authorized_roles text[], security_level text, retention text,
  registration_status text NOT NULL DEFAULT 'TECHNICAL VERIFICATION REQUIRED'
);
CREATE TABLE IF NOT EXISTS data_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id uuid NOT NULL REFERENCES data_processors(id),
  destination_country text NOT NULL, data_types text[], purpose text,
  legal_basis text NOT NULL DEFAULT 'LEGAL REVIEW REQUIRED', approved_at timestamptz, approved_by uuid REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS dpo_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answers jsonb NOT NULL, indicates_required boolean, assessed_by uuid REFERENCES users(id),
  note text DEFAULT 'LEGAL REVIEW REQUIRED', created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Security incidents ----------
CREATE TABLE IF NOT EXISTS security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, description text,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','contained','resolved')),
  data_affected text, users_affected_estimate int, remediation text,
  reporting_assessment text DEFAULT 'LEGAL REVIEW REQUIRED',
  authority_report_approved_by uuid REFERENCES users(id),   -- no auto-report; human approval only
  detected_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz
);

-- ---------- Consumer protection ----------
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id),
  kind text NOT NULL DEFAULT 'subscription_cancel' CHECK (kind IN ('subscription_cancel','transaction_cancel')),
  reason text, received_at timestamptz NOT NULL DEFAULT now(),
  receipt_sent_at timestamptz, effective_at timestamptz, completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id), payment_id uuid REFERENCES payments(id),
  reason text, status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','rejected','refunded')),
  decision_note text, created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Copyright & accessibility ----------
CREATE TABLE IF NOT EXISTS copyright_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complainant_name text NOT NULL, complainant_email citext NOT NULL,
  original_work text NOT NULL, infringing_location text NOT NULL, evidence text,
  good_faith_statement boolean NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','reviewing','removed','rejected','appealed','closed')),
  decision_note text, received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS accessibility_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email citext, page_url text, description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','fixed','wont_fix')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Admin / config ----------
CREATE TABLE IF NOT EXISTS business_profile (   -- all fields MISSING CONFIGURATION until owner fills them
  key text PRIMARY KEY, value text, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO business_profile(key) VALUES
 ('legal_name'),('business_number'),('address'),('contact_email'),('contact_phone'),
 ('privacy_contact'),('accessibility_contact'),('dpo_name'),('dpo_email'),('vat_status'),('governing_law_and_venue')
ON CONFLICT DO NOTHING;

-- ---------- Audit log: append-only ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid, actor_role text,
  action text NOT NULL, target_type text, target_id text,
  ip_hash text, meta jsonb NOT NULL DEFAULT '{}'
);
CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_logs_no_change ON audit_logs;
CREATE TRIGGER audit_logs_no_change BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

CREATE TABLE IF NOT EXISTS rate_limits (
  key text NOT NULL, window_start timestamptz NOT NULL, hits int NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);
