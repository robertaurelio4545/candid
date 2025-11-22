import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Users, User, Trash2, X } from 'lucide-react';

type Profile = {
  id: string;
  username: string;
  is_pro: boolean;
};

type BroadcastMessage = {
  id: string;
  message: string;
  created_at: string;
  target_user_id: string | null;
  created_by: string;
  profiles: {
    username: string;
  };
};

type AdminMessagingProps = {
  onClose: () => void;
};

export default function AdminMessaging({ onClose }: AdminMessagingProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageType, setMessageType] = useState<'broadcast' | 'individual'>('broadcast');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentMessages, setSentMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchSentMessages();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, is_pro')
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchSentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select(`
          *,
          profiles!broadcast_messages_created_by_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSentMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    if (messageType === 'individual' && !selectedUserId) {
      alert('Please select a user to send the message to');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('broadcast_messages')
        .insert({
          message: message.trim(),
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
      alert(err.message || 'Failed to send message');
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
      alert(err.message || 'Failed to delete message');
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTargetUserName = (msg: BroadcastMessage) => {
    if (!msg.target_user_id) return 'All Users';
    const user = users.find(u => u.id === msg.target_user_id);
    return user ? user.username : 'Unknown User';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Admin Messaging</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSendMessage} className="bg-slate-50 rounded-xl p-6 mb-8">
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setMessageType('broadcast')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  messageType === 'broadcast'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-300'
                }`}
              >
                <Users className="w-5 h-5" />
                Broadcast to All
              </button>
              <button
                type="button"
                onClick={() => setMessageType('individual')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  messageType === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-300'
                }`}
              >
                <User className="w-5 h-5" />
                Message Individual
              </button>
            </div>

            {messageType === 'individual' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select User
                </label>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-2"
                />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">Choose a user...</option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} {user.is_pro ? '(Pro)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Sent Messages</h3>
            {loading ? (
              <p className="text-slate-600 text-center py-8">Loading messages...</p>
            ) : sentMessages.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No messages sent yet</p>
            ) : (
              <div className="space-y-4">
                {sentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-white border border-slate-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {msg.target_user_id ? (
                            <User className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Users className="w-4 h-4 text-green-600" />
                          )}
                          <span className="font-medium text-slate-800">
                            {getTargetUserName(msg)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
