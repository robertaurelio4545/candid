import { PlusSquare, User, LogOut, Shield, Crown, Trophy, Inbox as InboxIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type HeaderProps = {
  onCreatePost: () => void;
  onShowProfile: () => void;
  onShowAdmin?: () => void;
  onUpgrade?: () => void;
  onShowInbox?: () => void;
};

export default function Header({ onCreatePost, onShowProfile, onShowAdmin, onUpgrade, onShowInbox }: HeaderProps) {
  const { signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [proCount, setProCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadProCount();
    loadUnreadCount();

    const channel = supabase
      .channel('inbox-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_messages',
        filter: `user_id=eq.${profile?.id}`
      }, () => {
        loadUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const loadProCount = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_pro', true)
      .or('subscription_expires_at.is.null,subscription_expires_at.gt.' + new Date().toISOString());

    setProCount(count || 0);
  };

  const loadUnreadCount = async () => {
    if (!profile) return;

    const { count: adminCount } = await supabase
      .from('admin_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'unread');

    const { count: userCount } = await supabase
      .from('user_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', profile.id)
      .eq('read', false);

    setUnreadCount((adminCount || 0) + (userCount || 0));
  };


  return (
    <header className="sticky top-0 bg-white border-b border-slate-200 z-40">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/Untitled design.png"
            alt="CandidTeenPro Logo"
            className="h-24 w-auto cursor-pointer"
            onClick={() => navigate('/')}
          />
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-bold text-yellow-900">{proCount}</span>
              <span className="text-xs text-yellow-700 font-medium">Pro Members</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!profile?.is_pro && onUpgrade && (
            <button
              onClick={onUpgrade}
              data-upgrade-button
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition font-medium shadow-md"
            >
              <Crown className="w-5 h-5" />
              <span className="hidden sm:inline">Upgrade to Pro</span>
            </button>
          )}
          <div className="relative">
            <button
              onClick={onCreatePost}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
            >
              <PlusSquare className="w-5 h-5" />
              <span className="hidden sm:inline">Create</span>
            </button>
            <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              +5
            </div>
          </div>
          {isAdmin && onShowAdmin && (
            <button
              onClick={onShowAdmin}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Admin Dashboard"
            >
              <Shield className="w-6 h-6" />
            </button>
          )}
          {onShowInbox && (
            <button
              onClick={onShowInbox}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Inbox"
            >
              <InboxIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={onShowProfile}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            <User className="w-6 h-6" />
          </button>
          <button
            onClick={signOut}
            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
