export interface User {
  user_id: number
  user_email: string
  user_name: string
  user_avatar_url: string | null
  user_email_verified: boolean
  user_is_master_admin: boolean
  user_status: string
}

export interface Tenant {
  tenant_id: number
  tenant_name: string
  tenant_description: string | null
  tenant_slug: string
  tenant_is_master: boolean
  tenant_is_archived: boolean
  tenant_is_blocked: boolean
  tenant_credits: number
  tenant_user_role: 'admin' | 'normal'
  tenant_logo_url: string | null
  tenant_ai_cost_multiplier: number | null
  tenant_ai_fixed_fee: number | null
  tenant_subscription_fee: number | null
  tenant_sub_paid_current_month: boolean
}

export interface AuthResponse {
  token: string
  user: User
  tenants: Tenant[]
}

export interface InviteToken {
  invite_id: string
  invite_token: string
  invite_tenant_id: number
  invite_url: string
  invite_expires_at: string
}

export interface TenantUser {
  user_id: number
  user_name: string
  user_email: string
  user_avatar_url: string | null
  user_email_verified: boolean
  tenant_user_role: 'admin' | 'normal'
}

export interface LedgerEntry {
  id: string
  type: 'deposit' | 'deduction'
  amount: number
  description: string
  reference_id: string | null
  date: string
}

export interface SubscriptionEntry {
  sub_id: string
  reference_month: string
  amount: number
  status: 'pending' | 'paid'
  origin: 'online' | 'manual'
  date_creation: string
  date_paid: string | null
}

export interface AiCostByDay {
  date: string
  total_deduction: number
  count: number
}

export interface CreditBalance {
  balance: number
  tenant_credits: number
  total_deposited: number
  total_deducted: number
  ledger: LedgerEntry[]
  subscriptions: SubscriptionEntry[]
  ai_costs: AiCostByDay[]
}

export interface SystemSetting {
  setting_key: string
  setting_value: string
  setting_updated_at: string
}

export interface MasterUser {
  user_id: number
  user_name: string
  user_email: string
  user_is_master_admin: boolean
  user_avatar_url: string | null
}
