import { Post, Comment, PostMedia } from '../lib/supabase';
import { Heart, MessageCircle, Trash2, Download, ChevronLeft, ChevronRight, Lock, Crown, Flag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { linkify } from '../utils/linkify';
import ReportModal from './ReportModal';

type PostCardProps = {
  post: Post;
  onDelete?: () => void;
  onOpen?: () => void;
  isModal?: boolean;
  onMessageUser?: (userId: string, username: string) => void;
};

export default function PostCard({ post, onDelete, onOpen, isModal = false, onMessageUser }: PostCardProps) {
  const { user, profile } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mediaItems, setMediaItems] = useState<PostMedia[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [downloadCount, setDownloadCount] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setDeleting(true);
    try {
      const fileName = post.media_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('media')
          .remove([`${post.user_id}/${fileName}`]);
      }

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      onDelete?.();
    } catch (err) {
      console.error('Error deleting post:', err);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadLikes();
    loadComments();
    loadMedia();
    loadDownloadCount();
  }, [post.id]);

  const loadMedia = async () => {
    const { data } = await supabase
      .from('post_media')
      .select('*')
      .eq('post_id', post.id)
      .order('position', { ascending: true });

    if (data && data.length > 0) {
      setMediaItems(data);
    }
  };

  const loadLikes = async () => {
    const { data: likes } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', post.id);

    if (likes) {
      setLikeCount(likes.length);
      setLiked(likes.some(like => like.user_id === user?.id));
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(data);
    }
  };

  const loadDownloadCount = async () => {
    const { count } = await supabase
      .from('downloads')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    if (count !== null) {
      setDownloadCount(count);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('Please sign in to like posts');
      return;
    }

    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: user.id });

      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() })
        .select('*, profiles(*)')
        .single();

      if (error) throw error;

      if (data) {
        setComments(prev => [...prev, data]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isOwner = user?.id === post.user_id;

const isProUser =
  profile?.is_pro &&
  (!profile.subscription_expires_at ||
    new Date(profile.subscription_expires_at) > new Date());

// 🔓 NEW: public post flag
const isPublicPost = post.visible_to_all === true;

// 🔒 Only lock when NOT public
const canViewLockedContent = isProUser || profile?.is_admin || isOwner;
const shouldShowLockOverlay = !isPublicPost && !canViewLockedContent;



  const addWatermarkToImage = async (imageUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);

        const fontSize = Math.max(24, Math.floor(canvas.width / 30));
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        const text = 'candidteenpro.com';
        const textMetrics = ctx.measureText(text);
        const x = (canvas.width - textMetrics.width) / 2;
        const y = canvas.height / 2;

        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.95);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };


  // iOS Safari detection (including iPadOS)
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);



