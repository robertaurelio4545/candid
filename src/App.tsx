import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Header from './components/Header';
import Feed from './components/Feed';
import CreatePost from './components/CreatePost';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import Inbox from './components/Inbox';
import DirectMessage from './components/DirectMessage';
import PostDetail from './components/PostDetail';
import Sponsors from './components/Sponsors';
import Compliance2257 from './components/Compliance2257';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, loading, refreshProfile, profile } = useAuth();
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

    alert('Processing your payment... Please wait while we activate your Pro membership.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    try {
      const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      const result = await response.json();

      if (result.success && result.is_pro) {
        alert('Welcome to Pro! You now have access to all premium content.');
        window.location.reload();
        return;
      }
    } catch (err) {
      console.error('Verification error:', err);
    }

    let attempts = 0;
    const maxAttempts = 15;
    const interval = setInterval(async () => {
      attempts++;

      await refreshProfile();

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', user.id)
        .maybeSingle();

      if (currentProfile?.is_pro) {
        clearInterval(interval);
        alert('Welcome to Pro! You now have access to all premium content.');
        window.location.reload();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        alert('Payment received but Pro activation is taking longer than expected. Please refresh the page in a minute or contact support if the issue persists.');
      }
    }, 2000);
  };

  const handleUpgrade = async (promoCode?: string) => {
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
        body: JSON.stringify({ promoCode: promoCode || null }),
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
          onUpgrade={() => handleUpgrade()}
          onShowInbox={() => setShowInbox(true)}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Feed
                  key={refreshKey}
                  isAuthenticated={!!user}
                  onLoginClick={() => setShowAuth(true)}
                  onMessageUser={(userId, username) => {
                    setMessageRecipient({ id: userId, username });
                    setShowDirectMessage(true);
                  }}
                />
                <Sponsors />
              </>
            }
          />
          <Route
            path="/post/:postId"
            element={
              <PostDetail
                onMessageUser={(userId, username) => {
                  setMessageRecipient({ id: userId, username });
                  setShowDirectMessage(true);
                }}
              />
            }
          />
          <Route path="/2257" element={<Compliance2257 />} />
        </Routes>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 mt-12 border-t border-slate-200">
        <div className="text-center">
          <a
            href="/2257"
            className="text-sm text-slate-600 hover:text-slate-900 underline transition"
          >
            18 U.S.C. § 2257 Compliance Statement
          </a>
        </div>
      </footer>

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
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
