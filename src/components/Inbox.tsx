import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mail, MailOpen, Clock, X, Loader2, User, Shield, MessageSquare, Send } from 'lucide-react';
import MessageAdmin from './MessageAdmin';

type AdminMessage = {
  id: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
  type: 'admin';
};

type UserMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  read: boolean;
  created_at: string;
  sender_profile?: { username: string; is_pro: boolean };
  type: 'user';
};

type CombinedMessage = AdminMessage | UserMessage;

type InboxProps = {
  onClose: () => void;
};

export default function Inbox({ onClose }: InboxProps) {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<CombinedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<CombinedMessage | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'admin' | 'users'>('all');
  const [showMessageAdmin, setShowMessageAdmin] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<UserMessage[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    if (!profile) return;

    try {
      const [adminMessagesResult, receivedMessagesResult, sentMessagesResult] = await Promise.all([
        supabase
          .from('admin_messages')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_messages')
          .select('*, sender_profile:profiles!user_messages_sender_id_fkey(username, is_pro)')
          .eq('recipient_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_messages')
          .select('*, sender_profile:profiles!user_messages_recipient_id_fkey(username, is_pro)')
          .eq('sender_id', profile.id)
          .order('created_at', { ascending: false })
      ]);

      const adminMessages: AdminMessage[] = (adminMessagesResult.data || []).map(msg => ({
        ...msg,
        type: 'admin' as const
      }));

      const receivedMessages: UserMessage[] = (receivedMessagesResult.data || []).map(msg => ({
        ...msg,
        sender_profile: Array.isArray(msg.sender_profile) ? msg.sender_profile[0] : msg.sender_profile,
        type: 'user' as const
      }));

      const sentMessages: UserMessage[] = (sentMessagesResult.data || []).map(msg => ({
        ...msg,
        sender_profile: Array.isArray(msg.sender_profile) ? msg.sender_profile[0] : msg.sender_profile,
        type: 'user' as const
      }));

      const allUserMessages = [...receivedMessages, ...sentMessages];
      const uniqueUsers = new Map<string, UserMessage>();

      allUserMessages.forEach(msg => {
        const otherUserId = msg.sender_id === profile.id ? msg.recipient_id : msg.sender_id;
        const existing = uniqueUsers.get(otherUserId);
        if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
          uniqueUsers.set(otherUserId, msg);
        }
      });

      const latestUserMessages = Array.from(uniqueUsers.values());

      const combined = [...adminMessages, ...latestUserMessages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setMessages(combined);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAdminMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('admin_messages')
        .update({ status: 'read' })
        .eq('id', messageId)
        .eq('status', 'unread');

      setMessages(prev =>
        prev.map(msg =>
          msg.type === 'admin' && msg.id === messageId && msg.status === 'unread'
            ? { ...msg, status: 'read' as const }
            : msg
        )
      );
    } catch (err) {
      console.error('Error marking admin message as read:', err);
    }
  };

  const markUserMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('user_messages')
        .update({ read: true })
        .eq('id', messageId)
        .eq('read', false);

      setMessages(prev =>
        prev.map(msg =>
          msg.type === 'user' && msg.id === messageId && !msg.read
            ? { ...msg, read: true }
            : msg
        )
      );
    } catch (err) {
      console.error('Error marking user message as read:', err);
    }
  };

  const loadConversation = async (otherUserId: string) => {
    if (!profile) return;

    setLoadingConversation(true);
    try {
      const { data, error } = await supabase
        .from('user_messages')
        .select('*, sender_profile:profiles!user_messages_sender_id_fkey(username, is_pro)')
        .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${profile.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const conversation: UserMessage[] = (data || []).map(msg => ({
        ...msg,
        sender_profile: Array.isArray(msg.sender_profile) ? msg.sender_profile[0] : msg.sender_profile,
        type: 'user' as const
      }));

      setConversationMessages(conversation);
    } catch (err) {
      console.error('Error loading conversation:', err);
    } finally {
      setLoadingConversation(false);
    }
  };

  const openMessage = async (message: CombinedMessage) => {
    setSelectedMessage(message);
    setReplyText('');
    if (message.type === 'admin' && message.status === 'unread') {
      markAdminMessageAsRead(message.id);
    } else if (message.type === 'user') {
      const otherUserId = message.sender_id === profile?.id ? message.recipient_id : message.sender_id;
      await loadConversation(otherUserId);
      if (!message.read && message.recipient_id === profile?.id) {
        markUserMessageAsRead(message.id);
      }
    }
  };

  const handleSendReply = async () => {
    if (!user || !selectedMessage || selectedMessage.type !== 'user' || !replyText.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('user_messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedMessage.sender_id,
          message: replyText.trim()
        });

      if (error) throw error;

      setReplyText('');
      if (selectedMessage.type === 'user') {
        const otherUserId = selectedMessage.sender_id === user.id ? selectedMessage.recipient_id : selectedMessage.sender_id;
        await loadConversation(otherUserId);
      }
      await loadMessages();
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'all') return true;
    if (activeTab === 'admin') return msg.type === 'admin';
    if (activeTab === 'users') return msg.type === 'user';
    return true;
  });

  const unreadCount = messages.filter(m =>
    m.type === 'admin' ? m.status === 'unread' : !m.read
  ).length;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Inbox</h2>
              {unreadCount > 0 && (
                <p className="text-sm text-slate-600 mt-1">
                  {unreadCount} unread {unreadCount === 1 ? 'message' : 'messages'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMessageAdmin(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
                title="Message Admin"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="hidden sm:inline">Message Admin</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

        {!selectedMessage && (
          <div className="border-b border-slate-200 flex">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === 'all'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === 'admin'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === 'users'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Users
            </button>
          </div>
        )}

        {selectedMessage ? (
          <div className="flex-1 overflow-y-auto p-6">
            <button
              onClick={() => setSelectedMessage(null)}
              className="text-sm text-slate-600 hover:text-slate-900 mb-4"
            >
              ← Back to inbox
            </button>

            {selectedMessage.type === 'admin' ? (
              <>
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Admin Message</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                    <Clock className="w-4 h-4" />
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </div>
                  <p className="text-slate-900">{selectedMessage.message}</p>
                </div>

                {selectedMessage.admin_reply && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                        ADMIN REPLY
                      </div>
                      {selectedMessage.replied_at && (
                        <span className="text-sm text-slate-600">
                          {new Date(selectedMessage.replied_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-900">{selectedMessage.admin_reply}</p>
                  </div>
                )}

                {!selectedMessage.admin_reply && (
                  <div className="text-center py-8 text-slate-600">
                    <Mail className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p>No admin reply yet</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                    <User className="w-4 h-4" />
                    <span className="font-medium">
                      Conversation with: {selectedMessage.sender_id === profile?.id
                        ? selectedMessage.sender_profile?.username || 'Unknown User'
                        : selectedMessage.sender_profile?.username || 'Unknown User'}
                    </span>
                  </div>

                  {loadingConversation ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                    </div>
                  ) : (
                    <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                      {conversationMessages.map((msg) => {
                        const isSentByMe = msg.sender_id === profile?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-4 ${
                                isSentByMe
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-900'
                              }`}
                            >
                              <p className="text-sm mb-1">{msg.message}</p>
                              <p className={`text-xs ${
                                isSentByMe ? 'text-slate-300' : 'text-slate-500'
                              }`}>
                                {new Date(msg.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Reply</h4>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none mb-3"
                    disabled={sending}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                <Mail className="w-16 h-16 mb-4 text-slate-400" />
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-sm text-slate-500">
                  {activeTab === 'admin' && 'Messages from admins will appear here'}
                  {activeTab === 'users' && 'Messages from other users will appear here'}
                  {activeTab === 'all' && 'Your messages will appear here'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredMessages.map(message => {
                  const isUnread = message.type === 'admin' ? message.status === 'unread' : !message.read;

                  return (
                    <button
                      key={`${message.type}-${message.id}`}
                      onClick={() => openMessage(message)}
                      className="w-full text-left p-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isUnread ? (
                            <Mail className="w-5 h-5 text-blue-600" />
                          ) : (
                            <MailOpen className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {message.type === 'admin' ? (
                              <Shield className="w-4 h-4 text-blue-600" />
                            ) : (
                              <User className="w-4 h-4 text-slate-600" />
                            )}
                            <span
                              className={`text-sm font-medium ${
                                isUnread ? 'text-slate-900' : 'text-slate-600'
                              }`}
                            >
                              {message.type === 'admin'
                                ? message.admin_reply ? 'Admin replied' : 'Admin message'
                                : `From ${message.sender_profile?.username || 'Unknown'}`}
                            </span>
                            {message.type === 'admin' && message.status === 'replied' && (
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                Replied
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-sm line-clamp-2 ${
                              isUnread ? 'text-slate-900' : 'text-slate-600'
                            }`}
                          >
                            {message.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(message.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {showMessageAdmin && (
      <MessageAdmin onClose={() => {
        setShowMessageAdmin(false);
        loadMessages();
      }} />
    )}
  </>
  );
}
