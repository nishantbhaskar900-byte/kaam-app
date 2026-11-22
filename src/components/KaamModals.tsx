'use client';

import React, { useState } from 'react';
import { INDIAN_CONSTITUTION_LANGUAGES, supabase } from '@/lib/supabase';

interface PermissionsModalProps {
  onComplete: () => void;
}

export function PermissionsModal({ onComplete }: PermissionsModalProps) {
  const [perms, setPerms] = useState({
    location: true,
    notifications: true,
    camera: true,
    contacts: true,
  });

  const handleContinue = () => {
    if (typeof window !== 'undefined') {
      if (perms.location && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }
      if (perms.notifications && 'Notification' in window) {
        Notification.requestPermission().catch(() => {});
      }
      localStorage.setItem('kaam_permissions_granted', 'true');
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-3">
          KAAM SETUP
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Allow Permissions for Instant Daily Work
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
          Just like instant delivery apps, Kaam needs these permissions to match nearby jobs and payments in real time.
        </p>

        <div className="space-y-3">
          {[
            { key: 'location', title: 'Precise Location', desc: 'Sort nearby daily jobs by distance & show arrival' },
            { key: 'notifications', title: 'Push Notifications', desc: 'Instant alerts for new jobs, messages & payments' },
            { key: 'camera', title: 'Camera & Photos', desc: 'Upload profile photo, stories & payment QR scanner' },
            { key: 'contacts', title: 'Contacts Access', desc: 'Connect with coworkers & refer friends easily' },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
            >
              <div className="pr-3">
                <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={perms[item.key as keyof typeof perms]}
                onChange={(e) =>
                  setPerms((prev) => ({ ...prev, [item.key]: e.target.checked }))
                }
                className="h-5 w-5 accent-amber-500 rounded"
              />
            </label>
          ))}
        </div>

        <button
          onClick={handleContinue}
          className="mt-6 w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm shadow-lg"
        >
          Allow & Continue
        </button>
      </div>
    </div>
  );
}

interface MenuModalProps {
  activeModal: 'settings' | 'privacy' | 'about' | 'refer' | null;
  onClose: () => void;
  profile: any;
  onUpdateProfile: (updates: any) => Promise<void>;
}

export function MenuModal({ activeModal, onClose, profile, onUpdateProfile }: MenuModalProps) {
  const [copied, setCopied] = useState(false);
  const [deviceMsg, setDeviceMsg] = useState('');

  if (!activeModal) return null;

  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}?ref=${profile?.id?.slice(0, 8) || 'NeedHub'}`
      : 'https://kaam.app/invite';

  const handleCopyInvite = () => {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLogoutOthers = async () => {
    await supabase.auth.signOut({ scope: 'others' });
    setDeviceMsg('Signed out from all other devices.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white capitalize">
            {activeModal === 'privacy' ? 'Privacy & Security' : activeModal === 'about' ? 'About NeedHub' : activeModal}
          </h3>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Close
          </button>
        </div>

        {activeModal === 'settings' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">Night Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Switch between Light and Dark theme</p>
              </div>
              <button
                type="button"
                onClick={() => {const nextDarkMode = !profile?.dark_mode;
                  onUpdateProfile({ dark_mode: nextDarkMode });
                  document.documentElement.classList.toggle('dark', nextDarkMode);
                 }}
                className={`w-14 h-8 rounded-full p-1 transition ${
                  profile?.dark_mode ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow transform transition ${
                    profile?.dark_mode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block font-bold text-sm text-slate-900 dark:text-white mb-2">
                App Language (Indian Constitution Schedule VIII)
              </label>
              <select
                value={profile?.language || 'English'}
                onChange={(e) => onUpdateProfile({ language: e.target.value })}
                className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium"
              >
                {INDIAN_CONSTITUTION_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeModal === 'privacy' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">Receive Messages</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Allow connected people to message you</p>
              </div>
              <input
                type="checkbox"
                checked={profile?.allow_messages ?? true}
                onChange={(e) => onUpdateProfile({ allow_messages: e.target.checked })}
                className="h-5 w-5 accent-amber-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Logged-in Devices</p>
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-emerald-600">● Current Device (Active Now)</p>
                <p className="mt-1 truncate">
                  {typeof navigator !== 'undefined' ? navigator.userAgent : 'Mobile / Web Browser'}
                </p>
              </div>
              <button
                onClick={handleLogoutOthers}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Log Out From All Other Devices
              </button>
              {deviceMsg && <p className="text-xs text-emerald-600 font-semibold">{deviceMsg}</p>}
            </div>
          </div>
        )}

        {activeModal === 'about' && (
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-extrabold text-base text-slate-900 dark:text-white">NeedHub — Daily Work & Network</p>
            <p>
              NeedHub combines professional work networking with instant daily gig hiring, real-time job scheduling, and direct worker-to-hirer payments across iOS and Android.
            </p>
            <p className="text-xs text-slate-400">Version 1.0.0 • Built for Daily Earners & Hirers</p>
          </div>
        )}

        {activeModal === 'refer' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Invite workers and hirers to join NeedHub and build your trusted daily work circle.
            </p>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 break-all">
              {inviteLink}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyInvite}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                {copied ? 'Link Copied!' : 'Copy Invite Link'}
              </button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={() =>
                    navigator.share({
                      title: 'Join me on Needhub',
                      text: 'Find and post daily work instantly on Needhub!',
                      url: inviteLink,
                    })
                  }
                  className="flex-1 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs"
                >
                  Share Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
