import { useState, useEffect } from 'react';
import { supabase, Post, Profile, AdminAction } from '../lib/supabase';
import { X, Trash2, Shield, Users, Image as ImageIcon, Activity, Lock, Unlock, Trophy, Search, Crown, MessageSquare, Send, ExternalLink, CheckCircle, XCircle, Link, Mail, Flag, AlertTriangle } from 'lucide-react';
import PostCard from './PostCard';
import AdminMessaging from './AdminMessaging';

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
  const [activeTab, setActiveTab] = useState<'posts' | 'users' | 'logs' | 'messages' | 'sponsors' | 'cancellations' | 'inbox' | 'reports'>('posts');
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
  const [sponsorRequests, setSponsorRequests] = useState<any[]>([]);
  const [activeSponsors, setActiveSponsors] = useState<any[]>([]);
  const [assigningSpot, setAssigningSpot] = useState<string | null>(null);
  const [showMessagingModal, setShowMessagingModal] = useState(false);
  const [editingPostUrl, setEditingPostUrl] = useState<string | null>(null);
  const [postUrlInput, setPostUrlInput] = useState('');
  const [syncingPromoCodes, setSyncingPromoCodes] = useState(false);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');
  const [newPromoMaxUses, setNewPromoMaxUses] = useState('');
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

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
      } else if (activeTab === 'sponsors') {
        await fetchSponsorRequests();
        await fetchActiveSponsors();
        await fetchPromoCodes();
      } else if (activeTab === 'cancellations') {
        await fetchCancellations();
      } else if (activeTab === 'reports') {
        await fetchReports();
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
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .not('username', 'like', 'fake_user_%')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error('No session token available');
        setUsers(profilesData || []);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-emails`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Failed to fetch emails:', responseData);
        setUsers(profilesData || []);
        return;
      }

      const { emails } = responseData;

      if (!emails) {
        console.error('No emails in response:', responseData);
        setUsers(profilesData || []);
        return;
      }

      const usersWithEmail = (profilesData || []).map(profile => ({
        ...profile,
        email: emails[profile.id] || 'No email'
      }));

      setUsers(usersWithEmail);
    } catch (error) {
      console.error('Error fetching user emails:', error);
      setUsers(profilesData || []);
    }
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

  const fetchSponsorRequests = async () => {
    const { data, error } = await supabase
      .from('sponsor_requests')
      .select(`
        id,
        user_id,
        website_name,
        website_link,
        logo_url,
        status,
        created_at,
        reviewed_at,
        reviewed_by
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sponsor requests:', error);
      throw error;
    }

    const enrichedRequests = await Promise.all((data || []).map(async (request) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', request.user_id)
        .maybeSingle();

      return {
        ...request,
        profiles: profile
      };
    }));

    setSponsorRequests(enrichedRequests);
  };

  const fetchActiveSponsors = async () => {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('spot_number', { ascending: true });

    if (error) throw error;
    setActiveSponsors(data || []);
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

  const handleUpdatePostUrl = async (postId: string) => {
    try {
      let formattedUrl = postUrlInput.trim();
      if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }

      const { error } = await supabase
        .from('posts')
        .update({ download_link: formattedUrl })
        .eq('id', postId);

      if (error) throw error;

      setEditingPostUrl(null);
      setPostUrlInput('');
      fetchPosts();
    } catch (err) {
      console.error('Error updating post URL:', err);
      alert('Failed to update URL');
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

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .maybeSingle();

    const hasActiveSubscription = userProfile?.stripe_subscription_id;

    let confirmMessage = '';
    if (currentStatus) {
      confirmMessage = `Are you sure you want to ${action} Pro access for this user?`;
    } else {
      if (hasActiveSubscription) {
        confirmMessage = 'This user has an active Stripe subscription. Granting Pro will extend their access by 1 week. Continue?';
      } else {
        confirmMessage = 'Grant Pro access for 1 week (7 days)?';
      }
    }

    if (!confirm(confirmMessage)) return;

    try {
      const expiresAt = currentStatus ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const startedAt = currentStatus ? null : new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .update({
          is_pro: !currentStatus,
          subscription_expires_at: expiresAt,
          subscription_started_at: startedAt
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

  const handleApproveSponsor = async (requestId: string, spotNumber: number) => {
    const request = sponsorRequests.find(r => r.id === requestId);
    if (!request) return;

    setAssigningSpot(requestId);
    try {
      const existingSponsor = activeSponsors.find(s => s.spot_number === spotNumber);
      if (existingSponsor) {
        await supabase.from('sponsors').delete().eq('id', existingSponsor.id);
      }

      const { error: sponsorError } = await supabase
        .from('sponsors')
        .insert({
          spot_number: spotNumber,
          website_name: request.website_name,
          website_link: request.website_link,
          logo_url: request.logo_url,
          request_id: requestId
        });

      if (sponsorError) throw sponsorError;

      const { error: updateError } = await supabase
        .from('sponsor_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      await fetchSponsorRequests();
      await fetchActiveSponsors();
    } catch (err) {
      console.error('Error approving sponsor:', err);
      alert('Failed to approve sponsor');
    } finally {
      setAssigningSpot(null);
    }
  };

  const handleRejectSponsor = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this sponsor request?')) return;

    try {
      const { error } = await supabase
        .from('sponsor_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
      await fetchSponsorRequests();
    } catch (err) {
      console.error('Error rejecting sponsor:', err);
      alert('Failed to reject sponsor');
    }
  };

  const handleRemoveSponsor = async (sponsorId: string) => {
    if (!confirm('Are you sure you want to remove this sponsor?')) return;

    try {
      const { error } = await supabase
        .from('sponsors')
        .delete()
        .eq('id', sponsorId);

      if (error) throw error;
      await fetchActiveSponsors();
    } catch (err) {
      console.error('Error removing sponsor:', err);
      alert('Failed to remove sponsor');
    }
  };

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
    }
  };

  const fetchCancellations = async () => {
    try {
      const { data, error } = await supabase
        .from('cancellations')
        .select('*')
        .order('cancelled_at', { ascending: false });

      if (error) throw error;
      setCancellations(data || []);
    } catch (err) {
      console.error('Error fetching cancellations:', err);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('post_reports')
        .select(`
          *,
          post:posts(id, caption, media_url, media_type, user_id, profiles:profiles(username, avatar_url)),
          reporter:profiles!post_reports_reporter_id_fkey(username, avatar_url),
          reviewer:profiles!post_reports_reviewed_by_fkey(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: string, postId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('post_reports')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      if (status === 'removed' && postId) {
        const { error: deleteError } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId);

        if (deleteError) throw deleteError;
      }

      await fetchReports();
      alert(`Report ${status} successfully`);
    } catch (err: any) {
      console.error('Error updating report:', err);
      alert(err.message || 'Failed to update report');
    }
  };

  const handleCreatePromoCode = async () => {
    if (!newPromoCode.trim() || !newPromoDiscount) {
      alert('Please enter a promo code and discount percentage');
      return;
    }

    const discount = parseInt(newPromoDiscount);
    if (discount <= 0 || discount > 100) {
      alert('Discount must be between 1 and 100');
      return;
    }

    setCreatingPromo(true);
    try {
      const { error } = await supabase
        .from('promo_codes')
        .insert({
          code: newPromoCode.toLowerCase().trim(),
          discount_percent: discount,
          max_uses: newPromoMaxUses ? parseInt(newPromoMaxUses) : null,
          is_active: true,
        });

      if (error) throw error;

      setNewPromoCode('');
      setNewPromoDiscount('');
      setNewPromoMaxUses('');
      await fetchPromoCodes();
      alert('Promo code created successfully!');
    } catch (err: any) {
      console.error('Error creating promo code:', err);
      alert(err.message || 'Failed to create promo code');
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleTogglePromoCode = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchPromoCodes();
    } catch (err: any) {
      console.error('Error toggling promo code:', err);
      alert(err.message || 'Failed to update promo code');
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPromoCodes();
    } catch (err: any) {
      console.error('Error deleting promo code:', err);
      alert(err.message || 'Failed to delete promo code');
    }
  };

  const handleSyncPromoCodes = async () => {
    setSyncingPromoCodes(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-promo-codes`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync promo codes');
      }

      alert('Promo codes synced to Stripe successfully!');
    } catch (err: any) {
      console.error('Error syncing promo codes:', err);
      alert(err.message || 'Failed to sync promo codes');
    } finally {
      setSyncingPromoCodes(false);
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
            <button
              onClick={() => setActiveTab('sponsors')}
              className={`px-4 py-2 font-medium transition relative ${
                activeTab === 'sponsors'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sponsors
              {sponsorRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {sponsorRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('cancellations')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'cancellations'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancellations
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'inbox'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email Inbox
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 font-medium transition relative ${
                activeTab === 'reports'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Reports
                {reports.filter(r => r.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {reports.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </div>
            </button>
          </div>

          <div className="mb-6">
            <button
              onClick={() => setShowMessagingModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Send Message to Users
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
                          onClick={() => {
                            setEditingPostUrl(post.id);
                            setPostUrlInput(post.download_link || '');
                          }}
                          className={`p-2 rounded-lg transition shadow-lg ${
                            post.download_link
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-slate-500 text-white hover:bg-slate-600'
                          }`}
                          title={post.download_link ? 'Edit URL Link' : 'Add URL Link'}
                        >
                          <Link className="w-4 h-4" />
                        </button>
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
                          <p className="text-xs text-slate-500">{(user as any).email || 'No email'}</p>
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
                                {user.subscription_started_at && (
                                  <span className="ml-1">
                                    ({Math.floor((new Date().getTime() - new Date(user.subscription_started_at).getTime()) / (1000 * 60 * 60 * 24))}d)
                                  </span>
                                )}
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

              {activeTab === 'sponsors' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Promo Codes</h3>
                      <button
                        onClick={handleSyncPromoCodes}
                        disabled={syncingPromoCodes}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {syncingPromoCodes ? 'Syncing...' : 'Sync to Stripe'}
                      </button>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-slate-900 mb-3">Create New Promo Code</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <input
                          type="text"
                          placeholder="Code (e.g., SAVE50)"
                          value={newPromoCode}
                          onChange={(e) => setNewPromoCode(e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Discount %"
                          value={newPromoDiscount}
                          onChange={(e) => setNewPromoDiscount(e.target.value)}
                          min="1"
                          max="100"
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Max uses (optional)"
                          value={newPromoMaxUses}
                          onChange={(e) => setNewPromoMaxUses(e.target.value)}
                          min="1"
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none"
                        />
                        <button
                          onClick={handleCreatePromoCode}
                          disabled={creatingPromo}
                          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium disabled:opacity-50"
                        >
                          {creatingPromo ? 'Creating...' : 'Create'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {promoCodes.map((promo) => (
                        <div key={promo.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="font-mono font-bold text-lg text-slate-900 bg-slate-100 px-3 py-1 rounded">
                              {promo.code.toUpperCase()}
                            </div>
                            <div className="text-sm">
                              <span className="font-semibold text-green-600">{promo.discount_percent}% OFF</span>
                              {promo.max_uses && (
                                <span className="text-slate-600 ml-3">
                                  {promo.current_uses}/{promo.max_uses} uses
                                </span>
                              )}
                              {!promo.max_uses && (
                                <span className="text-slate-600 ml-3">
                                  {promo.current_uses} uses
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTogglePromoCode(promo.id, promo.is_active)}
                              className={`px-4 py-2 rounded-lg transition font-medium text-sm ${
                                promo.is_active
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                            >
                              {promo.is_active ? 'Active' : 'Inactive'}
                            </button>
                            <button
                              onClick={() => handleDeletePromoCode(promo.id)}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                              title="Delete promo code"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {promoCodes.length === 0 && (
                        <div className="text-center py-8 text-slate-600">
                          No promo codes yet. Create one above!
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Active Sponsors</h3>
                    <div className="grid grid-cols-5 gap-4 mb-8">
                      {[1, 2, 3, 4, 5].map((spotNumber) => {
                        const sponsor = activeSponsors.find(s => s.spot_number === spotNumber);
                        return (
                          <div
                            key={spotNumber}
                            className="aspect-square border-2 border-slate-200 rounded-lg flex flex-col items-center justify-center p-3 relative"
                          >
                            <div className="text-xs font-semibold text-slate-400 mb-2">#{spotNumber}</div>
                            {sponsor ? (
                              <>
                                <a
                                  href={sponsor.website_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex flex-col items-center gap-2 text-center group w-full"
                                >
                                  {sponsor.logo_url ? (
                                    <img
                                      src={sponsor.logo_url}
                                      alt={sponsor.website_name}
                                      className="w-16 h-16 object-contain"
                                    />
                                  ) : (
                                    <ExternalLink className="w-6 h-6 text-slate-600 group-hover:text-slate-900 transition" />
                                  )}
                                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 line-clamp-2">
                                    {sponsor.website_name}
                                  </span>
                                </a>
                                <button
                                  onClick={() => handleRemoveSponsor(sponsor.id)}
                                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded hover:bg-red-600 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <div className="text-center">
                                <div className="w-6 h-6 mx-auto mb-2 bg-slate-100 rounded" />
                                <span className="text-xs text-slate-400">Available</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Sponsor Requests</h3>
                    <div className="space-y-3">
                      {sponsorRequests.filter(r => r.status === 'pending').map((request) => (
                        <div key={request.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                                  {request.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{request.profiles?.username}</p>
                                  <p className="text-xs text-slate-600">{formatDate(request.created_at)}</p>
                                </div>
                              </div>
                              <div className="bg-white rounded-lg p-3 mb-3">
                                {request.logo_url && (
                                  <div className="mb-2">
                                    <img
                                      src={request.logo_url}
                                      alt={request.website_name}
                                      className="w-20 h-20 object-contain border border-slate-200 rounded"
                                    />
                                  </div>
                                )}
                                <p className="font-semibold text-slate-900 mb-1">{request.website_name}</p>
                                <a
                                  href={request.website_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {request.website_link}
                                </a>
                              </div>
                              <div className="flex gap-2">
                                <select
                                  onChange={(e) => {
                                    const spot = parseInt(e.target.value);
                                    if (spot) handleApproveSponsor(request.id, spot);
                                  }}
                                  disabled={assigningSpot === request.id}
                                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none"
                                >
                                  <option value="">Assign to spot...</option>
                                  {[1, 2, 3, 4, 5].map(num => (
                                    <option key={num} value={num}>
                                      Spot #{num} {activeSponsors.find(s => s.spot_number === num) ? '(Replace)' : ''}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleRejectSponsor(request.id)}
                                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium text-sm flex items-center gap-2"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {sponsorRequests.filter(r => r.status === 'pending').length === 0 && (
                        <div className="text-center py-12 bg-slate-50 rounded-lg">
                          <ExternalLink className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-600">No pending sponsor requests</p>
                          <p className="text-xs text-slate-400 mt-2">Total requests loaded: {sponsorRequests.length}</p>
                        </div>
                      )}
                    </div>

                    {sponsorRequests.filter(r => r.status !== 'pending').length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-md font-semibold text-slate-900 mb-3">Reviewed Requests</h4>
                        <div className="space-y-2">
                          {sponsorRequests.filter(r => r.status !== 'pending').slice(0, 10).map((request) => (
                            <div key={request.id} className={`rounded-lg p-3 border ${
                              request.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-sm font-semibold">
                                    {request.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 text-sm">{request.website_name}</p>
                                    <p className="text-xs text-slate-600">by {request.profiles?.username}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    request.status === 'approved'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {request.status}
                                  </span>
                                  <p className="text-xs text-slate-500">{formatDate(request.reviewed_at || request.created_at)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'cancellations' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Subscription Cancellations</h3>
                  {cancellations.map((cancellation) => (
                    <div key={cancellation.id} className="bg-white border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-slate-900">{cancellation.username}</span>
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                              Cancelled
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 space-y-1">
                            <p>
                              <span className="font-medium">Duration: </span>
                              {cancellation.subscription_duration}
                            </p>
                            <p>
                              <span className="font-medium">Cancelled: </span>
                              {formatDate(cancellation.cancelled_at)}
                            </p>
                            {cancellation.reason && (
                              <p>
                                <span className="font-medium">Reason: </span>
                                {cancellation.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {cancellations.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-lg">
                      <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600">No cancellations yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'inbox' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Mail className="w-6 h-6 text-slate-900" />
                      <h3 className="text-lg font-semibold text-slate-900">Admin Email Inbox</h3>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-slate-900">Email Address:</span>
                        <a
                          href="mailto:admin@candidteenpro.com"
                          className="text-slate-900 font-mono text-sm hover:text-blue-600 hover:underline transition"
                        >
                          admin@candidteenpro.com
                        </a>
                      </div>
                      <div className="border-t border-slate-200 pt-3">
                        <p className="text-sm text-slate-600 mb-2">
                          This is your primary contact email for:
                        </p>
                        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                          <li>General inquiries and support requests</li>
                          <li>Business partnerships and sponsorships</li>
                          <li>Legal compliance and takedown requests</li>
                          <li>User feedback and suggestions</li>
                        </ul>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">
                          Access your email inbox through your email provider dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Email Configuration</p>
                        <p className="text-blue-800">
                          Configure this email with your domain provider (e.g., Google Workspace, Microsoft 365, or your hosting provider's email service).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {reports.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg">
                      <Flag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600">No reports submitted yet</p>
                    </div>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`p-3 rounded-lg ${
                                report.status === 'pending' ? 'bg-yellow-50' :
                                report.status === 'reviewed' ? 'bg-blue-50' :
                                report.status === 'removed' ? 'bg-red-50' :
                                'bg-slate-50'
                              }`}>
                                <AlertTriangle className={`w-6 h-6 ${
                                  report.status === 'pending' ? 'text-yellow-600' :
                                  report.status === 'reviewed' ? 'text-blue-600' :
                                  report.status === 'removed' ? 'text-red-600' :
                                  'text-slate-600'
                                }`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                    report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                                    report.status === 'removed' ? 'bg-red-100 text-red-800' :
                                    'bg-slate-100 text-slate-800'
                                  }`}>
                                    {report.status.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(report.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-2">{report.reason}</h3>
                                {report.details && (
                                  <p className="text-sm text-slate-600 mb-3">{report.details}</p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Reporter:</span>
                                    <span>{report.reporter?.username || 'Unknown'}</span>
                                  </div>
                                  {report.reviewed_by && report.reviewer && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Reviewed by:</span>
                                      <span>{report.reviewer.username}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {report.post && (
                            <div className="border-t border-slate-200 pt-4 mt-4">
                              <p className="text-sm font-medium text-slate-700 mb-3">Reported Post:</p>
                              <div className="bg-slate-50 rounded-lg p-4">
                                <div className="flex items-start gap-4">
                                  {report.post.media_type === 'video' ? (
                                    <video
                                      src={report.post.media_url}
                                      className="w-32 h-32 object-cover rounded-lg"
                                    />
                                  ) : (
                                    <img
                                      src={report.post.media_url}
                                      alt="Reported content"
                                      className="w-32 h-32 object-cover rounded-lg"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-semibold text-slate-900">
                                        {report.post.profiles?.username || 'Unknown'}
                                      </span>
                                    </div>
                                    {report.post.caption && (
                                      <p className="text-sm text-slate-600 line-clamp-2">{report.post.caption}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {report.status === 'pending' && (
                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                              <button
                                onClick={() => handleUpdateReportStatus(report.id, 'reviewed')}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                              >
                                Mark as Reviewed
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to remove this post? This action cannot be undone.')) {
                                    handleUpdateReportStatus(report.id, 'removed', report.post_id);
                                  }
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                              >
                                Remove Post
                              </button>
                              <button
                                onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                              >
                                Dismiss Report
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
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

      {editingPostUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Edit Post URL Link</h3>
            <p className="text-sm text-slate-600 mb-4">
              Add or update the download/external link for this post. Pro members will see this link.
            </p>
            <input
              type="text"
              value={postUrlInput}
              onChange={(e) => setPostUrlInput(e.target.value)}
              placeholder="example.com/download"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent mb-2"
            />
            <p className="text-xs text-slate-500 mb-4">https:// will be added automatically</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingPostUrl(null);
                  setPostUrlInput('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdatePostUrl(editingPostUrl)}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessagingModal && (
        <AdminMessaging onClose={() => setShowMessagingModal(false)} />
      )}
    </div>
  );
}
