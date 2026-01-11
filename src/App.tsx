import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Header from './components/Header';
import Feed from './components/Feed';
import CreatePost from './components/CreatePost';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import Inbox from './components/Inbox';
import DirectMessage from './components/DirectMessage';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, loading } = useAuth();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showDirectMessage, setShowDirectMessage] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<{ id: string; username: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');

    if (success === 'true' && user) {
      handleUpgradeSuccess();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const handleUpgradeSuccess = async () => {
    if (!user) return;

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from('profiles')
        .update({
          is_pro: true,
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Welcome to Pro! You now have access to all premium content.');
      window.location.reload();
    } catch (err: any) {
      console.error('Error upgrading to Pro:', err);
      alert('Payment successful but failed to activate Pro. Please contact support.');
    }
  };

  const handleUpgrade = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        alert('Authentication error. Please sign in again.');
        return;
      }

      if (!session?.access_token) {
        alert('Please sign in to upgrade');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Checkout error:', errorData);
        alert(errorData.error || 'Failed to start checkout process');
        return;
      }

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Error creating checkout:', err);
      alert(err.message || 'Failed to start checkout process');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {user && (
        <Header
          onCreatePost={() => setShowCreatePost(true)}
          onShowProfile={() => setShowProfile(true)}
          onShowAdmin={() => setShowAdmin(true)}
          onUpgrade={handleUpgrade}
          onShowInbox={() => setShowInbox(true)}
        />
      )}

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Feed
          key={refreshKey}
          isAuthenticated={!!user}
          onLoginClick={() => setShowAuth(true)}
          onMessageUser={(userId, username) => {
            setMessageRecipient({ id: userId, username });
            setShowDirectMessage(true);
          }}
        />
      </main>

      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {showProfile && (
        <Profile onClose={() => setShowProfile(false)} />
      )}

      {showAdmin && (
        <AdminDashboard onClose={() => setShowAdmin(false)} />
      )}

      {showInbox && (
        <Inbox onClose={() => setShowInbox(false)} />
      )}

      {showDirectMessage && messageRecipient && (
        <DirectMessage
          recipientId={messageRecipient.id}
          recipientUsername={messageRecipient.username}
          onClose={() => {
            setShowDirectMessage(false);
            setMessageRecipient(null);
          }}
        />
      )}

      {showAuth && !user && (
        <Auth onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
