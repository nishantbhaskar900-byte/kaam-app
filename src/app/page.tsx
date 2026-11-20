'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MenuModal, PermissionsModal } from '@/components/KaamModals';

const JOB_TYPES = [
  'Helper',
  'Driver',
  'Delivery Partner',
  'Electrician',
  'Plumber',
  'Loader / Packer',
  'Event Staff',
  'Cleaner',
  'Cook / Kitchen Helper',
  'Technician',
];

export default function KaamApp() {
  // Auth & Onboarding State
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');

  // Profile & Modals
  const [profile, setProfile] = useState<any>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuModal, setActiveMenuModal] = useState<'settings' | 'privacy' | 'about' | 'refer' | null>(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  // Profile Form Fields
  const [fullName, setFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [upiQrUrl, setUpiQrUrl] = useState('');

  // Main 3 Tabs: 'stories' (default) | 'post' | 'find'
  const [activeTab, setActiveTab] = useState<'stories' | 'post' | 'find'>('stories');

  // Data Collections
  const [stories, setStories] = useState<any[]>([]);
  const [newStoryText, setNewStoryText] = useState('');
  const [people, setPeople] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [chatText, setChatText] = useState('');

  // Post Job Form & Hirer Jobs
  const [showPostForm, setShowPostForm] = useState(false);
  const [jobType, setJobType] = useState('Helper');
  const [customJobType, setCustomJobType] = useState('');
  const [peopleNeeded, setPeopleNeeded] = useState(1);
  const [payPerPerson, setPayPerPerson] = useState('500');
  const [workDate, setWorkDate] = useState('');
  const [workTime, setWorkTime] = useState('09:00');
  const [durationHours, setDurationHours] = useState('4');
  const [locationName, setLocationName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [myPostedJobs, setMyPostedJobs] = useState<any[]>([]);
  const [selectedPostedJob, setSelectedPostedJob] = useState<any>(null);
  const [editJobDate, setEditJobDate] = useState('');
  const [editJobTime, setEditJobTime] = useState('');
  const [editJobDesc, setEditJobDesc] = useState('');

  // Find Job & Worker Scheduled Jobs
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'pay' | 'date' | 'period'>('distance');
  const [showWorkerScheduled, setShowWorkerScheduled] = useState(false);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [selectedAppliedApp, setSelectedAppliedApp] = useState<any>(null);

  // Completion, Scanner & Rating Flow
  const [completingApp, setCompletingApp] = useState<any>(null);
  const [paymentChoice, setPaymentChoice] = useState<'cash' | 'online' | null>(null);
  const [hirerPendingPaymentApp, setHirerPendingPaymentApp] = useState<any>(null);
  const [ratingValue, setRatingValue] = useState(5);

  // Initialize Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Load Profile & App Data when Logged In
  useEffect(() => {
    if (!session?.user) return;
    loadEverything(session.user.id);
  }, [session]);

  // Apply Dark Mode class
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', Boolean(profile?.dark_mode));
    }
  }, [profile?.dark_mode]);

  const loadEverything = async (userId: string) => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!prof || !prof.full_name) {
      setEditingProfile(true);
      setProfilePhone(prof?.phone || session?.user?.phone || '');
      setProfileEmail(prof?.email || session?.user?.email || '');
      if (typeof window !== 'undefined' && !localStorage.getItem('kaam_permissions_granted')) {
        setShowPermissions(true);
      }
    } else {
      setProfile(prof);
      setFullName(prof.full_name);
      setProfilePhone(prof.phone);
      setProfileEmail(prof.email);
      setAvatarUrl(prof.avatar_url || '');
      setUpiQrUrl(prof.upi_qr_url || '');
      if (typeof window !== 'undefined' && !localStorage.getItem('kaam_permissions_granted')) {
        setShowPermissions(true);
      }
    }

    const [
      { data: allProfiles },
      { data: allConns },
      { data: allStories },
      { data: jobsList },
      { data: appsList },
      { data: msgsList },
    ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('connections').select('*').or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
      supabase.from('stories').select('*, profiles(full_name, avatar_url)').order('created_at', { ascending: false }),
      supabase.from('jobs').select('*, profiles(full_name, phone, rating_avg)').order('created_at', { ascending: false }),
      supabase.from('applications').select('*, jobs(*, profiles(full_name, phone, email)), profiles(full_name, phone, upi_qr_url)'),
      supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: true }),
    ]);

    setPeople((allProfiles || []).filter((p) => p.id !== userId));
    setConnections(allConns || []);
    setStories(allStories || []);
    setAllJobs((jobsList || []).filter((j) => j.status === 'open'));
    setMyPostedJobs((jobsList || []).filter((j) => j.hirer_id === userId));
    setMyApplications((appsList || []).filter((a) => a.worker_id === userId));
    setMessages(msgsList || []);

    const pendingHirerApp = (appsList || []).find(
      (a) => a.jobs?.hirer_id === userId && a.status === 'completed_pending_payment'
    );
    if (pendingHirerApp) {
      setHirerPendingPaymentApp(pendingHirerApp);
    }
  };

  // AUTH HANDLERS (Login: Phone + OTP | Sign Up: Phone + Email + Password + OTP)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!phone.trim()) return setAuthError('Enter mobile number with country code (e.g. +919876543210)');

    if (authMode === 'signup') {
      if (!email.trim() || !password.trim()) {
        return setAuthError('Enter phone number, email, and password to sign up.');
      }
      const { error } = await supabase.auth.signUp({
        phone: phone.trim(),
        password: password.trim(),
        options: { data: { email: email.trim() } },
      });
      if (error) return setAuthError(error.message);
      setOtpSent(true);
    } else {
      const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
      if (error) return setAuthError(error.message);
      setOtpSent(true);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otp.trim(),
      type: 'sms',
    });
    if (error) return setAuthError(error.message);
    if (data.user && email.trim()) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        phone: phone.trim(),
        email: email.trim(),
      });
    }
  };

  // IMAGE UPLOAD HELPER (Profile Picture & UPI QR Scanner)
  const handleFileUpload = async (file: File, folder: 'avatars' | 'scanners') => {
    if (!session?.user) return '';
    const ext = file.name.split('.').pop();
    const path = `${folder}/${session.user.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('kaam-media').upload(path, file, { upsert: true });
    if (error) {
      alert('Upload failed: ' + error.message);
      return '';
    }
    const { data } = supabase.storage.from('kaam-media').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    const payload = {
      id: session.user.id,
      full_name: fullName.trim(),
      phone: profilePhone.trim(),
      email: profileEmail.trim(),
      avatar_url: avatarUrl,
      upi_qr_url: upiQrUrl,
    };
    const { data, error } = await supabase.from('profiles').upsert(payload).select().single();
    if (error) return alert(error.message);
    setProfile(data);
    setEditingProfile(false);
    loadEverything(session.user.id);
  };

  const handleUpdateProfileField = async (updates: any) => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();
    if (data) setProfile(data);
  };

  // CONNECTED PEOPLE & STORIES
  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    if (session?.user?.id) ids.add(session.user.id);
    connections.forEach((c) => {
      if (c.status === 'accepted') {
        ids.add(c.requester_id);
        ids.add(c.receiver_id);
      }
    });
    return ids;
  }, [connections, session]);

  const visibleStories = useMemo(
    () => stories.filter((s) => connectedIds.has(s.user_id)),
    [stories, connectedIds]
  );

  const handleConnect = async (targetUserId: string) => {
    if (!session?.user) return;
    await supabase.from('connections').insert({
      requester_id: session.user.id,
      receiver_id: targetUserId,
      status: 'accepted',
    });
    loadEverything(session.user.id);
  };

  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryText.trim() || !session?.user) return;
    await supabase.from('stories').insert({
      user_id: session.user.id,
      content: newStoryText.trim(),
    });
    setNewStoryText('');
    loadEverything(session.user.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !selectedChatUser || !session?.user) return;
    await supabase.from('messages').insert({
      sender_id: session.user.id,
      receiver_id: selectedChatUser.id,
      body: chatText.trim(),
    });
    setChatText('');
    loadEverything(session.user.id);
  };

  // POST NEW JOB, EDIT & DELETE
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    const finalType = customJobType.trim() || jobType;
    const { error } = await supabase.from('jobs').insert({
      hirer_id: session.user.id,
      job_type: finalType,
      people_needed: Number(peopleNeeded) || 1,
      pay_per_person: Number(payPerPerson) || 0,
      work_date: workDate,
      work_time: workTime,
      duration_hours: Number(durationHours) || 4,
      location_name: locationName.trim() || 'Nearby Area',
      distance_km: Number((Math.random() * 6 + 0.5).toFixed(1)),
      description: jobDescription.trim(),
    });
    if (error) return alert(error.message);
    setShowPostForm(false);
    setCustomJobType('');
    setJobDescription('');
    loadEverything(session.user.id);
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostedJob) return;
    await supabase
      .from('jobs')
      .update({
        work_date: editJobDate,
        work_time: editJobTime,
        description: editJobDesc,
      })
      .eq('id', selectedPostedJob.id);
    setSelectedPostedJob(null);
    loadEverything(session.user.id);
  };

  const handleDeleteJob = async (jobId: string) => {
    await supabase.from('jobs').delete().eq('id', jobId);
    setSelectedPostedJob(null);
    loadEverything(session.user.id);
  };

  // FIND JOB: SORTING & APPLYING
  const sortedJobs = useMemo(() => {
    const list = [...allJobs];
    if (sortBy === 'distance') return list.sort((a, b) => a.distance_km - b.distance_km);
    if (sortBy === 'pay') return list.sort((a, b) => b.pay_per_person - a.pay_per_person);
    if (sortBy === 'date') return list.sort((a, b) => a.work_date.localeCompare(b.work_date));
    if (sortBy === 'period') return list.sort((a, b) => a.duration_hours - b.duration_hours);
    return list;
  }, [allJobs, sortBy]);

  const handleApplyJob = async (jobId: string) => {
    if (!session?.user) return;
    const { error } = await supabase.from('applications').insert({
      job_id: jobId,
      worker_id: session.user.id,
      status: 'scheduled',
    });
    if (error) return alert('Already applied or unable to apply.');
    alert('Job added to your Scheduled Jobs!');
    loadEverything(session.user.id);
  };

  const handleCancelApplication = async (appId: string) => {
    await supabase.from('applications').update({ status: 'cancelled' }).eq('id', appId);
    setSelectedAppliedApp(null);
    loadEverything(session.user.id);
  };

  // WORKER COMPLETES JOB -> CASH OR ONLINE SCANNER -> NOTIFIES HIRER
  const handleFinalizeCompletion = async () => {
    if (!completingApp || !paymentChoice) return;
    await supabase
      .from('applications')
      .update({
        status: 'completed_pending_payment',
        payment_method: paymentChoice,
      })
      .eq('id', completingApp.id);
    setCompletingApp(null);
    setPaymentChoice(null);
    setSelectedAppliedApp(null);
    loadEverything(session.user.id);
  };

  // HIRER CONFIRMS PAYMENT & RATES WORKER
  const handleHirerConfirmAndRate = async () => {
    if (!hirerPendingPaymentApp) return;
    await supabase
      .from('applications')
      .update({ status: 'paid', rating_given: ratingValue })
      .eq('id', hirerPendingPaymentApp.id);
    setHirerPendingPaymentApp(null);
    loadEverything(session.user.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-amber-400 font-extrabold text-2xl">
        KAAM...
      </div>
    );
  }

  // 1. LOGIN / SIGN UP SCREEN
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center px-5 py-10">
        <div className="max-w-md w-full mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center">
              K
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Kaam</h1>
              <p className="text-xs text-slate-400">Daily Work • Instant Orders • Trusted Network</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-2xl my-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setOtpSent(false);
                setAuthError('');
              }}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
                authMode === 'login' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setOtpSent(false);
                setAuthError('');
              }}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
                authMode === 'signup' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              Sign Up
            </button>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm"
                />
              </div>

              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Email ID</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm"
                    />
                  </div>
                </>
              )}

              {authError && <p className="text-xs text-rose-400 font-semibold">{authError}</p>}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm"
              >
                Send OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-xs text-slate-300">
                Enter the 6-digit OTP sent to <span className="font-bold text-amber-400">{phone}</span>
              </p>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-center tracking-widest text-lg font-bold"
              />
              {authError && <p className="text-xs text-rose-400 font-semibold">{authError}</p>}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-extrabold text-sm"
              >
                Verify OTP & Enter Kaam
              </button>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="w-full text-xs text-slate-400 underline"
              >
                Change phone number
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 2. FIRST-TIME PROFILE CREATION OR PROFILE EDIT SCREEN
  if (editingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-5">
        {showPermissions && <PermissionsModal onComplete={() => setShowPermissions(false)} />}

        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-black mb-1">Your Kaam Profile</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Complete your details to post daily jobs, connect, and receive payments.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">Profile Picture (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await handleFileUpload(file, 'avatars');
                    if (url) setAvatarUrl(url);
                  }
                }}
                className="w-full text-xs"
              />
              {avatarUrl && (
                <img src={avatarUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover mt-2 border" />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Mobile Number</label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                required
                placeholder="+91 9876543210"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Email ID</label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                Payment UPI QR Scanner Image (Shown to hirer when taking online payment)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await handleFileUpload(file, 'scanners');
                    if (url) setUpiQrUrl(url);
                  }
                }}
                className="w-full text-xs"
              />
              {upiQrUrl && <p className="text-xs text-emerald-600 font-semibold mt-1">✓ QR Scanner uploaded</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-extrabold text-sm"
              >
                Save Profile
              </button>
              {profile?.full_name && (
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="px-4 py-3.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 3. MAIN KAAM APPLICATION
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white pb-24">
      {showPermissions && <PermissionsModal onComplete={() => setShowPermissions(false)} />}

      {/* TOP HEADER BAR: Profile Pic (Left) | Kaam Logo (Center) | Messages + 3 Dots (Right) */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setEditingProfile(true)}
          title="Edit Profile"
          className="flex items-center gap-2"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-9 h-9 rounded-full object-cover border-2 border-amber-500"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center">
              {profile?.full_name?.[0]?.toUpperCase() || 'K'}
            </div>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-sm">K</span>
          <span className="font-black text-lg tracking-tight">Kaam</span>
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowMessagesModal(true)}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
          >
            💬 Messages
          </button>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-lg flex items-center justify-center"
            aria-label="More options"
          >
            ⋮
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-52 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-40 text-sm font-semibold">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setActiveMenuModal('settings');
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setActiveMenuModal('privacy');
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                🔒 Privacy & Security
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setActiveMenuModal('about');
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ℹ️ About App
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setActiveMenuModal('refer');
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                🎁 Refer
              </button>
              <hr className="my-1 border-slate-200 dark:border-slate-800" />
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await supabase.auth.signOut();
                }}
                className="w-full text-left px-4 py-2.5 text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                🚪 Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 3 MAIN OPTIONS NAVIGATION (Stories opens by default) */}
      <nav className="max-w-2xl mx-auto px-4 pt-3">
        <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('stories')}
            className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'stories' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Stories
          </button>
          <button
            onClick={() => setActiveTab('post')}
            className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'post' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Post Job
          </button>
          <button
            onClick={() => setActiveTab('find')}
            className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'find' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Find Job & People
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT BODY */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* TAB 1: STORIES (DEFAULT) */}
        {activeTab === 'stories' && (
          <div className="space-y-4">
            <form
              onSubmit={handlePostStory}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                Share Daily Work Update / Story
              </p>
              <textarea
                rows={2}
                value={newStoryText}
                onChange={(e) => setNewStoryText(e.target.value)}
                placeholder="Share what work you completed today or availability..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs"
              >
                Post Story
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-extrabold">Stories From Your Connections</h3>
              {visibleStories.length === 0 ? (
                <p className="text-xs text-slate-500 bg-white dark:bg-slate-900 p-4 rounded-2xl">
                  No stories yet. Connect with people in &ldquo;Find Job & People&rdquo; to see their updates!
                </p>
              ) : (
                visibleStories.map((story) => (
                  <div
                    key={story.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                        {story.profiles?.full_name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{story.profiles?.full_name || 'Kaam Member'}</p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(story.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{story.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: POST JOB */}
        {activeTab === 'post' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowPostForm((prev) => !prev)}
              className="w-full py-4 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm shadow-md"
            >
              {showPostForm ? '✕ Close Post New Job Form' : '+ Post New Job'}
            </button>

            {showPostForm && (
              <form
                onSubmit={handleCreateJob}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <h3 className="font-extrabold text-base">Create Daily Job Order</h3>

                <div>
                  <label className="block text-xs font-bold mb-1">Job Type (Select or Type Custom)</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm mb-2"
                  >
                    {JOB_TYPES.map((jt) => (
                      <option key={jt} value={jt}>
                        {jt}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or type custom job role..."
                    value={customJobType}
                    onChange={(e) => setCustomJobType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Number of People</label>
                    <input
                      type="number"
                      min={1}
                      value={peopleNeeded}
                      onChange={(e) => setPeopleNeeded(Number(e.target.value))}
                      required
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Pay Per Person (₹)</label>
                    <input
                      type="number"
                      min={50}
                      value={payPerPerson}
                      onChange={(e) => setPayPerPerson(e.target.value)}
                      required
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Date</label>
                    <input
                      type="date"
                      value={workDate}
                      onChange={(e) => setWorkDate(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Time</label>
                    <input
                      type="time"
                      value={workTime}
                      onChange={(e) => setWorkTime(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Location / Landmark</label>
                  <input
                    type="text"
                    placeholder="Area, road, or landmark"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Job Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe tasks, tools needed, reporting instructions..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-extrabold text-sm"
                >
                  Publish Job Now
                </button>
              </form>
            )}

            {/* YOUR SCHEDULED JOBS (Posted by You -> Click to Edit Date/Time/Description or Delete) */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold">Your Scheduled Jobs (Posted by You)</h3>
              {myPostedJobs.length === 0 ? (
                <p className="text-xs text-slate-500 bg-white dark:bg-slate-900 p-4 rounded-2xl">
                  You haven&apos;t posted any jobs yet.
                </p>
              ) : (
                myPostedJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => {
                      setSelectedPostedJob(job);
                      setEditJobDate(job.work_date);
                      setEditJobTime(job.work_time);
                      setEditJobDesc(job.description);
                    }}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-amber-500"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold text-sm">{job.job_type}</p>
                        <p className="text-xs text-slate-500">
                          {job.work_date} at {job.work_time} • {job.people_needed} person(s)
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                        ₹{job.pay_per_person}/person
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Tap to edit date, time, description or delete</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FIND JOB & PEOPLE */}
        {activeTab === 'find' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowWorkerScheduled((prev) => !prev)}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-between"
            >
              <span>📅 Scheduled Jobs (Your Applied Jobs: {myApplications.filter((a) => a.status === 'scheduled').length})</span>
              <span>{showWorkerScheduled ? 'Hide ▲' : 'Open ▼'}</span>
            </button>

            {showWorkerScheduled && (
              <div className="space-y-2.5 bg-amber-50/70 dark:bg-slate-900/80 p-3 rounded-2xl border border-amber-200 dark:border-slate-800">
                {myApplications.filter((a) => a.status === 'scheduled').length === 0 ? (
                  <p className="text-xs text-slate-500">No active scheduled jobs.</p>
                ) : (
                  myApplications
                    .filter((a) => a.status === 'scheduled')
                    .map((app) => (
                      <div
                        key={app.id}
                        onClick={() => setSelectedAppliedApp(app)}
                        className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        <div className="flex justify-between">
                          <p className="font-bold text-sm">{app.jobs?.job_type}</p>
                          <p className="font-extrabold text-xs text-emerald-600">₹{app.jobs?.pay_per_person}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {app.jobs?.work_date} • {app.jobs?.work_time} • {app.jobs?.location_name}
                        </p>
                        <p className="text-[11px] text-amber-600 font-bold mt-1">
                          Tap for full details, Complete Job, or Cancel
                        </p>
                      </div>
                    ))
                )}
              </div>
            )}

            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-extrabold">Sort By:</span>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: 'distance', label: 'Distance' },
                  { id: 'pay', label: 'Pay' },
                  { id: 'date', label: 'Date of Work' },
                  { id: 'period', label: 'Time Period' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                      sortBy === opt.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-extrabold">Available Daily Jobs</h3>
              {sortedJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-base">{job.job_type}</h4>
                      <p className="text-xs text-slate-500">
                        📍 {job.location_name} ({job.distance_km} km) • ⏱ {job.duration_hours} hrs
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                      ₹{job.pay_per_person}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{job.description}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400">
                      📅 {job.work_date} at {job.work_time} • {job.people_needed} needed
                    </span>
                    {job.hirer_id !== session.user.id && (
                      <button
                        onClick={() => handleApplyJob(job.id)}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs"
                      >
                        Accept / Apply
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 pt-2">
              <h3 className="text-sm font-extrabold">People on Kaam (Connect for Stories & Chat)</h3>
              {people.map((person) => {
                const isConnected = connectedIds.has(person.id);
                return (
                  <div
                    key={person.id}
                    className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-sm">{person.full_name || 'Kaam User'}</p>
                      <p className="text-xs text-slate-400">{person.phone}</p>
                    </div>
                    {isConnected ? (
                      <span className="text-xs font-bold text-emerald-600">✓ Connected</span>
                    ) : (
                      <button
                        onClick={() => handleConnect(person.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold"
                      >
                        + Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: HIRER EDIT / DELETE POSTED JOB */}
      {selectedPostedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleUpdateJob}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4"
          >
            <h3 className="font-black text-lg">Edit Job: {selectedPostedJob.job_type}</h3>
            <div>
              <label className="block text-xs font-bold mb-1">Date</label>
              <input
                type="date"
                value={editJobDate}
                onChange={(e) => setEditJobDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Time</label>
              <input
                type="time"
                value={editJobTime}
                onChange={(e) => setEditJobTime(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea
                rows={3}
                value={editJobDesc}
                onChange={(e) => setEditJobDesc(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => handleDeleteJob(selectedPostedJob.id)}
                className="px-4 py-3 rounded-xl bg-rose-600 text-white font-extrabold text-xs"
              >
                Delete Job
              </button>
              <button
                type="button"
                onClick={() => setSelectedPostedJob(null)}
                className="px-3 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: WORKER APPLIED JOB FULL DETAILS + COMPLETE / CANCEL */}
      {selectedAppliedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-3">
            <h3 className="font-black text-lg">{selectedAppliedApp.jobs?.job_type}</h3>
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <p><strong>Pay:</strong> ₹{selectedAppliedApp.jobs?.pay_per_person}</p>
              <p><strong>Location:</strong> {selectedAppliedApp.jobs?.location_name}</p>
              <p><strong>Number of People:</strong> {selectedAppliedApp.jobs?.people_needed}</p>
              <p><strong>Date & Time:</strong> {selectedAppliedApp.jobs?.work_date} at {selectedAppliedApp.jobs?.work_time}</p>
              <p><strong>Hirer Name:</strong> {selectedAppliedApp.jobs?.profiles?.full_name}</p>
              <p><strong>Hirer Contact:</strong> {selectedAppliedApp.jobs?.profiles?.phone}</p>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => {
                  setCompletingApp(selectedAppliedApp);
                  setPaymentChoice(null);
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-extrabold text-xs"
              >
                ✓ Job Completed
              </button>
              <button
                onClick={() => handleCancelApplication(selectedAppliedApp.id)}
                className="px-4 py-3 rounded-xl bg-rose-600 text-white font-extrabold text-xs"
              >
                Cancel Job
              </button>
              <button
                onClick={() => setSelectedAppliedApp(null)}
                className="px-3 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: JOB COMPLETED -> PAY SHOWN + CASH OR ONLINE SCANNER */}
      {completingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 text-center space-y-4">
            <h3 className="font-black text-xl">Job Completed!</h3>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-slate-500">Your Total Pay</p>
              <p className="text-3xl font-black text-emerald-600">
                ₹{completingApp.jobs?.pay_per_person}
              </p>
            </div>

            <p className="text-xs font-bold">How would you like to receive payment?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentChoice('cash')}
                className={`py-3 rounded-2xl font-extrabold text-xs border ${
                  paymentChoice === 'cash'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                💵 Cash
              </button>
              <button
                onClick={() => setPaymentChoice('online')}
                className={`py-3 rounded-2xl font-extrabold text-xs border ${
                  paymentChoice === 'online'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                📱 Online Scanner
              </button>
            </div>

            {paymentChoice === 'online' && (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 space-y-2">
                <p className="text-xs font-bold">Show this scanner to the hirer to receive payment in your bank account:</p>
                {profile?.upi_qr_url ? (
                  <img src={profile.upi_qr_url} alt="Payment Scanner" className="w-48 h-48 mx-auto rounded-xl object-contain bg-white p-2" />
                ) : (
                  <div className="w-48 h-48 mx-auto rounded-xl bg-white text-slate-900 flex flex-col items-center justify-center p-3 text-xs font-bold">
                    <span>UPI / Bank QR</span>
                    <span className="text-[11px] text-slate-500 mt-1">{profile?.phone}</span>
                  </div>
                )}
              </div>
            )}

            {paymentChoice && (
              <button
                onClick={handleFinalizeCompletion}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm"
              >
                Confirm & Notify Hirer
              </button>
            )}
          </div>
        </div>
      )}

      {/* POP-UP TO HIRER: JOB COMPLETED -> AMOUNT TO PAY -> RATE WORKER */}
      {hirerPendingPaymentApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 text-center space-y-4">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold">
              JOB COMPLETED ALERT
            </span>
            <h3 className="font-black text-xl">
              {hirerPendingPaymentApp.profiles?.full_name || 'Worker'} completed {hirerPendingPaymentApp.jobs?.job_type}
            </h3>
            <p className="text-sm">
              Amount to Pay ({hirerPendingPaymentApp.payment_method?.toUpperCase()}):
            </p>
            <p className="text-3xl font-black text-emerald-600">
              ₹{hirerPendingPaymentApp.jobs?.pay_per_person}
            </p>

            <div className="pt-2">
              <p className="text-xs font-bold mb-2">Rate Worker After Payment (1 to 5 Stars)</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    className={`w-10 h-10 rounded-xl font-black text-sm ${
                      ratingValue >= star ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleHirerConfirmAndRate}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm"
            >
              Payment Done & Submit Rating
            </button>
          </div>
        </div>
      )}

      {/* MESSAGES MODAL (Connected People Only) */}
      {showMessagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base">Messages (Connected People)</h3>
              <button
                onClick={() => {
                  setShowMessagesModal(false);
                  setSelectedChatUser(null);
                }}
                className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                Close
              </button>
            </div>

            {!selectedChatUser ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {people.filter((p) => connectedIds.has(p.id) && p.allow_messages !== false).length === 0 ? (
                  <p className="text-xs text-slate-500">Connect with people first to message them.</p>
                ) : (
                  people
                    .filter((p) => connectedIds.has(p.id) && p.allow_messages !== false)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedChatUser(p)}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-sm"
                      >
                        {p.full_name}
                      </button>
                    ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedChatUser(null)}
                  className="text-xs text-amber-600 font-bold"
                >
                  ← Back to Connections
                </button>
                <div className="h-52 overflow-y-auto space-y-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  {messages
                    .filter(
                      (m) =>
                        (m.sender_id === session.user.id && m.receiver_id === selectedChatUser.id) ||
                        (m.sender_id === selectedChatUser.id && m.receiver_id === session.user.id)
                    )
                    .map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl text-xs max-w-[80%] ${
                          m.sender_id === session.user.id
                            ? 'ml-auto bg-amber-500 text-slate-950 font-semibold'
                            : 'bg-white dark:bg-slate-700'
                        }`}
                      >
                        {m.body}
                      </div>
                    ))}
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS / PRIVACY / ABOUT / REFER MODAL */}
      <MenuModal
        activeModal={activeMenuModal}
        onClose={() => setActiveMenuModal(null)}
        profile={profile}
        onUpdateProfile={handleUpdateProfileField}
      />
    </div>
  );
}
