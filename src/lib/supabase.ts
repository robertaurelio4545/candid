import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web',
    },
  },
});

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  is_admin: boolean;
  is_pro: boolean;
  subscription_expires_at: string | null;
  subscription_started_at: string | null;
  points: number;
  created_at: string;
  updated_at: string;
};

export type AdminAction = {
  id: string;
  admin_id: string;
  action_type: string;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
};

export type Like = {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type Download = {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
};

export type PostMedia = {
  id: string;
  post_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  position: number;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  caption: string;
  download_link: string;
  media_url: string;
  media_type: 'image' | 'video';
  is_locked: boolean;
  visible_to_all: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  likes?: Like[];
  comments?: Comment[];
  post_media?: PostMedia[];
  like_count?: number;
  user_has_liked?: boolean;
};

export type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
};
