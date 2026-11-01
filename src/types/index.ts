export type Role = 'super_admin' | 'sales_executive';

export interface User {
  id: number;
  employee_id: string;
  name: string;
  mobile: string;
  email: string | null;
  role: Role;
  branch: string;
  designation: string | null;
  status: 'active' | 'inactive';
  is_temp_password: boolean;
  temp_password?: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerStatus = 'new' | 'contacted' | 'follow-up' | 'interested' | 'purchased' | 'closed';

export type FollowupState = 'upcoming' | 'due_today' | 'overdue' | 'done' | 'rescheduled' | 'cancelled';

export interface Followup {
  id: number;
  customer_id: number;
  scheduled_for: string;
  status: 'pending' | 'done' | 'rescheduled' | 'cancelled';
  state: FollowupState;
  days_overdue: number;
  days_late: number;
  remarks: string | null;
  outcome: string | null;
  resolved_at: string | null;
  resolver?: User;
  customer?: {
    id: number;
    name: string;
    mobile: string;
    interested_product: string | null;
    status: string;
    executive_id: number;
    executive: { id: number; name: string; branch: string } | null;
  };
}

export interface Customer {
  id: number;
  executive_id: number;
  name: string;
  mobile: string;
  email: string | null;
  city: string | null;
  company: string | null;
  interested_product: string | null;
  device_brand: string | null;
  device_model: string | null;
  customer_query: string | null;
  status: CustomerStatus;
  followup_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  executive?: User;
  timelines?: CustomerTimeline[];
  followups?: Followup[];
}

export interface CustomerTimeline {
  id: number;
  customer_id: number;
  action: string;
  remarks: string | null;
  created_by: number;
  created_at: string;
  creator?: User;
}

export interface DashboardStats {
  total_customers: number;
  total_executives?: number; // Only for Admin
  added_today: number;
  added_this_month: number;
  pending_followups?: number; // Only for Executive
  recent_customers: Customer[];
  upcoming_followups?: Customer[]; // Only for Executive
}
