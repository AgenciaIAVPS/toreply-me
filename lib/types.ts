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
  tenant_credits: number
  tenant_user_role: 'admin' | 'normal'
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

export interface CreditBalance {
  tenant_credits: number
  total_deposited: number
  total_deducted: number
}