const handleDownload = async () => {
  // 🔓 PUBLIC posts → allow anyone
  // 🔒 PRIVATE posts → require Pro/Admin + login
  if (!isPublicPost) {
    if (!user) {
      alert('Please sign in to download media');
      return;
    }

    if (!isProUser && !profile?.is_admin) {
      alert('Upgrade to Pro to download media');
      const upgradeBtn = document.querySelector('[data-upgrade-button]') as HTMLButtonElement;
      upgradeBtn?.click();
      return;
    }
  }

  // 📱 Preserve user gesture on iOS
  const ios = isIOS();
  const iosTab = ios ? window.open('about:blank', '_blank') : null;

  try {
    // 📊 Track downloads only if user exists
    if (user) {
      await supabase.from('downloads').insert({
        post_id: post.id,
        user_id: user.id,
      });
      setDownloadCount(prev => prev + 1);
    }

    // 🔗 Direct download link wins
    if (post.download_link && post.download_link.trim()) {
      if (ios && iosTab) iosTab.location.href = post.download_link;
      else window.open(post.download_link, '_blank', 'noopener,noreferrer');
      return;
    }

    const currentMediaUrl =
      mediaItems.length > 0
        ? mediaItems[currentMediaIndex].media_url
        : post.media_url;

    const currentMediaType =
      mediaItems.length > 0
        ? mediaItems[currentMediaIndex].media_type
        : post.media_type;

    // 🌍 PUBLIC post → just open media (works logged out + iPhone)
    if (isPublicPost) {
      if (ios && iosTab) iosTab.location.href = currentMediaUrl;
      else window.open(currentMediaUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 🔒 PRIVATE post → signed URL + download
    const urlParts = currentMediaUrl.split('/');
    const bucketIndex = urlParts.findIndex(p => p === 'media');
    if (bucketIndex === -1) throw new Error('Invalid media URL');

    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    const { data: signed, error } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, 60);

    if (error) throw error;

    // iOS: open signed URL
    if (ios) {
      if (iosTab) iosTab.location.href = signed.signedUrl;
      else window.location.href = signed.signedUrl;
      return;
    }

    // Desktop/Android: force download
    const res = await fetch(signed.signedUrl);
    const blob = await res.blob();

    if (currentMediaType === 'video') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidteenpro-${post.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidteenpro-${post.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Download failed:', err);
    if (iosTab) iosTab.close();
    alert('Failed to download media.');
  }
};


  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {isModal && (
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
              {post.profiles?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isOwner && onMessageUser && post.user_id) {
                      onMessageUser(post.user_id, post.profiles?.username || 'Unknown');
                    }
                  }}
                  className={`font-semibold text-slate-900 ${!isOwner ? 'hover:underline cursor-pointer' : ''}`}
                  disabled={isOwner}
                >
                  {post.profiles?.username || 'Unknown'}
                </button>
                {post.profiles?.is_pro && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              <p className="text-xs text-slate-500">{formatDate(post.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOwner && user && (
              <button
                onClick={() => setShowReportModal(true)}
                className="text-slate-400 hover:text-red-500 transition"
                title="Report post"
              >
                <Flag className="w-5 h-5" />
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-slate-400 hover:text-red-500 transition disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
      {!isModal && (
        <div className="p-4 flex items-center justify-end gap-2">
          {!isOwner && user && (
            <button
              onClick={() => setShowReportModal(true)}
              className="text-slate-400 hover:text-red-500 transition"
              title="Report post"
            >
              <Flag className="w-5 h-5" />
            </button>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-slate-400 hover:text-red-500 transition disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      <div
        className="bg-slate-50 relative cursor-pointer"
        onClick={() => !isModal && onOpen?.()}
      >
        {mediaItems.length > 0 ? (
          <>
            {mediaItems[currentMediaIndex].media_type === 'video' ? (
              <video
                src={mediaItems[currentMediaIndex].media_url}
                controls
                className="w-full h-auto object-contain max-h-[600px]"
              />
            ) : (
              <img
                src={mediaItems[currentMediaIndex].media_url}
                alt={post.caption}
                className="w-full h-auto object-contain max-h-[600px]"
              />
            )}
            {mediaItems.length > 1 && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    onClick={() => setCurrentMediaIndex(prev => prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition"
                  >
                    <ChevronLeft className="w-6 h-6 text-slate-900" />
                  </button>
                )}
                {currentMediaIndex < mediaItems.length - 1 && (
                  <button
                    onClick={() => setCurrentMediaIndex(prev => prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition"
                  >
                    <ChevronRight className="w-6 h-6 text-slate-900" />
                  </button>
                )}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {mediaItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`w-2 h-2 rounded-full transition ${
                        index === currentMediaIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          post.media_type === 'video' ? (
            <video
              src={post.media_url}
              controls
              className="w-full h-auto object-contain max-h-[600px]"
            />
          ) : (
            <img
              src={post.media_url}
              alt={post.caption}
              className="w-full h-auto object-contain max-h-[600px]"
            />
          )
        )}

        {shouldShowLockOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <Lock className="w-16 h-16 text-white mb-4 drop-shadow-lg" />
            <p className="text-white font-semibold text-xl mb-2 drop-shadow-lg">Pro Content</p>
            <p className="text-white text-sm mb-6 drop-shadow-lg">
              {user ? 'Upgrade to Pro to view this content' : 'Sign in and upgrade to Pro to view this content'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!user) {
                  alert('Please sign in first to upgrade to Pro');
                  return;
                }
                const upgradeBtn = document.querySelector('[data-upgrade-button]') as HTMLButtonElement;
                upgradeBtn?.click();
              }}
              className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition font-semibold shadow-xl"
            >
              {user ? 'Upgrade for $12.99/week' : 'Sign In to Upgrade'}
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={handleLike}
            className={`transition ${liked ? 'text-red-500' : 'text-slate-600 hover:text-red-500'}`}
          >
            <Heart className="w-6 h-6" fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-slate-600 hover:text-slate-900 transition"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex flex-col items-center text-slate-600 hover:text-slate-900 transition"
              title="Download"
            >
              <span className="text-xs font-medium mb-1"></span>
              <Download className="w-6 h-6" />
              <span className="text-xs mt-0.5">{downloadCount} {downloadCount === 1 ? 'download' : 'downloads'}</span>
            </button>
          </div>
        </div>

        {likeCount > 0 && (
          <p className="font-semibold text-sm text-slate-900 mb-2">
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {isModal && post.caption && (
          <p className="text-slate-900 mb-2">
            <span className="inline-flex items-center gap-1 mr-2">
              <span className="font-semibold">{post.profiles?.username}</span>
              {post.profiles?.is_pro && (
                <Crown className="w-3 h-3 text-yellow-500" />
              )}
            </span>
            <span dangerouslySetInnerHTML={{ __html: linkify(post.caption) }} />
          </p>
        )}

        {!isProUser && !profile?.is_admin && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-3">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 mb-1">Comments are for Pro members only</p>
                <p className="text-xs text-slate-600">Upgrade to Pro to view and add comments</p>
              </div>
              <button
                onClick={() => {
                  const upgradeBtn = document.querySelector('[data-upgrade-button]') as HTMLButtonElement;
                  upgradeBtn?.click();
                }}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition font-medium text-sm whitespace-nowrap shadow-md"
              >
                Upgrade
              </button>
            </div>
          </div>
        )}

        {(isProUser || profile?.is_admin) && (
          <>
            {comments.length > 0 && (
              <button
                onClick={() => setShowComments(!showComments)}
                className="text-sm text-slate-500 mb-2 hover:text-slate-700"
              >
                View {showComments ? 'fewer' : 'all'} {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </button>
            )}

            {showComments && (
              <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                {(() => {
                  const urlRegex = /(https?:\/\/[^\s]+)/;
                  const commentsWithLinks = comments.filter(c => urlRegex.test(c.content));
                  const commentsWithoutLinks = comments.filter(c => !urlRegex.test(c.content));
                  const sortedComments = [...commentsWithLinks, ...commentsWithoutLinks];

                  return sortedComments.map((comment) => (
                    <div key={comment.id} className="text-sm flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {isModal && (
                          <div className="inline-flex items-center gap-1 mr-2">
                            <span className="font-semibold">{comment.profiles?.username}</span>
                            {comment.profiles?.is_pro && (
                              <Crown className="w-3 h-3 text-yellow-500" />
                            )}
                          </div>
                        )}
                        <span
                          className="text-slate-900"
                          dangerouslySetInnerHTML={{ __html: linkify(comment.content) }}
                        />
                      </div>
                      {profile?.is_admin && (
                        <button
                          onClick={async () => {
                            if (confirm('Delete this comment?')) {
                              await supabase.from('comments').delete().eq('id', comment.id);
                              loadComments();
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 transition flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ));
                })()}
              </div>
            )}

            <form onSubmit={handleAddComment} className="flex gap-2 border-t border-slate-200 pt-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 text-sm outline-none"
                disabled={submitting}
              />
              {newComment.trim() && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-blue-500 font-semibold text-sm hover:text-blue-700 disabled:opacity-50"
                >
                  Post
                </button>
              )}
            </form>
          </>
        )}
      </div>

      {showReportModal && (
        <ReportModal
          postId={post.id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
