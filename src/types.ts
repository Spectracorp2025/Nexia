export type NexiaEmotion = "alegría" | "tristeza" | "miedo" | "enojo" | "disgusto" | "sorpresa";

export interface UserSettings {
  voiceVolume: number; // 0 to 1
  voiceSpeed: number;  // 0.5 to 2
  voiceEnabled: boolean;
  visualTheme: "neon-blue" | "neon-violet" | "cyberpunk" | "amoled";
  animationsEnabled: boolean;
}

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  rank: "gratuito" | "premium" | "plus";
  registeredAt: string;
  actionsToday: number;
  lastActionReset: string;
  settings: UserSettings;
  isNewUser?: boolean;
}

export interface Message {
  id: string;
  role: "user" | "nexia";
  content: string;
  timestamp: string;
  emotion?: NexiaEmotion;
  actionExecuted?: any;
  isNew?: boolean;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  text: string;
  time: string; // ISO string or simple YYYY-MM-DD HH:MM
  completed: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  color: string; // Tailwind class colors or HEX values
  type: string;
  createdAt: string;
}
