import { useState, useEffect } from 'react';
import { supabase, Profile as ProfileType, Post } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Edit2, Grid, Camera, Trophy, Crown, AlertCircle } from 'lucide-react';
import PostCard from './PostCard';
import FollowButton from './FollowButton';

type ProfileProps = {
  onClose: () => void;
};

export default function Profile({ onClose }: ProfileProps) {
  const { user, refreshProfile: refreshAuthProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'following' | 'followers'>('posts');
  const [followingUsers, setFollowingUsers] = useState<ProfileType[]>([]);
  const [followerUsers, setFollowerUsers] = useState<ProfileType[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserPosts();
      fetchFollowCounts();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'following') {
      fetchFollowing();
    } else if (activeTab === 'followers') {
      fetchFollowers();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile(data);
        setUsername(data.username);
        setFullName(data.full_name);
        setBio(data.bio);
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url,
            is_pro,
            is_admin
          ),
          media:post_media(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  const fetchFollowCounts = async () => {
    if (!user) return;

    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);

    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    setFollowingCount(followingCount || 0);
    setFollowersCount(followersCount || 0);
  };

  const fetchFollowing = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('follows')
      .select(`
        following:profiles!follows_following_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_pro,
          is_admin
        )
      `)
      .eq('follower_id', user.id);

    if (data) {
      const users = data.map((item: any) => item.following).filter(Boolean);
      setFollowingUsers(users);
    }
  };

  const fetchFollowers = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('follows')
      .select(`
        follower:profiles!follows_follower_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_pro,
          is_admin
        )
      `)
      .eq('following_id', user.id);

    if (data) {
      const users = data.map((item: any) => item.follower).filter(Boolean);
      setFollowerUsers(users);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          full_name: fullName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
      setEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setAvatarUrl(dataUrl);

        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: dataUrl })
          .eq('id', user.id);

        if (error) throw error;
        await fetchProfile();
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (!user || !profile) return;

    const currentPoints = profile.points || 0;
    if (currentPoints < 200) {
      alert(`You need 200 points to redeem 1 month of Pro. You currently have ${currentPoints} points.`);
      return;
    }

    const confirm = window.confirm('Redeem 200 points for 1 month of Pro membership?');
    if (!confirm) return;

    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc('redeem_points_for_pro');

      if (error) throw error;

      if (data && !data.success) {
        alert(data.error || 'Failed to redeem points');
        return;
      }

      await fetchProfile();
      await refreshAuthProfile();
      alert('Successfully redeemed 200 points for 1 month of Pro membership!');
    } catch (err: any) {
      console.error('Error redeeming points:', err);
      alert(err.message || 'Failed to redeem points');
    } finally {
      setRedeeming(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;

    setCanceling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      await fetchProfile();
      await refreshAuthProfile();
      setShowCancelConfirm(false);
      alert('Your Pro subscription has been cancelled. You will not be charged again.');

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-6 mb-8">
            <div className="relative group flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-3xl font-bold">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              {editing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition">
                  <Camera className="w-8 h-8 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="text-white text-xs">Uploading...</div>
                </div>
              )}
            </div>

            <div className="flex-1">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setUsername(profile?.username || '');
                        setFullName(profile?.full_name || '');
                        setBio(profile?.bio || '');
                        setAvatarUrl(profile?.avatar_url || '');
                      }}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-slate-900">{profile?.username}</h3>
                    <button
                      onClick={() => setEditing(true)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  {profile?.full_name && (
                    <p className="text-slate-600 mb-2">{profile.full_name}</p>
                  )}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <Trophy className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-900">{profile?.points || 0} points</span>
                    </div>
                    {profile?.is_pro && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-semibold text-yellow-900">Pro Member</span>
                      </div>
                    )}
                    {!profile?.is_pro && (profile?.points || 0) >= 200 && (
                      <button
                        onClick={handleRedeemPoints}
                        disabled={redeeming}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition font-semibold text-sm shadow-md disabled:opacity-50"
                      >
                        <Crown className="w-4 h-4" />
                        {redeeming ? 'Redeeming...' : 'Redeem 200pts for Pro'}
                      </button>
                    )}
                  </div>
                  {profile?.is_pro && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Cancel Subscription
                    </button>
                  )}
                  {profile?.bio && (
                    <p className="text-slate-700">{profile.bio}</p>
                  )}
                  <div className="mt-4 flex items-center gap-6 text-sm">
                    <div>
                      <span className="font-semibold text-slate-900">{posts.length}</span>
                      <span className="text-slate-600 ml-1">posts</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('followers')}
                      className="hover:text-slate-900 transition"
                    >
                      <span className="font-semibold text-slate-900">{followersCount}</span>
                      <span className="text-slate-600 ml-1">followers</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('following')}
                      className="hover:text-slate-900 transition"
                    >
                      <span className="font-semibold text-slate-900">{followingCount}</span>
                      <span className="text-slate-600 ml-1">following</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex gap-2 mb-6 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-4 py-2 font-medium transition ${
                  activeTab === 'posts'
                    ? 'text-slate-900 border-b-2 border-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Grid className="w-5 h-5" />
                  Posts
                </div>
              </button>
              <button
                onClick={() => setActiveTab('followers')}
                className={`px-4 py-2 font-medium transition ${
                  activeTab === 'followers'
                    ? 'text-slate-900 border-b-2 border-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Followers ({followersCount})
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`px-4 py-2 font-medium transition ${
                  activeTab === 'following'
                    ? 'text-slate-900 border-b-2 border-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Following ({followingCount})
              </button>
            </div>

            {activeTab === 'posts' && (
              posts.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} onDelete={fetchUserPosts} />
                  ))}
                </div>
              )
            )}

            {activeTab === 'followers' && (
              <div className="space-y-3">
                {followerUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600">No followers yet</p>
                  </div>
                ) : (
                  followerUsers.map((follower) => (
                    <div key={follower.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {follower.avatar_url ? (
                          <img
                            src={follower.avatar_url}
                            alt={follower.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                            {follower.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{follower.username}</span>
                            {follower.is_pro && <Crown className="w-4 h-4 text-yellow-500" />}
                          </div>
                          {follower.full_name && (
                            <p className="text-sm text-slate-600">{follower.full_name}</p>
                          )}
                        </div>
                      </div>
                      <FollowButton userId={follower.id} size="md" onFollowChange={() => {
                        fetchFollowCounts();
                        fetchFollowers();
                      }} />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'following' && (
              <div className="space-y-3">
                {followingUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600">Not following anyone yet</p>
                  </div>
                ) : (
                  followingUsers.map((following) => (
                    <div key={following.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {following.avatar_url ? (
                          <img
                            src={following.avatar_url}
                            alt={following.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                            {following.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{following.username}</span>
                            {following.is_pro && <Crown className="w-4 h-4 text-yellow-500" />}
                          </div>
                          {following.full_name && (
                            <p className="text-sm text-slate-600">{following.full_name}</p>
                          )}
                        </div>
                      </div>
                      <FollowButton userId={following.id} size="md" onFollowChange={() => {
                        fetchFollowCounts();
                        fetchFollowing();
                      }} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Cancel Subscription</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to cancel your Pro subscription? You will lose access to:
            </p>
            <ul className="text-slate-600 mb-6 space-y-2 ml-4">
              <li className="list-disc">Access to locked premium content</li>
              <li className="list-disc">Pro member badge</li>
              <li className="list-disc">Priority support</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={canceling}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
              >
                {canceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
