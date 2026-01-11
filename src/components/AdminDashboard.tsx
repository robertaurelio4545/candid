import { useState, useEffect } from 'react';
import { supabase, Post, Profile, AdminAction } from '../lib/supabase';
import { X, Trash2, Shield, Users, Image as ImageIcon, Activity, Lock, Unlock, Trophy, Search, Crown, MessageSquare, Send } from 'lucide-react';
import PostCard from './PostCard';

type AdminDashboardProps = {
  onClose: () => void;
};

type AdminMessage = {
  id: string;
  user_id: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  type: 'admin';
};

type UserToUserMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  read: boolean;
  created_at: string;
  sender_profile: {
    username: string;
    avatar_url: string | null;
  };
  recipient_profile: {
    username: string;
    avatar_url: string | null;
  };
  type: 'user';
};

type CombinedMessage = AdminMessage | UserToUserMessage;

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'users' | 'logs' | 'messages'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<AdminAction[]>([]);
  const [messages, setMessages] = useState<CombinedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, totalAdmins: 0, totalProMembers: 0 });
  const [showProMembersOnly, setShowProMembersOnly] = useState(false);
  const [pointsInput, setPointsInput] = useState<{ [key: string]: string }>({});
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingUserPosts, setLoadingUserPosts] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'posts') {
        await fetchPosts();
      } else if (activeTab === 'users') {
        await fetchUsers();
      } else if (activeTab === 'logs') {
        await fetchLogs();
      } else if (activeTab === 'messages') {
        await fetchMessages();
      }
      await fetchStats();
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setPosts(data || []);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('username', 'like', 'fake_user_%')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setUsers(data || []);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setLogs(data || []);
  };

  const fetchMessages = async () => {
    const [adminMessagesResult, userMessagesResult] = await Promise.all([
      supabase
        .from('admin_messages')
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_messages')
        .select(`
          *,
          sender_profile:profiles!user_messages_sender_id_fkey(username, avatar_url),
          recipient_profile:profiles!user_messages_recipient_id_fkey(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
    ]);

    if (adminMessagesResult.error) throw adminMessagesResult.error;
    if (userMessagesResult.error) throw userMessagesResult.error;

    const adminMessages: AdminMessage[] = (adminMessagesResult.data || []).map(msg => ({
      ...msg,
      type: 'admin' as const
    }));

    const userMessages: UserToUserMessage[] = (userMessagesResult.data || []).map(msg => ({
      ...msg,
      sender_profile: Array.isArray(msg.sender_profile) ? msg.sender_profile[0] : msg.sender_profile,
      recipient_profile: Array.isArray(msg.recipient_profile) ? msg.recipient_profile[0] : msg.recipient_profile,
      type: 'user' as const
    }));

    const combined = [...adminMessages, ...userMessages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setMessages(combined);
  };

  const fetchStats = async () => {
    const [usersRes, postsRes, adminsRes, proMembersRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).not('username', 'like', 'fake_user_%'),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_admin', true).not('username', 'like', 'fake_user_%'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_pro', true).not('username', 'like', 'fake_user_%'),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      totalPosts: postsRes.count || 0,
      totalAdmins: adminsRes.count || 0,
      totalProMembers: proMembersRes.count || 0,
    });
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: 'delete_post',
        p_target_id: postId,
      });

      fetchPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'remove admin' : 'grant admin';
    if (!confirm(`Are you sure you want to ${action} privileges for this user?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: currentStatus ? 'remove_admin' : 'promote_admin',
        p_target_id: userId,
      });

      fetchUsers();
    } catch (err) {
      console.error('Error updating admin status:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their posts, likes, and comments.')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: 'delete_user',
        p_target_id: userId,
      });

      fetchUsers();
      await fetchStats();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const handleToggleLock = async (postId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'unlock' : 'lock';
    if (!confirm(`Are you sure you want to ${action} this post?`)) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_locked: !currentStatus })
        .eq('id', postId);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: currentStatus ? 'unlock_post' : 'lock_post',
        p_target_id: postId,
      });

      fetchPosts();
    } catch (err) {
      console.error('Error toggling lock status:', err);
    }
  };

  const handleToggleVisibility = async (postId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'Make Pro-Only' : 'Make Visible to All';
    if (!confirm(`Are you sure you want to: ${action}?`)) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({ visible_to_all: !currentStatus })
        .eq('id', postId);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: currentStatus ? 'make_post_pro_only' : 'make_post_public',
        p_target_id: postId,
      });

      fetchPosts();
    } catch (err) {
      console.error('Error toggling visibility:', err);
    }
  };

  const handleAdjustPoints = async (userId: string, username: string) => {
    const pointsValue = pointsInput[userId];
    if (!pointsValue || pointsValue.trim() === '') {
      alert('Please enter a points value');
      return;
    }

    const points = parseInt(pointsValue);
    if (isNaN(points)) {
      alert('Please enter a valid number');
      return;
    }

    const action = points >= 0 ? 'add' : 'remove';
    const absPoints = Math.abs(points);

    if (!confirm(`Are you sure you want to ${action} ${absPoints} points ${points >= 0 ? 'to' : 'from'} ${username}?`)) return;

    try {
      if (points >= 0) {
        const { error } = await supabase.rpc('increment_user_points', {
          user_id: userId,
          points_to_add: points
        });
        if (error) throw error;
      } else {
        const { data: success, error } = await supabase.rpc('deduct_user_points', {
          user_id: userId,
          points_to_deduct: absPoints
        });
        if (error) throw error;
        if (!success) {
          alert('User does not have enough points to deduct');
          return;
        }
      }

      await supabase.rpc('log_admin_action', {
        p_action_type: 'adjust_points',
        p_target_id: userId,
      });

      setPointsInput({ ...pointsInput, [userId]: '' });
      fetchUsers();
    } catch (err) {
      console.error('Error adjusting points:', err);
      alert('Failed to adjust points');
    }
  };

  const handleTogglePro = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'revoke' : 'grant';
    if (!confirm(`Are you sure you want to ${action} Pro access for this user?`)) return;

    try {
      const expiresAt = currentStatus ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('profiles')
        .update({
          is_pro: !currentStatus,
          subscription_expires_at: expiresAt
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: currentStatus ? 'revoke_pro' : 'grant_pro',
        p_target_id: userId,
      });

      fetchUsers();
    } catch (err) {
      console.error('Error toggling Pro status:', err);
    }
  };

  const handleSendReply = async (messageId: string) => {
    const reply = replyText[messageId];
    if (!reply || !reply.trim()) {
      alert('Please enter a reply');
      return;
    }

    setSendingReply(messageId);
    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({
          admin_reply: reply.trim(),
          status: 'replied',
          replied_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      setReplyText({ ...replyText, [messageId]: '' });
      await fetchMessages();
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Failed to send reply');
    } finally {
      setSendingReply(null);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({ status: 'read' })
        .eq('id', messageId);

      if (error) throw error;
      await fetchMessages();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewUserPosts = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingUserPosts(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserPosts(data || []);
    } catch (err) {
      console.error('Error loading user posts:', err);
    } finally {
      setLoadingUserPosts(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-slate-900" />
            <h2 className="text-xl font-semibold text-slate-900">Admin Dashboard</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-slate-600" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
                  <p className="text-sm text-slate-600">Total Users</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-8 h-8 text-slate-600" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalPosts}</p>
                  <p className="text-sm text-slate-600">Total Posts</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-slate-600" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalAdmins}</p>
                  <p className="text-sm text-slate-600">Admins</p>
                </div>
              </div>
            </div>
            <div
              className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 cursor-pointer hover:shadow-md transition"
              onClick={() => {
                setActiveTab('users');
                setShowProMembersOnly(true);
              }}
            >
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalProMembers}</p>
                  <p className="text-sm text-slate-600">Pro Members</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'posts'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => {
                setActiveTab('users');
                setShowProMembersOnly(false);
              }}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'users'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 font-medium transition relative ${
                activeTab === 'messages'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Messages
              {messages.filter(m => m.status === 'unread').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {messages.filter(m => m.status === 'unread').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'logs'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activity Logs
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Loading...</p>
            </div>
          ) : (
            <div>
              {activeTab === 'posts' && (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="relative">
                      <PostCard post={post} onDelete={fetchPosts} />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button
                          onClick={() => handleToggleLock(post.id, post.is_locked)}
                          className={`p-2 rounded-lg transition shadow-lg ${
                            post.is_locked
                              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                              : 'bg-slate-700 text-white hover:bg-slate-800'
                          }`}
                          title={post.is_locked ? 'Unlock Post' : 'Lock Post'}
                        >
                          {post.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        {post.is_locked && (
                          <button
                            onClick={() => handleToggleVisibility(post.id, post.visible_to_all || false)}
                            className={`p-2 rounded-lg transition shadow-lg ${
                              post.visible_to_all
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                            title={post.visible_to_all ? 'Visible to All' : 'Pro Only'}
                          >
                            {post.visible_to_all ? <Users className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by username or name..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setShowProMembersOnly(!showProMembersOnly)}
                      className={`px-4 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
                        showProMembersOnly
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Crown className="w-5 h-5" />
                      {showProMembersOnly ? 'Show All' : 'Pro Only'}
                    </button>
                  </div>
                  <div className="space-y-2">
                  {users
                    .filter((user) => {
                      if (showProMembersOnly && !user.is_pro) return false;
                      if (!userSearchQuery) return true;
                      const query = userSearchQuery.toLowerCase();
                      return (
                        user.username?.toLowerCase().includes(query) ||
                        user.full_name?.toLowerCase().includes(query)
                      );
                    })
                    .map((user) => (
                    <div
                      key={user.id}
                      className="bg-slate-50 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          {user.is_admin && (
                            <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                              ADMIN
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleViewUserPosts(user.id)}
                              className="font-semibold text-slate-900 hover:text-blue-600 hover:underline transition"
                            >
                              {user.username}
                            </button>
                            {user.is_pro && (
                              <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{user.full_name || 'No name'}</p>
                          <div className="flex gap-2 mt-1">
                            {user.is_admin && (
                              <span className="inline-flex items-center gap-1 text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                            {user.is_pro && (
                              <span className="inline-flex items-center text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">
                                PRO
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-medium">
                              <Trophy className="w-3 h-3" />
                              {user.points || 0} pts
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="+/- points"
                            value={pointsInput[user.id] || ''}
                            onChange={(e) => setPointsInput({ ...pointsInput, [user.id]: e.target.value })}
                            className="w-28 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none"
                          />
                          <button
                            onClick={() => handleAdjustPoints(user.id, user.username)}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                          >
                            Adjust
                          </button>
                        </div>
                        <button
                          onClick={() => handleTogglePro(user.id, user.is_pro)}
                          className={`px-4 py-2 rounded-lg font-medium transition ${
                            user.is_pro
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-amber-500 text-white hover:bg-amber-600'
                          }`}
                        >
                          {user.is_pro ? 'Revoke Pro' : 'Grant Pro'}
                        </button>
                        <button
                          onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          className={`px-4 py-2 rounded-lg font-medium transition ${
                            user.is_admin
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    if (msg.type === 'user') {
                      return (
                        <div
                          key={`user-${msg.id}`}
                          className={`rounded-lg p-4 border ${
                            msg.read ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 flex-shrink-0">
                              {msg.sender_profile?.avatar_url ? (
                                <img
                                  src={msg.sender_profile.avatar_url}
                                  alt={msg.sender_profile.username}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                                  {msg.sender_profile?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-slate-900">{msg.sender_profile?.username}</p>
                                <span className="text-xs text-slate-600">→</span>
                                <p className="font-semibold text-slate-900">{msg.recipient_profile?.username}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  msg.read ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {msg.read ? 'Read' : 'Unread'}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                                  User Message
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">
                                {formatDate(msg.created_at)}
                              </p>
                              <div className="bg-white rounded-lg p-3">
                                <p className="text-slate-700">{msg.message}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`admin-${msg.id}`}
                        className={`rounded-lg p-4 border ${
                          msg.status === 'unread'
                            ? 'bg-blue-50 border-blue-200'
                            : msg.status === 'replied'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 flex-shrink-0">
                            {msg.profiles.avatar_url ? (
                              <img
                                src={msg.profiles.avatar_url}
                                alt={msg.profiles.username}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                                {msg.profiles.username?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-slate-900">{msg.profiles.username}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                msg.status === 'unread'
                                  ? 'bg-blue-100 text-blue-700'
                                  : msg.status === 'replied'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {msg.status}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                                Admin Message
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">
                              {formatDate(msg.created_at)}
                            </p>
                            <div className="bg-white rounded-lg p-3 mb-3">
                              <p className="text-slate-700">{msg.message}</p>
                            </div>
                            {msg.admin_reply && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Shield className="w-4 h-4 text-emerald-700" />
                                  <span className="text-sm font-semibold text-emerald-900">Admin Reply:</span>
                                </div>
                                <p className="text-slate-700">{msg.admin_reply}</p>
                                <p className="text-xs text-slate-500 mt-2">
                                  Replied {formatDate(msg.replied_at!)}
                                </p>
                              </div>
                            )}
                            {!msg.admin_reply && (
                              <div className="space-y-2">
                                <textarea
                                  value={replyText[msg.id] || ''}
                                  onChange={(e) => setReplyText({ ...replyText, [msg.id]: e.target.value })}
                                  placeholder="Type your reply..."
                                  rows={3}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none resize-none"
                                />
                                <div className="flex gap-2">
                                  {msg.status === 'unread' && (
                                    <button
                                      onClick={() => handleMarkAsRead(msg.id)}
                                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
                                    >
                                      Mark as Read
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleSendReply(msg.id)}
                                    disabled={sendingReply === msg.id || !replyText[msg.id]?.trim()}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <Send className="w-4 h-4" />
                                    {sendingReply === msg.id ? 'Sending...' : 'Send Reply'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600">No messages yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-slate-900">
                          {log.action_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-center text-slate-600 py-8">No activity logs yet</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">
                Posts by {users.find(u => u.id === selectedUserId)?.username}
              </h3>
              <button
                onClick={() => {
                  setSelectedUserId(null);
                  setUserPosts([]);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {loadingUserPosts ? (
                <div className="text-center py-12">
                  <p className="text-slate-600">Loading posts...</p>
                </div>
              ) : userPosts.length > 0 ? (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <div key={post.id} className="relative">
                      <PostCard post={post} onDelete={() => handleViewUserPosts(selectedUserId)} />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button
                          onClick={() => {
                            handleToggleLock(post.id, post.is_locked);
                            handleViewUserPosts(selectedUserId);
                          }}
                          className={`p-2 rounded-lg transition shadow-lg ${
                            post.is_locked
                              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                              : 'bg-slate-700 text-white hover:bg-slate-800'
                          }`}
                        >
                          {post.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={async () => {
                            await handleDeletePost(post.id);
                            handleViewUserPosts(selectedUserId);
                          }}
                          className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No posts yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
