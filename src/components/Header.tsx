import React, { useRef, useState, useEffect } from 'react';
import { BookOpenCheck, Calendar, Download, UploadCloud, Save, Trash2, SunMedium, Smartphone, Copy, Check, ExternalLink, X, Laptop } from 'lucide-react';

interface HeaderProps {
  selectedDate: string;
  onChangeDate: (date: string) => void;
  onClearAll: () => void;
  onExportExcel: () => void;
  onBackupJson: () => void;
  onRestoreJson: (file: File) => void;
  onOpenStartNewDay: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate,
  onChangeDate,
  onClearAll,
  onExportExcel,
  onBackupJson,
  onRestoreJson,
  onOpenStartNewDay
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (err) {
        console.error('Install error:', err);
        setIsInstallModalOpen(true);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href.split('?')[0];
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRestoreJson(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <BookOpenCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-stone-900 tracking-tight">
                Daily Cash Book & Sales Ledger
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Ledger</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 flex items-center gap-2">
              <span>Real-Time Sales & Cash Tracker</span>
              <span className="text-stone-300">•</span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                PKR (Rs.)
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
          {/* Quick Date Picker */}
          <div className="flex items-center gap-1.5 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            <input
              id="header-date-picker"
              type="date"
              value={selectedDate}
              onChange={e => onChangeDate(e.target.value)}
              className="bg-transparent text-stone-800 font-bold outline-hidden cursor-pointer"
            />
          </div>

          {/* Start New Day Button */}
          <button
            id="btn-header-start-new-day"
            type="button"
            onClick={onOpenStartNewDay}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Start new day ledger: roll over cash float while keeping all previous history intact"
          >
            <SunMedium className="w-3.5 h-3.5 text-amber-300" />
            <span>Start New Day</span>
          </button>

          {/* Export / Download Excel Button */}
          <button
            id="btn-header-download-excel"
            type="button"
            onClick={onExportExcel}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Download multi-tab Excel spreadsheet (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel (.xlsx)</span>
          </button>

          {/* Save / Download Backup JSON Button */}
          <button
            id="btn-header-backup-json"
            type="button"
            onClick={onBackupJson}
            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download backup file (.json)"
          >
            <Save className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">Backup (.json)</span>
          </button>

          {/* Restore Backup JSON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <button
            id="btn-header-restore-json"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restore ledger from a saved .json file"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Restore</span>
          </button>

          {/* Install / Direct Link Button */}
          <button
            id="btn-header-install-app"
            type="button"
            onClick={handleInstallClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isStandalone 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
            }`}
            title="Install as desktop/phone app or get direct standalone link to run without opening AI Studio"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-700" />
            <span>{isStandalone ? 'Installed (PWA)' : 'Run Without Studio'}</span>
          </button>

          {/* Clear Day */}
          <button
            id="btn-header-clear-day"
            type="button"
            onClick={onClearAll}
            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            title="Clear all entries for a fresh start"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Modal: Run Without Studio & PWA Installation Guide */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Run App Without Opening AI Studio</h3>
                  <p className="text-xs text-emerald-200">Use standalone web link or install on desktop / mobile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Option 1: Direct Link */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                    Option 1: Direct Standalone Web Link
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                  Open this link in any browser (Chrome, Edge, Safari, Firefox). You can bookmark it or set it as your browser homepage. You never need to open Google AI Studio.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href.split('?')[0]}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg text-stone-800 font-mono select-all outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Install as App (PWA) */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-amber-700" />
                    Option 2: Install as Desktop or Mobile App (PWA)
                  </span>
                </div>
                <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                  Installs like a native app on Windows, Mac, Android, or iPhone. It launches in its own dedicated window without browser bars and loads instantly offline.
                </p>

                {deferredPrompt ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer mb-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Daily Cash Book App Now</span>
                  </button>
                ) : (
                  <div className="space-y-2 text-xs text-stone-700 bg-white p-3 rounded-lg border border-amber-200 font-medium">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-amber-700 shrink-0">•</span>
                      <span><strong>On Windows PC / Mac (Chrome / Edge):</strong> Look for the <strong>Install</strong> or <strong>[+]</strong> icon in your browser address bar at the top right, or click the 3 dots menu ➔ <em>Install Daily Cash Book</em>.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-amber-700 shrink-0">•</span>
                      <span><strong>On Android Phone / Tablet:</strong> Tap the 3 dots menu <strong>(⋮)</strong> in Chrome ➔ Tap <em>"Install app"</em> or <em>"Add to Home screen"</em>.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-amber-700 shrink-0">•</span>
                      <span><strong>On iPhone / iPad (Safari):</strong> Tap the <strong>Share</strong> button at bottom ➔ Scroll down and tap <em>"Add to Home Screen"</em>.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 3: Run Locally with Node.js */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1">
                  Option 3: Run 100% Offline on Your Own Computer
                </span>
                <p className="text-xs text-stone-600 mb-2 leading-relaxed">
                  If you want to run completely offline on your shop counter PC without internet:
                </p>
                <div className="bg-stone-900 text-stone-100 p-2.5 rounded-lg text-[11px] font-mono leading-relaxed space-y-1">
                  <p className="text-stone-400"># 1. Download codebase, open terminal in folder:</p>
                  <p className="text-emerald-400">npm install</p>
                  <p className="text-emerald-400">npm run dev</p>
                  <p className="text-stone-400"># 2. Open in browser at: http://localhost:3000</p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
