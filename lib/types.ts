export interface User {
  user_id: number
  user_email: string
  user_name: string
  user_avatar_url: string | null
  user_email_verified: boolean
  user_is_master_admin: boolean
  user_status: string
}

export interface TenantRelationship {
  rel_id: string
  rel_parent_tenant_id: number
  rel_parent_tenant_name: string
  rel_parent_tenant_logo_url: string | null
  rel_name: string | null              // nome que o pai deu ao filho
  rel_description: string | null       // descrição que o pai deu ao filho
  rel_external_id: string | null
  rel_is_blocked: boolean
  rel_credits: number
  rel_ai_cost_multiplier: number | null
  rel_ai_fixed_fee: number | null
  rel_subscription_fee: number | null
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
  tenant_user_role: 'admin' | 'normal' | 'agents_admin'
  tenant_logo_url: string | null
  tenant_ai_cost_multiplier: number | null
  tenant_ai_fixed_fee: number | null
  tenant_subscription_fee: number | null
  tenant_sub_paid_current_month: boolean
  tenant_is_subscription_client: boolean
  tenant_parents: TenantRelationship[]  // relações onde este é filho
  tenant_is_parent: boolean             // true se for pai de algum tenant
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
  tenant_user_role: 'admin' | 'normal' | 'agents_admin'
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

export interface RelChildSummary {
  rel_id: string
  rel_name: string | null
  rel_description: string | null
  rel_external_id: string | null
  rel_is_blocked: boolean
  rel_credits: number
  rel_ai_cost_multiplier: number | null
  rel_ai_fixed_fee: number | null
  rel_subscription_fee: number | null
  child_tenant_id: number
  child_tenant_name: string
  child_tenant_logo_url: string | null
  credits_status: 'positive' | 'negative'
  subscription_status: 'paid' | 'overdue' | 'none'
}

export interface SystemSetting {
  setting_key: string
  setting_value: string
  setting_updated_at: string
}

export interface Agent {
  agents_id: number
  agents_name: string
  agents_description: string | null
  agents_is_global: boolean
  agents_is_close_agent: boolean
  agents_response_type: 'llm' | 'math'
  agents_min_chars: number | null
  agents_max_chars: number | null
  agents_data_type_description: string | null
  agents_data_to_report: string | null
  agents_extra_rules: string | null
  agents_response_set_data: string | null
  agents_response_api_payload_template: Record<string, unknown> | null
  agents_response_format_data: string | null
}

export interface AgentStep {
  steps_id: number
  steps_name: string
  steps_api_method: string
  steps_api_endpoint: string
  steps_api_headers: Record<string, unknown> | null
  steps_api_payload_template: Record<string, unknown> | null
  steps_pre_sql: string | null
  steps_pre_script: string | null
  steps_post_script: string | null
  steps_post_sql: string | null
  agent_steps_order: number
}

export interface AgentResponseVariable {
  arv_id: number
  arv_agent_id: number
  arv_variable_name: string
  arv_type: 'string' | 'number' | 'usd_to_brl' | 'json_flatten'
  arv_label: string
  arv_order: number
  arv_sanitize: boolean
}

export interface Conversation {
  conversation_id: number
  conversation_status: 'active' | 'closed' | 'archived'
  conversation_channel: 'whatsapp' | 'widget'
  conversation_last_message_at: string | null
  conversation_external_id: string | null
  contact_id: number | null
  contact_name: string
  contact_phone: string | null
  instance_name: string | null
  last_message: string | null
  last_message_sender: 'ai' | 'contact' | null
  unread_count: number
}

export interface Message {
  messages_id: number
  messages_sender: 'ai' | 'contact'
  messages_content: string
  message_status: string
  messages_date_creation: string
}

export interface Contact {
  contact_id: number
  contact_name: string
  nome_empresa: string | null
  telefone: string | null
  localizacao: string | null
  total_conversations: number
}

export interface Instance {
  instance_id: number
  instance_name: string
  instance_phone_number: string | null
  instance_status: 'active' | 'inactive' | 'blocked'
  instance_channel: 'whatsapp' | 'widget'
  instance_agent_selection_mode: 'fixed' | 'dynamic'
  instance_current_agent_id: number | null
  instance_conversation_timeout_minutes: number
  instance_only_auth: boolean
  instance_no_auth_message: string | null
  instance_date_creation: string
  agent_name: string | null
  // enriched from Evolution API
  evolution_state: string | null
  evolution_connected: boolean
}

export interface MasterUser {
  user_id: number
  user_name: string
  user_email: string
  user_is_master_admin: boolean
  user_avatar_url: string | null
}
