import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

function AppContent() {
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-red-900">Service Unavailable</h1>
          <p className="text-lg text-red-700">Emergency Shutdown</p>
        </div>

        <p className="text-red-600 text-base leading-relaxed">
          This service has been temporarily disabled due to an emergency. All functionality is currently unavailable.
        </p>

        <div className="pt-4 space-y-2">
          <p className="text-sm text-red-600">
            For urgent assistance, contact:
          </p>
          <a
            href="mailto:admin@candidteenpro.com"
            className="inline-block text-red-700 hover:text-red-900 font-semibold underline transition"
          >
            admin@candidteenpro.com
          </a>
        </div>
      </div>
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
