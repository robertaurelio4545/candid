import { useState, useEffect } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type FollowButtonProps = {
  userId: string;
  size?: 'sm' | 'md';
  onFollowChange?: () => void;
};

export default function FollowButton({ userId, size = 'sm', onFollowChange }: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFollowStatus();
  }, [userId, user?.id]);

  const checkFollowStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle();

    setIsFollowing(!!data);
    setLoading(false);
  };

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      alert('Please sign in to follow users');
      return;
    }

    if (user.id === userId) {
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });

        if (error) throw error;
        setIsFollowing(true);
      }

      if (onFollowChange) {
        onFollowChange();
      }

      await checkFollowStatus();
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('Failed to update follow status. Please try again.');
      await checkFollowStatus();
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.id === userId) {
    return null;
  }

  const buttonSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const paddingSize = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`${paddingSize} ${textSize} rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-1 ${
        isFollowing
          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          : 'bg-slate-900 text-white hover:bg-slate-800'
      }`}
    >
      {isFollowing ? (
        <>
          <UserCheck className={buttonSize} />
          Following
        </>
      ) : (
        <>
          <UserPlus className={buttonSize} />
          Follow
        </>
      )}
    </button>
  );
}
