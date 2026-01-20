// ITP Virtue types
export type ITPVirtue = 'humble' | 'hungry' | 'people_smart';

// ITP Behavior definition
export interface ITPBehavior {
  virtue: ITPVirtue;
  behaviorKey: string;
  behaviorName: string;
  descriptionNotLiving: string;
  descriptionLiving: string;
  descriptionRoleModeling: string;
}

// ITP Response (individual behavior rating)
export interface ITPResponse {
  id?: string;
  assessment_id: string;
  behavior_key: string;
  rating: number;
  created_at?: string;
  updated_at?: string;
}

// ITP Assessment
export interface ITPAssessment {
  id: string;
  employee_id: string;
  status: 'draft' | 'submitted' | 'archived';
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  responses?: ITPResponse[];
}

// User profile from Supabase
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  app_role: 'admin' | 'leader' | 'slt' | 'user';
  manager_id: string | null;
  manager_email: string | null;
}

// API request/response types
export interface SaveDraftRequest {
  responses: Array<{
    behaviorKey: string;
    rating: number;
  }>;
}

export interface CreateAssessmentRequest {
  employee_id: string;
}

// Save status for UI
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
