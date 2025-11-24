import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Upload, Image as ImageIcon, Video } from 'lucide-react';

type CreatePostProps = {
  onClose: () => void;
  onPostCreated: () => void;
};

export default function CreatePost({ onClose, onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fileTypes, setFileTypes] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILES = 5;

 // Admin-only: Post as another user
const [users, setUsers] = useState<Profile[]>([]);
const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
const [userSearchQuery, setUserSearchQuery] = useState('');
const [loadingUsers, setLoadingUsers] = useState(false);
const isAdmin = profile?.is_admin || false;
 useEffect(() => {
    return () => {
      previews.forEach(preview => {
        if (preview && preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [previews]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > MAX_FILES) {
      setError(`You can only upload up to ${MAX_FILES} files per post`);
      return;
  const fetchUsers = async () => {
  setLoadingUsers(true);
  try {
    const { data, error } = await Bolt Database
      .from('profiles')
      .select('id, username, avatar_url, full_name')
      .order('username', { ascending: true });

    if (error) throw error;
    setUsers(data || []);
  } catch (err) {
    console.error('Error fetching users:', err);
  } finally {
    setLoadingUsers(false);
  }
};
  }

    const MAX_FILE_SIZE = 133 * 1024 * 1024; // 133MB
    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    const newFileTypes: string[] = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError('Only image and video files are allowed');
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setError(`File "${file.name}" is too large (${fileSizeMB}MB). Maximum file size is 133MB.`);
        continue;
      }

      validFiles.push(file);
      const objectUrl = URL.createObjectURL(file);
      newPreviews.push(objectUrl);
      newFileTypes.push(file.type.startsWith('video/') ? 'video' : 'image');
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setPreviews(prev => [...prev, ...newPreviews]);
      setFileTypes(prev => [...prev, ...newFileTypes]);
      if (validFiles.length === selectedFiles.length) {
        setError(null);
      }
    }
  };

  const removeFile = (index: number) => {
    const preview = previews[index];
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFileTypes(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFileToStorage = async (file: File, fileName: string, progressCallback?: (progress: number) => void): Promise<string> => {
    console.log('Uploading file via Supabase client:', fileName, 'Type:', file.type, 'Size:', file.size);

    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(error.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];
      const totalFiles = files.length;

      // Upload files in parallel for faster processing
      const uploadPromises = files.map(async (file, i) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

        try {
          const url = await uploadFileToStorage(file, fileName, (progress) => {
            // Update individual file progress
            const overallProgress = ((i / totalFiles) * 100) + (progress / totalFiles);
            setUploadProgress(Math.round(overallProgress));
          });
          return url;
        } catch (uploadError: any) {
          console.error(`Failed to upload file ${i}:`, uploadError);
          throw uploadError;
        }
      });

      const results = await Promise.all(uploadPromises);
      uploadedUrls.push(...results);
      setUploadProgress(100);

      const { data: post, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: caption.trim(),
          media_url: uploadedUrls[0],
          media_type: fileTypes[0],
          download_link: downloadUrl.trim() || null,
    // Use selected user ID if admin, otherwise use current user ID
const postUserId = isAdmin && selectedUserId ? selectedUserId : user.id;

const { data: post, error: insertError } = await Bolt Database
  .from('posts')
  .insert({
    user_id: postUserId,  // <-- Uses the selected user's ID
    caption: caption.trim(),
    media_url: uploadedUrls[0],
    media_type: fileTypes[0],
    download_link: downloadUrl.trim() || null,
    is_locked: true,
  })
      is_locked: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (uploadedUrls.length > 1) {
        const mediaInserts = uploadedUrls.map((url, index) => ({
          post_id: post.id,
          media_url: url,
          media_type: fileTypes[index],
          position: index,
        }));

        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(mediaInserts);

        if (mediaError) throw mediaError;
      }

      const { error: pointsError } = await supabase.rpc('increment_user_points', {
        user_id: user.id,
        points_to_add: 5
      });

      if (pointsError) {
        console.error('Failed to award points:', pointsError);
      }

      onPostCreated();
      onClose();
    } catch (err: any) {
      console.error('Create post error:', err);
      setError(err.message || 'Failed to create post');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Create Post</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

     {isAdmin && (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Post as User (Admin Only)
    </label>
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
      <input
        type="text"
        placeholder="Search users..."
        value={userSearchQuery}
        onChange={(e) => setUserSearchQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none"
      />
    </div>
    {userSearchQuery && (
      <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
        {users
          .filter(u =>
            u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
            u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase())
          )
          .slice(0, 10)
          .map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                setSelectedUserId(u.id);
                setUserSearchQuery(u.username || 'Unknown');
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition text-left"
            >
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt={u.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                  {u.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <p className="font-medium text-slate-900">{u.username}</p>
                <p className="text-sm text-slate-600">{u.full_name || 'No name'}</p>
              </div>
            </button>
          ))}
      </div>
    )}
    {selectedUserId && (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
        <span className="text-sm text-blue-900">
          Posting as: <strong>{users.find(u => u.id === selectedUserId)?.username}</strong>
        </span>
        <button
          type="button"
          onClick={() => {
            setSelectedUserId(null);
            setUserSearchQuery('');
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Clear
        </button>
      </div>
    )}
    {!selectedUserId && !userSearchQuery && (
      <p className="mt-2 text-sm text-slate-500">
        Leave empty to post as yourself, or search to post as another user
      </p>
    )}
  </div>
)}
   <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Media (up to {MAX_FILES} files)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {files.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg p-12 hover:border-slate-400 transition text-center"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600 font-medium mb-1">Click to upload</p>
                <p className="text-sm text-slate-500">Images and videos (max 133MB per file)</p>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {fileTypes[index] === 'video' ? (
                        <video
                          src={preview}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ) : (
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded-lg flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {fileTypes[index] === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                      </div>
                    </div>
                  ))}
                </div>

                {files.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-slate-400 transition text-center text-sm text-slate-600"
                  >
                    + Add more files ({files.length}/{MAX_FILES})
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="caption" className="block text-sm font-medium text-slate-700 mb-2">
              Caption
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition resize-none"
            />
          </div>

          <div>
            <label htmlFor="downloadUrl" className="block text-sm font-medium text-slate-700 mb-2">
              Download Link (Optional)
            </label>
            <input
              id="downloadUrl"
              type="url"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://example.com/download"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition"
            />
            <p className="text-xs text-slate-500 mt-1">Pro subscribers will see this download link</p>
          </div>


          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="flex-1 px-6 py-3 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
