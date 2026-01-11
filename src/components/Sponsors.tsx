import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ExternalLink } from 'lucide-react';

type Sponsor = {
  id: string;
  spot_number: number;
  website_name: string;
  website_link: string;
};

type SponsorRequestFormProps = {
  onClose: () => void;
  onSubmit: () => void;
};

function SponsorRequestForm({ onClose, onSubmit }: SponsorRequestFormProps) {
  const [websiteName, setWebsiteName] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteName.trim() || !websiteLink.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to submit a sponsor request');
        return;
      }

      const { error } = await supabase
        .from('sponsor_requests')
        .insert({
          user_id: user.id,
          website_name: websiteName.trim(),
          website_link: websiteLink.trim(),
          status: 'pending'
        });

      if (error) throw error;

      alert('Sponsor request submitted successfully! An admin will review it soon.');
      onSubmit();
      onClose();
    } catch (err) {
      console.error('Error submitting sponsor request:', err);
      alert('Failed to submit sponsor request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Request Sponsor Spot</h2>
        <p className="text-slate-600 mb-6 text-sm">
          Submit your website details to be considered for a sponsor spot. An admin will review your request.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Website Name
            </label>
            <input
              type="text"
              value={websiteName}
              onChange={(e) => setWebsiteName(e.target.value)}
              placeholder="e.g., My Awesome Website"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Website Link
            </label>
            <input
              type="url"
              value={websiteLink}
              onChange={(e) => setWebsiteLink(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('spot_number', { ascending: true });

      if (error) throw error;
      setSponsors(data || []);
    } catch (err) {
      console.error('Error fetching sponsors:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSponsorForSpot = (spotNumber: number): Sponsor | undefined => {
    return sponsors.find(s => s.spot_number === spotNumber);
  };

  if (loading) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Sponsors</h2>
        <button
          onClick={() => setShowRequestForm(true)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium"
        >
          Request Spot
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((spotNumber) => {
          const sponsor = getSponsorForSpot(spotNumber);

          return (
            <div
              key={spotNumber}
              className="aspect-square border-2 border-slate-200 rounded-lg flex flex-col items-center justify-center p-3 hover:border-slate-300 transition"
            >
              <div className="text-xs font-semibold text-slate-400 mb-2">#{spotNumber}</div>
              {sponsor ? (
                <a
                  href={sponsor.website_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 text-center group"
                >
                  <ExternalLink className="w-6 h-6 text-slate-600 group-hover:text-slate-900 transition" />
                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 line-clamp-2">
                    {sponsor.website_name}
                  </span>
                </a>
              ) : (
                <div className="text-center">
                  <div className="w-6 h-6 mx-auto mb-2 bg-slate-100 rounded" />
                  <span className="text-xs text-slate-400">Available</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showRequestForm && (
        <SponsorRequestForm
          onClose={() => setShowRequestForm(false)}
          onSubmit={fetchSponsors}
        />
      )}
    </div>
  );
}
