import { useEffect, useState } from 'react';
import { supabase, Post } from '../lib/supabase';
import PostCard from './PostCard';
import PostModal from './PostModal';
import { Loader2, Camera } from 'lucide-react';

type FeedProps = {
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onMessageUser?: (userId: string, username: string) => void;
};

export default function Feed({ isAuthenticated, onLoginClick, onMessageUser }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const fetchPosts = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 text-lg">No posts yet. Be the first to share something!</p>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="bg-slate-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to candidteenpro</h1>
          <p className="text-slate-600 mb-6">Sign in to interact with posts, create content, and unlock premium features</p>
          <button
            onClick={onLoginClick}
            className="px-8 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-semibold text-lg shadow-md"
          >
            Sign In / Sign Up
          </button>
        </div>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="relative">
            <PostCard
              post={post}
              onDelete={fetchPosts}
              onOpen={() => setSelectedPost(post)}
              onMessageUser={onMessageUser}
            />
            {!isAuthenticated && (
              <div
                className="absolute inset-0 backdrop-blur-md bg-white/30 rounded-xl flex items-center justify-center cursor-pointer"
                onClick={onLoginClick}
              >
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Sign in to view</h3>
                  <p className="text-slate-600 mb-6">Create an account to see all content and interact with posts</p>
                  <button className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-semibold">
                    Sign In Now
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={fetchPosts}
          onMessageUser={onMessageUser}
        />
      )}
    </>
  );
}
