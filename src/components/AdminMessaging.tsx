import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Users, User, Trash2, X, Inbox } from 'lucide-react';

type Profile = {
  id: string;
  username: string;
  is_pro: boolean;
  is_admin?: boolean;
};

type BroadcastMessage = {
  id: string;
  message: string;
  created_at: string;
  target_user_id: string | null;
  created_by: string;
  profiles?: {
    username: string;
  };
};

type AdminInboxMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  admin_reply?: string | null;
  replied_at?: string | null;
  replied_by?: string | null;
  profiles?: {
    id: string;
    username: string;
    is_pro: boolean;
  } | null;
};

type AdminMessagingProps = {
  onClose: () => void;
};

export default function AdminMessaging({ onClose }: AdminMessagingProps) {
  const { user, profile } = useAuth() as { user: any; profile?: Profile | null };

  const [activeTab, setActiveTab] = useState<'send' | 'inbox'>('send');

  // Sending
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageType, setMessageType] = useState<'broadcast' | 'individual'>('broadcast');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const [users, setUsers] = useState<Profile[]>([]);
  const [sentMessages, setSentMessages] = useState<BroadcastMessage[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminInboxMessage[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [loadingInbox, setLoadingInbox] = useState(true);

  // --- Loaders ---
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, is_pro, is_admin')
        .order('username', { ascending: true });

      if (error) throw error;
      setUsers((data as Profile[]) || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSentMessages = async () => {
    setLoadingSent(true);
    try {
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select(`
          id,
          message,
          created_at,
          target_user_id,
          created_by,
          profiles!broadcast_messages_created_by_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSentMessages((data as BroadcastMessage[]) || []);
    } catch (err) {
      console.error('Error fetching sent messages:', err);
      setSentMessages([]);
    } finally {
      setLoadingSent(false);
    }
  };

  const loadAdminMessages = async () => {
    setLoadingInbox(true);
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select(`
          id,
          user_id,
          message,
          created_at,
          admin_reply,
          replied_at,
          replied_by,
          profiles:user_id (
            id,
            username,
            is_pro
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminMessages((data as AdminInboxMessage[]) || []);
    } catch (err) {
      console.error('Failed to load admin inbox:', err);
      setAdminMessages([]);
    } finally {
      setLoadingInbox(false);
    }
  };

  useEffect(() => {
    // load everything when modal opens
    fetchUsers();
    fetchSentMessages();
    loadAdminMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Helpers ---
  const filteredUsers = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return users;
    return users.filter(u => (u.username || '').toLowerCase().includes(s));
  }, [users, searchTerm]);

  const getTargetUserName = (msg: BroadcastMessage) => {
    if (!msg.target_user_id) return 'All Users';
    const u = users.find(x => x.id === msg.target_user_id);
    return u?.username || 'Unknown User';
  };

  // --- Actions ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('You must be signed in.');
      return;
    }

    const text = message.trim();
    if (!text) return;

    if (messageType === 'individual' && !selectedUserId) {
      alert('Please select a user to send the message to');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('broadcast_messages').insert({
        message: text,
        created_by: user.id,
        target_user_id: messageType === 'individual' ? selectedUserId : null,
      });

      if (error) throw error;

      setMessage('');
      setSelectedUserId('');
      alert(`Message sent successfully to ${messageType === 'broadcast' ? 'all users' : 'selected user'}!`);
      await fetchSentMessages();
    } catch (err: any) {
      console.error('Error sending message:', err);
      alert(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const { error } = await supabase
        .from('broadcast_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      await fetchSentMessages();
    } catch (err: any) {
      console.error('Error deleting message:', err);
      alert(err?.message || 'Failed to delete message');
    }
  };

  // Optional admin reply (only works if your table has admin_reply columns)
  const handleReply = async (msgId: string, replyText: string) => {
    const text = replyText.trim();
    if (!text) return;

    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({
          admin_reply: text,
          replied_at: new Date().toISOString(),
          replied_by: user?.id || null,
        })
        .eq('id', msgId);

      if (error) throw error;
      await loadAdminMessages();
    } catch (err: any) {
      console.error('Reply failed:', err);
      alert(err?.message || 'Failed to reply');
    }
  };

  // --- Guard ---
  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Admin Messaging</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-slate-600">Please sign in.</p>
        </div>
      </div>
    );
  }

  if (profile && profile.is_admin === false) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Admin Messaging</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-slate-600">Access denied.</p>
        </div>
      </div>
    );
  }

  // --- UI ---
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Admin Messaging</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'send' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            Send
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'inbox' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Inbox
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'send' ? (
            <>
              {/* Send Form */}
              <form onSubmit={handleSendMessage} className="border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setMessageType('broadcast')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                      messageType === 'broadcast' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Broadcast
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageType('individual')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                      messageType === 'individual' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <User className="w-4 h-4" /> Individual
                  </button>
                </div>

                {messageType === 'individual' && (
                  <div className="mb-3">
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-slate-200"
                    />

                    <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
                      {loadingUsers ? (
                        <div className="p-3 text-sm text-slate-500">Loading users...</div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500">No users found.</div>
                      ) : (
                        filteredUsers.map(u => (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => setSelectedUserId(u.id)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition flex items-center justify-between ${
                              selectedUserId === u.id ? 'bg-slate-100' : ''
                            }`}
                          >
                            <span>{u.username}</span>
                            {u.is_pro ? <span className="text-xs text-emerald-600 font-semibold">PRO</span> : null}
                          </button>
                        ))
                      )}
                    </div>

                    {selectedUserId && (
                      <div className="mt-2 text-xs text-slate-600">
                        Selected: <span className="font-semibold">{users.find(u => u.id === selectedUserId)?.username}</span>
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-slate-200 resize-none"
                />

                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                    disabled={sending}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    disabled={sending || !message.trim() || (messageType === 'individual' && !selectedUserId)}
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>

              {/* Sent Messages */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Recently Sent</h3>
                  <button
                    onClick={fetchSentMessages}
                    className="text-sm text-slate-600 hover:text-slate-900"
                    type="button"
                  >
                    Refresh
                  </button>
                </div>

                {loadingSent ? (
                  <div className="text-sm text-slate-500">Loading...</div>
                ) : sentMessages.length === 0 ? (
                  <div className="text-sm text-slate-500">No sent messages.</div>
                ) : (
                  <div className="space-y-3">
                    {sentMessages.map((m) => (
                      <div key={m.id} className="border rounded-xl p-4 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-slate-500">
                            To: <span className="font-semibold text-slate-700">{getTargetUserName(m)}</span> •{' '}
                            {new Date(m.created_at).toLocaleString()}
                          </div>
                          <div className="mt-2 text-sm text-slate-900 whitespace-pre-wrap">{m.message}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          className="text-slate-400 hover:text-red-500 transition"
                          title="Delete"
                          type="button"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Admin Inbox */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">User Messages to Admin</h3>
                <button
                  onClick={loadAdminMessages}
                  className="text-sm text-slate-600 hover:text-slate-900"
                  type="button"
                >
                  Refresh
                </button>
              </div>

              {loadingInbox ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : adminMessages.length === 0 ? (
                <div className="text-sm text-slate-500">No messages yet.</div>
              ) : (
                <div className="space-y-3">
                  {adminMessages.map((m) => (
                    <AdminInboxCard key={m.id} msg={m} onReply={handleReply} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminInboxCard({
  msg,
  onReply,
}: {
  msg: AdminInboxMessage;
  onReply: (msgId: string, replyText: string) => Promise<void>;
}) {
  const [reply, setReply] = useState('');

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            From: {msg.profiles?.username || msg.user_id}{' '}
            {msg.profiles?.is_pro ? <span className="ml-2 text-xs text-emerald-600 font-semibold">PRO</span> : null}
          </div>
          <div className="text-xs text-slate-500">{new Date(msg.created_at).toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-2 text-sm text-slate-900 whitespace-pre-wrap">{msg.message}</div>

      {msg.admin_reply ? (
        <div className="mt-3 bg-slate-50 border rounded-lg p-3">
          <div className="text-xs font-semibold text-slate-700">Admin reply</div>
          <div className="text-sm text-slate-900 whitespace-pre-wrap">{msg.admin_reply}</div>
          {msg.replied_at ? (
            <div className="text-xs text-slate-500 mt-1">{new Date(msg.replied_at).toLocaleString()}</div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Type a reply (optional)..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-slate-200 resize-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
              disabled={!reply.trim()}
              onClick={async () => {
                await onReply(msg.id, reply);
                setReply('');
              }}
            >
              Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
