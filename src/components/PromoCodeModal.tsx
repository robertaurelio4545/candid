import { X, Tag } from 'lucide-react';
import { useState } from 'react';

type PromoCodeModalProps = {
  onClose: () => void;
  onSubmit: (promoCode: string) => void;
};

export default function PromoCodeModal({ onClose, onSubmit }: PromoCodeModalProps) {
  const [promoCode, setPromoCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(promoCode.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Upgrade to Pro</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-6 mb-6">
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-slate-900 mb-2">$12.99<span className="text-xl font-normal text-slate-600">/week</span></p>
            <p className="text-sm text-slate-600">Full access to all locked content</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="promoCode" className="block text-sm font-medium text-slate-700 mb-2">
              Have a promo code?
            </label>
            <input
              type="text"
              id="promoCode"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code (optional)"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent uppercase"
            />
            <p className="mt-2 text-xs text-slate-500">Enter a promo code to get a discount</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition font-medium shadow-md"
            >
              Continue to Checkout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
