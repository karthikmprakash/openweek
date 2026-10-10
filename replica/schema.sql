PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS studios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  cancellation_window_hours INTEGER NOT NULL DEFAULT 12 CHECK (cancellation_window_hours >= 0),
  late_cancel_mode TEXT NOT NULL DEFAULT 'forfeit' CHECK (late_cancel_mode IN ('fee', 'credit', 'forfeit')),
  late_cancel_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (late_cancel_fee_cents >= 0),
  no_show_mode TEXT NOT NULL DEFAULT 'forfeit' CHECK (no_show_mode IN ('fee', 'credit', 'forfeit')),
  no_show_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (no_show_fee_cents >= 0),
  waitlist_claim_minutes INTEGER NOT NULL DEFAULT 60 CHECK (waitlist_claim_minutes > 0),
  reminder_lead_hours INTEGER NOT NULL DEFAULT 24 CHECK (reminder_lead_hours >= 0),
  stripe_account_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'instructor')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS staff_studio ON staff (studio_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  email_opt_out INTEGER NOT NULL DEFAULT 0 CHECK (email_opt_out IN (0, 1)),
  sms_opt_out INTEGER NOT NULL DEFAULT 0 CHECK (sms_opt_out IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (studio_id, email)
);
CREATE INDEX IF NOT EXISTS members_studio ON members (studio_id);

CREATE TABLE IF NOT EXISTS class_types (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  default_capacity INTEGER NOT NULL CHECK (default_capacity > 0),
  drop_in_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (drop_in_price_cents >= 0),
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS class_types_studio ON class_types (studio_id);

CREATE TABLE IF NOT EXISTS class_sessions (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  class_type_id TEXT NOT NULL REFERENCES class_types(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  instructor_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  created_at TEXT NOT NULL,
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS sessions_studio_start ON class_sessions (studio_id, starts_at);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('drop_in', 'pack', 'membership')),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  credit_count INTEGER,
  validity_days INTEGER NOT NULL CHECK (validity_days > 0),
  created_at TEXT NOT NULL,
  CHECK (
    (kind = 'membership' AND credit_count IS NULL)
    OR (kind = 'drop_in' AND credit_count = 1)
    OR (kind = 'pack' AND credit_count > 0)
  )
);
CREATE INDEX IF NOT EXISTS products_studio ON products (studio_id);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  credits_remaining INTEGER,
  unlimited INTEGER NOT NULL DEFAULT 0 CHECK (unlimited IN (0, 1)),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (
    (unlimited = 1 AND credits_remaining IS NULL)
    OR (unlimited = 0 AND credits_remaining IS NOT NULL AND credits_remaining >= 0)
  )
);
CREATE INDEX IF NOT EXISTS entitlements_member ON entitlements (member_id, expires_at);
CREATE INDEX IF NOT EXISTS entitlements_studio_expiry ON entitlements (studio_id, expires_at);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'confirmed', 'cancelled', 'late_cancelled', 'offer_pending', 'attended', 'no_show'
  )),
  entitlement_id TEXT,
  manage_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  cancelled_at TEXT
);
CREATE INDEX IF NOT EXISTS bookings_session ON bookings (session_id, status);
CREATE INDEX IF NOT EXISTS bookings_studio ON bookings (studio_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active
  ON bookings (session_id, guest_email)
  WHERE status IN ('confirmed', 'offer_pending', 'attended', 'no_show');

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  member_id TEXT,
  product_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  application_fee_cents INTEGER,
  stripe_payment_intent_id TEXT,
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('requires_payment', 'succeeded', 'failed', 'refunded')),
  kind TEXT NOT NULL CHECK (kind IN ('drop_in', 'pack', 'membership', 'late_fee', 'no_show_fee')),
  created_at TEXT NOT NULL,
  CHECK (application_fee_cents IS NULL OR application_fee_cents = 0)
);
CREATE INDEX IF NOT EXISTS payments_studio_created ON payments (studio_id, created_at);
CREATE INDEX IF NOT EXISTS payments_booking ON payments (booking_id);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  studio_id TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('self', 'staff')),
  checked_in_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS attendance_session ON attendance (session_id);

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  member_id TEXT,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'offered', 'claimed', 'expired', 'cancelled')),
  offer_expires_at TEXT,
  booking_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS waitlist_session ON waitlist (session_id, status, position);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_one_open
  ON waitlist (session_id, guest_email)
  WHERE status IN ('waiting', 'offered');

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  member_email TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  template TEXT NOT NULL,
  payload TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'skipped_opt_out', 'failed')),
  scheduled_for TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_studio ON notifications (studio_id, created_at);

CREATE TABLE IF NOT EXISTS policy_outcomes (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  booking_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('early_cancel', 'late_cancel', 'no_show')),
  mode TEXT NOT NULL,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  credit_delta INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS policy_booking ON policy_outcomes (booking_id);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_key ON rate_limits (key, at);

CREATE TABLE IF NOT EXISTS import_runs (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  dry_run INTEGER NOT NULL,
  good_rows INTEGER NOT NULL,
  bad_rows INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
