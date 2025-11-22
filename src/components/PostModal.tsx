import { Post } from '../lib/supabase';
import { X } from 'lucide-react';
import PostCard from './PostCard';

type PostModalProps = {
  post: Post;
  onClose: () => void;
  onDelete?: () => void;
  onMessageUser?: (userId: string, username: string) => void;
};

export default function PostModal({ post, onClose, onDelete, onMessageUser }: PostModalProps) {
  const handleDelete = () => {
    onDelete?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="max-w-5xl w-full max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <PostCard post={post} onDelete={handleDelete} isModal={true} onMessageUser={onMessageUser} />
        </div>
      </div>
    </div>
  );
}
