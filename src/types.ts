export enum Role {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  avatarUrl?: string;
  class?: string;
  phone?: string;
  address?: string;
  joinDate?: string;
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: string;
  assignedTo: string; // User ID
  status: AssignmentStatus;
  questionPapers: Attachment[]; // Array of question papers (multiple upload)
  submittedFiles: Attachment[]; // Array of uploaded files (answer scripts)
  submittedAt?: string;
  score?: number;
  maxScore: number;
  remarks?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}