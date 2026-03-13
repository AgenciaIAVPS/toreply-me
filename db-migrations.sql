-- ============================================================
-- toreply.me — Migrations do Banco de Dados
-- Executar no PostgreSQL: admin.memefyme.com:5434 db: restaurant
-- ============================================================

-- --------------------------------------------------------
-- 1. Alterações em tabelas existentes
-- --------------------------------------------------------

-- users: Google OAuth, admin master flag, avatar
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_google_id VARCHAR UNIQUE,
  ADD COLUMN IF NOT EXISTS user_is_master_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS user_avatar_url TEXT;

-- users: soft delete (arquivamento — preserva dados financeiros vinculados ao user_id)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_archived_at TIMESTAMP NULL DEFAULT NULL;

-- tenants: arquivamento, master flag, créditos, mensagem de encerramento
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS tenant_is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tenant_is_master BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tenant_credits NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tenant_conclusion_message TEXT;

-- tenants_users: role por tenant
ALTER TABLE tenants_users
  ADD COLUMN IF NOT EXISTS tenant_user_role VARCHAR DEFAULT 'normal'
  CHECK (tenant_user_role IN ('admin', 'normal'));

-- --------------------------------------------------------
-- 2. Novas tabelas
-- --------------------------------------------------------

-- Tokens de convite por tenant (one-use, expiram em 7 dias)
CREATE TABLE IF NOT EXISTS tenant_invite_tokens (
  invite_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_token       VARCHAR(128) UNIQUE NOT NULL,
  invite_tenant_id   INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  invite_created_by  INTEGER REFERENCES users(user_id),
  invite_created_at  TIMESTAMP DEFAULT NOW(),
  invite_expires_at  TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
  invite_used        BOOLEAN DEFAULT FALSE,
  invite_used_by     INTEGER REFERENCES users(user_id),
  invite_used_at     TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON tenant_invite_tokens(invite_token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_tenant ON tenant_invite_tokens(invite_tenant_id);

-- Transações de pagamento MercadoPago
CREATE TABLE IF NOT EXISTS payment_transactions (
  payment_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_tenant_id       INTEGER REFERENCES tenants(tenant_id),
  payment_user_id         INTEGER REFERENCES users(user_id),
  payment_mp_preference_id VARCHAR,
  payment_mp_payment_id   VARCHAR UNIQUE,
  payment_amount          NUMERIC(10,2) NOT NULL,
  payment_credits_added   NUMERIC(10,2),
  payment_status          VARCHAR DEFAULT 'pending'
    CHECK (payment_status IN ('pending','approved','rejected','cancelled')),
  payment_date_creation   TIMESTAMP DEFAULT NOW(),
  payment_date_confirmed  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payment_transactions(payment_tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(payment_status);

-- Ledger de créditos (histórico de entradas e saídas)
CREATE TABLE IF NOT EXISTS tenant_credit_ledger (
  ledger_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_tenant_id    INTEGER REFERENCES tenants(tenant_id),
  ledger_type         VARCHAR NOT NULL CHECK (ledger_type IN ('deposit','deduction')),
  ledger_amount       NUMERIC(10,2) NOT NULL,
  ledger_description  TEXT,
  ledger_reference_id VARCHAR,
  ledger_date_creation TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant ON tenant_credit_ledger(ledger_tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON tenant_credit_ledger(ledger_date_creation);

-- --------------------------------------------------------
-- 3. Trigger: dedução automática de créditos ao registrar custo IA
-- Fórmula: custo_ia_usd * 7 + 0.05 reais
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION deduct_credits_on_ai_cost()
RETURNS TRIGGER AS $$
DECLARE
  deduction NUMERIC;
BEGIN
  deduction := (NEW.ai_costs_estimated_cost * 7) + 0.05;

  UPDATE tenants
  SET tenant_credits = tenant_credits - deduction
  WHERE tenant_id = NEW.ai_costs_tenant_id;

  INSERT INTO tenant_credit_ledger (
    ledger_tenant_id, ledger_type, ledger_amount,
    ledger_description, ledger_reference_id
  ) VALUES (
    NEW.ai_costs_tenant_id,
    'deduction',
    -deduction,
    'AI cost: ' || NEW.ai_costs_resource,
    NEW.ai_costs_id::VARCHAR
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_credits ON ai_costs;
CREATE TRIGGER trigger_deduct_credits
AFTER INSERT ON ai_costs
FOR EACH ROW EXECUTE FUNCTION deduct_credits_on_ai_cost();

-- --------------------------------------------------------
-- 4. Dados iniciais
-- --------------------------------------------------------

-- Tenant master (executar uma única vez)
INSERT INTO tenants (tenant_name, tenant_description, tenant_slug, tenant_is_master)
VALUES ('toreply.me Master', 'Tenant administrativo interno', 'master', TRUE)
ON CONFLICT (tenant_slug) DO NOTHING;

-- APÓS criar seu usuário via frontend, execute:
-- UPDATE users SET user_is_master_admin = TRUE WHERE user_email = 'SEU_EMAIL@...';
-- UPDATE tenants_users SET tenant_user_role = 'admin'
--   WHERE tenant_user_user_id = (SELECT user_id FROM users WHERE user_is_master_admin = TRUE)
--   AND tenant_user_tenant_id = (SELECT tenant_id FROM tenants WHERE tenant_is_master = TRUE);
