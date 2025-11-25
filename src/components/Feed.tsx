import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600 text-lg">No posts yet. Be the first to share something!</p>
        </div>
      )}

      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
        {posts.map((post) => (
          <div key={post.id} className="relative group break-inside-avoid mb-4">
            <div
              onClick={() => navigate(`/post/${post.id}`)}
              className="cursor-pointer block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
            >
              {post.media && post.media.length > 0 ? (
                post.media[0].media_type === 'video' ? (
                  <video
                    src={post.media[0].media_url}
                    className="w-full h-auto object-cover"
                  />
                ) : (
                  <img
                    src={post.media[0].media_url}
                    alt={post.caption || 'Post'}
                    className="w-full h-auto object-cover"
                  />
                )
              ) : post.media_type === 'video' ? (
                <video
                  src={post.media_url}
                  className="w-full h-auto object-cover"
                />
              ) : (
                <img
                  src={post.media_url}
                  alt={post.caption || 'Post'}
                  className="w-full h-auto object-cover"
                />
              )}
            </div>
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
