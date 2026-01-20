/**
 * ITP (Ideal Team Player) Self-Assessment Types
 */

export type ITPVirtue = 'humble' | 'hungry' | 'people_smart';
export type ITPAssessmentStatus = 'draft' | 'submitted' | 'archived';

export interface ITPBehavior {
  virtue: ITPVirtue;
  behaviorKey: string;
  behaviorName: string;
  descriptionNotLiving: string;
  descriptionLiving: string;
  descriptionRoleModeling: string;
}

export interface ITPResponse {
  id?: string;
  assessment_id?: string;
  behaviorKey: string;
  rating: number;
  created_at?: string;
  updated_at?: string;
}

export interface ITPAssessment {
  id: string;
  employee_id: string;
  status: ITPAssessmentStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  responses?: ITPResponse[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  app_role?: 'admin' | 'leader' | 'slt' | 'user';
  manager_id?: string | null;
  manager_email?: string | null;
}

export interface SaveDraftRequest {
  responses: Array<{
    behaviorKey: string;
    rating: number;
  }>;
}
