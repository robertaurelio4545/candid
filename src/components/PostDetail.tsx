import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Post } from '../lib/supabase';
import PostCard from './PostCard';
import { ArrowLeft, Loader2 } from 'lucide-react';

type PostDetailProps = {
  onMessageUser?: (userId: string, username: string) => void;
};

export default function PostDetail({ onMessageUser }: PostDetailProps) {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    if (!postId) return;

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
        .eq('id', postId)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (err) {
      console.error('Error fetching post:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 text-lg mb-4">Post not found</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Feed
      </button>

      <PostCard
        post={post}
        onDelete={() => navigate('/')}
        isModal={true}
        onMessageUser={onMessageUser}
      />
    </div>
  );
}
