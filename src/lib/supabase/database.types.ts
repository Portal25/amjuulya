export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'cancelled';
export type TaskCategory =
  | 'хог_асгах'
  | 'хүргэлт'
  | 'худалдаа'
  | 'нохой_гаргах'
  | 'цэвэрлэгээ'
  | 'засвар'
  | 'бусад';
export type TransactionType =
  | 'deposit'
  | 'escrow'
  | 'release'
  | 'refund'
  | 'withdrawal';
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled';
export type DisputeReason =
  | 'not_completed'
  | 'poor_quality'
  | 'no_show'
  | 'fraud'
  | 'other';
export type DisputeStatus = 'open' | 'investigating' | 'resolved';
export type DisputeResolution = 'refund_user' | 'pay_worker' | 'split';
export type NotificationType =
  | 'task_accepted'
  | 'task_completed'
  | 'payment_released'
  | 'new_message'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'task_expired';

export interface User {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  verified: boolean;
  rating: number;
  rating_count: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  price: number;
  status: TaskStatus;
  is_urgent: boolean;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  user_id: string;
  worker_id: string | null;
  proof_images: string[];
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  users?: User;
  workers?: User;
}

export interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  text: string | null;
  image_url: string | null;
  created_at: string;
  sender?: User;
}

export interface Transaction {
  id: string;
  user_id: string;
  task_id: string | null;
  amount: number;
  status: TransactionStatus;
  type: TransactionType;
  description: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  task_id: string;
  reporter_id: string;
  reason: DisputeReason;
  description: string;
  proof_images: string[];
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Rating {
  id: string;
  task_id: string;
  rater_id: string;
  rated_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User> & { id: string };
        Update: Partial<User>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Task>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Message>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'>;
        Update: Partial<Transaction>;
      };
      disputes: {
        Row: Dispute;
        Insert: Omit<Dispute, 'id' | 'created_at'>;
        Update: Partial<Dispute>;
      };
      ratings: {
        Row: Rating;
        Insert: Omit<Rating, 'id' | 'created_at'>;
        Update: Partial<Rating>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Notification>;
      };
    };
  };
};
