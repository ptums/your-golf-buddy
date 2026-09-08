import SyncSettings from "@/components/SyncSettings";

export default function Settings() {
  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Settings</h1>
          <p className="text-slate-600">Manage your Golf Buddy preferences</p>
        </div>

        <SyncSettings />

        {/* Additional settings can be added here */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-amber-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            App Information
          </h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>Version: 1.0.0</p>
            <p>Data Storage: Local (IndexedDB)</p>
            <p>Offline Capable: Yes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
