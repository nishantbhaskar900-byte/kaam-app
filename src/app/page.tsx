'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MenuModal, PermissionsModal } from '@/components/KaamModals';
import RegisterProviderForm from '@/components/RegisterProviderform';
import ProviderSuggestions from '@/components/ProviderSuggestions';
import WorkerJobRequestsPanel from '@/components/WorkerJobRequestsPanel';

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

type AppNotification = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
};

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
  const [providerRefreshKey, setProviderRefreshKey] = useState(0);
  const [showRegisterWorkCard, setShowRegisterWorkCard] = useState(false);
  const [postSearchQuery, setPostSearchQuery] = useState('');

  // Profile, Notifications & Modals
  const [profile, setProfile] = useState<any>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [profileSubView, setProfileSubView] = useState<'hub' | 'details' | 'rating'>('hub');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [activeMenuModal, setActiveMenuModal] = useState<'settings' | 'privacy' | 'about' | 'refer' | null>(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const qrInputRef = useRef<HTMLInputElement | null>(null);

  // Profile Form Fields
  const [fullName, setFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
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

  useEffect(() => {
    if (!session?.user) return;
    loadEverything(session.user.id);
  }, [session]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', Boolean(profile?.dark_mode));
    }
  }, [profile?.dark_mode]);

  const syncProfileFormState = (profData: any, fallbackUser?: any) => {
    setFullName(profData?.full_name || '');
    setProfilePhone(profData?.phone || fallbackUser?.phone || '');
    setProfileEmail(profData?.email || fallbackUser?.email || '');
    setGender(profData?.gender || '');
    setDateOfBirth(profData?.date_of_birth || '');
    setEmergencyContact(profData?.emergency_contact || '');
    setAvatarUrl(profData?.avatar_url || '');
    setUpiQrUrl(profData?.upi_qr_url || '');
    setHasProfileChanges(false);
    setShowPhotoMenu(false);
  };

  const loadEverything = async (userId: string) => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!prof || !prof.full_name) {
      setProfile(prof || null);
      syncProfileFormState(prof, session?.user);
      setShowProfileScreen(true);
      setProfileSubView('details');
      setIsEditingDetails(true);
      setHasProfileChanges(true);
      if (typeof window !== 'undefined' && !localStorage.getItem('kaam_permissions_granted')) {
        setShowPermissions(true);
      }
    } else {
      setProfile(prof);
      syncProfileFormState(prof, session?.user);
      setShowProfileScreen(false);
      setProfileSubView('hub');
      setIsEditingDetails(false);
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

  const [notifTimestamp, setNotifTimestamp] = useState('');

useEffect(() => {
  setNotifTimestamp(new Date().toLocaleString());
}, [session, profile, myApplications]);
  // BUILD LINE-WISE NOTIFICATIONS WITH DATE & TIME
  const notificationsList = useMemo<AppNotification[]>(() => {
    const items: AppNotification[] = [];
    const nowLabel = notifTimestamp;

    const missingFields: string[] = [];
    if (!profile?.email && !profileEmail) missingFields.push('Email');
    if (!profile?.gender && !gender) missingFields.push('Gender');
    if (!profile?.date_of_birth && !dateOfBirth) missingFields.push('Date of Birth');
    if (!profile?.emergency_contact && !emergencyContact) missingFields.push('Emergency Contact');
    if (!profile?.upi_qr_url && !upiQrUrl) missingFields.push('Payment UPI QR');

    if (missingFields.length > 0) {
      items.push({
        id: 'notif-profile-remaining',
        title: 'Profile Information Remaining',
        detail: `To be saved in profile: ${missingFields.join(', ')}.`,
        timestamp: nowLabel,
      });
    }

    items.push({
      id: 'notif-offer-priority',
      title: 'Special Work Offer',
      detail: 'Register your Work Card to appear higher in local area & category searches.',
      timestamp: nowLabel,
    });

    items.push({
      id: 'notif-offer-referral',
      title: 'Referral & Daily Work Update',
      detail: 'Invite fellow workers or hirers from Refer and grow your local work network.',
      timestamp: nowLabel,
    });

    myApplications
      .filter((a) => a.status === 'scheduled' || a.status === 'completed_pending_payment')
      .slice(0, 5)
      .forEach((app) => {
        items.push({
          id: `notif-app-${app.id}`,
          title: `Job Update: ${app.jobs?.job_type || 'Daily Job'}`,
          detail: `Status: ${app.status} • Pay: ₹${app.jobs?.pay_per_person || 0} • ${app.jobs?.location_name || ''}`,
          timestamp: app.created_at ? new Date(app.created_at).toLocaleString() : nowLabel,
        });
      });

    return items.filter((n) => !dismissedNotificationIds.includes(n.id));
  }, [
    notifTimestamp,
    profile,
    profileEmail,
    gender,
    dateOfBirth,
    emergencyContact,
    upiQrUrl,
    myApplications,
    dismissedNotificationIds,
  ]);

  // AUTH HANDLERS
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

  // IMAGE UPLOAD HELPER
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

  const persistProfilePayload = async (overrideAvatar?: string) => {
    if (!session?.user) return;
    const finalAvatar = overrideAvatar !== undefined ? overrideAvatar : avatarUrl;
    const payload: any = {
      id: session.user.id,
      full_name: fullName.trim(),
      phone: profilePhone.trim(),
      email: profileEmail.trim() || null,
      avatar_url: finalAvatar || null,
      upi_qr_url: upiQrUrl || null,
    };
    if (gender) payload.gender = gender;
    if (dateOfBirth) payload.date_of_birth = dateOfBirth;
    if (emergencyContact) payload.emergency_contact = emergencyContact;

    const { data, error } = await supabase.from('profiles').upsert(payload).select().single();
    if (error) {
      // Fallback if optional columns aren't in DB table yet
      const basePayload = {
        id: session.user.id,
        full_name: fullName.trim(),
        phone: profilePhone.trim(),
        email: profileEmail.trim() || null,
        avatar_url: finalAvatar || null,
        upi_qr_url: upiQrUrl || null,
      };
      const fallbackRes = await supabase.from('profiles').upsert(basePayload).select().single();
      if (fallbackRes.error) {
        alert(fallbackRes.error.message);
        return;
      }
      setProfile({
        ...fallbackRes.data,
        gender: gender || fallbackRes.data?.gender || '',
        date_of_birth: dateOfBirth || fallbackRes.data?.date_of_birth || '',
        emergency_contact: emergencyContact || fallbackRes.data?.emergency_contact || '',
      });
    } else {
      setProfile(data);
    }

    setHasProfileChanges(false);
    setIsEditingDetails(false);
    if (!fullName.trim()) return;
    setShowProfileScreen(false);
    loadEverything(session.user.id);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !hasProfileChanges) return;
    await persistProfilePayload();
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
      receiver_id: String(selectedChatUser.id),
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
      <div className="min-h-screen flex items-center justify-center bg-white text-blue-600 dark:bg-transparent dark:text-sky-400 font-extrabold text-2xl">
        NeedHub...
      </div>
    );
  }

  // 1. LOGIN / SIGN UP SCREEN
  if (!session) {
    return (
      <div className="min-h-screen bg-white text-slate-900 dark:bg-transparent dark:text-slate-50 flex flex-col justify-center px-5 py-10">
        <div className="max-w-md w-full mx-auto bg-slate-50 border border-slate-200 dark:bg-[#0f172a]/90 dark:border-sky-500/20 rounded-3xl p-7 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 dark:bg-sky-500 overflow-hidden shrink-0">
              <img src="/needhub-logo.png" alt="NeedHub" className="w-full h-full object-cover rounded-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">NeedHub</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">Daily Work • Instant Orders • Trusted Network</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-2xl my-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setOtpSent(false);
                setAuthError('');
              }}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
                authMode === 'login' ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
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
                authMode === 'signup' ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
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
                className="w-full py-3.5 rounded-2xl bg-blue-600 dark:bg-sky-500 hover:bg-blue-700 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-extrabold text-sm"
              >
                Send OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-xs text-slate-300">
                Enter the 6-digit OTP sent to <span className="font-bold text-blue-600 dark:text-sky-400">{phone}</span>
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
                className="w-full py-3.5 rounded-2xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-extrabold text-sm"
              >
                Verify OTP & Enter NeedHub
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

  const isFirstTimeSetup = !profile?.full_name;
  const currentRating = Number(profile?.rating_avg || 4.92).toFixed(2);
  const memberSinceText = profile?.created_at
    ? new Date(profile.created_at).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : 'November 2026';

  // 2. PROFILE SCREEN (First-Time Basic Setup | Profile Hub | Full Profile Details | Rating)
  if (showProfileScreen) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-5">
        {showPermissions && <PermissionsModal onComplete={() => setShowPermissions(false)} />}

        {/* HIDDEN INPUTS FOR CIRCULAR PHOTO PICKER & QR */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = await handleFileUpload(file, 'avatars');
              if (url) {
                setAvatarUrl(url);
                setHasProfileChanges(true);
                if (!isFirstTimeSetup) {
                  await persistProfilePayload(url);
                }
              }
            }
            setShowPhotoMenu(false);
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = await handleFileUpload(file, 'avatars');
              if (url) {
                setAvatarUrl(url);
                setHasProfileChanges(true);
                if (!isFirstTimeSetup) {
                  await persistProfilePayload(url);
                }
              }
            }
            setShowPhotoMenu(false);
          }}
        />
        <input
          ref={qrInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = await handleFileUpload(file, 'scanners');
              if (url) {
                setUpiQrUrl(url);
                setHasProfileChanges(true);
              }
            }
          }}
        />

        {/* FIRST-TIME MINIMAL BASIC SETUP */}
        {isFirstTimeSetup ? (
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div>
              <h2 className="text-xl font-black">Create Your Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enter basic details to get started. More details can be added later from Profile.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setHasProfileChanges(true);
                  }}
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
                  onChange={(e) => {
                    setProfilePhone(e.target.value);
                    setHasProfileChanges(true);
                  }}
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
                  onChange={(e) => {
                    setProfileEmail(e.target.value);
                    setHasProfileChanges(true);
                  }}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                />
              </div>

              {hasProfileChanges && (
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-extrabold text-sm"
                >
                  Save Profile
                </button>
              )}
            </form>
          </div>
        ) : profileSubView === 'hub' ? (
          /* PROFILE HUB (Photo 1 Layout: Circle + Change Language, Name & Phone Row, My Rating, Work Card, Settings, Privacy, Refer, About Us, Log Out) */
          <div className="max-w-md mx-auto space-y-4">
            {/* TOP BAR: Circular Profile Picture (Left) + Change Language (Right) */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPhotoMenu((prev) => !prev)}
                  className="w-12 h-12 rounded-full border-2 border-blue-600 dark:border-sky-400 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0"
                  aria-label="Profile picture options"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-black text-blue-600 dark:text-sky-400">
                      {fullName?.[0]?.toUpperCase() || 'P'}
                    </span>
                  )}
                </button>
                <span className="text-lg font-black">Profile</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveMenuModal('settings')}
                className="px-3.5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-amber-400/60 text-xs font-extrabold flex items-center gap-1.5"
              >
                <span>अ/A</span>
                <span>Change Language</span>
              </button>

              {showPhotoMenu && (
                <div className="absolute left-4 top-16 w-60 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 shadow-2xl space-y-1 z-30">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Choose Picture from Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Take Photo with Camera
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        setAvatarUrl('');
                        setShowPhotoMenu(false);
                        await persistProfilePayload('');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Delete Photo
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* NAME & PHONE CARD (No profile picture on left of name; clicking opens Photo 2 full profile details) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  syncProfileFormState(profile, session.user);
                  setIsEditingDetails(false);
                  setHasProfileChanges(false);
                  setProfileSubView('details');
                }}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                    👤
                  </div>
                  <div>
                    <p className="font-extrabold text-sm">{profile?.full_name || fullName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {profile?.phone || profilePhone}
                    </p>
                  </div>
                </div>
                <span className="text-slate-400 font-bold text-base">&gt;</span>
              </button>

              {/* MY RATING ROW */}
              <button
                type="button"
                onClick={() => setProfileSubView('rating')}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-amber-400 text-lg leading-none">★</span>
                  <span className="font-extrabold text-sm">{currentRating} My Rating</span>
                </div>
                <span className="text-slate-400 font-bold text-base">&gt;</span>
              </button>
            </div>

            {/* MENU OPTIONS FROM THREE DOTS (Register Work Card, Settings, Privacy & Security, Refer, About Us, Log Out) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden text-sm font-bold">
              <button
                type="button"
                onClick={() => setShowRegisterWorkCard(true)}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span>🪪 Register Work Card</span>
                <span className="text-slate-400">&gt;</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenuModal('settings')}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span>⚙️ Settings</span>
                <span className="text-slate-400">&gt;</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenuModal('privacy')}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span>🔒 Privacy & Security</span>
                <span className="text-slate-400">&gt;</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenuModal('refer')}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span>🎁 Refer</span>
                <span className="text-slate-400">&gt;</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenuModal('about')}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span>ℹ️ About Us</span>
                <span className="text-slate-400">&gt;</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowProfileScreen(false);
                  await supabase.auth.signOut();
                }}
                className="w-full flex items-center justify-between px-4 py-4 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <span>🚪 Log Out</span>
                <span>&gt;</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowProfileScreen(false)}
              className="w-full py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-xs font-extrabold"
            >
              ← Back to Home
            </button>
          </div>
        ) : profileSubView === 'rating' ? (
          /* MY RATING VIEW */
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setProfileSubView('hub')}
                className="text-xs font-extrabold text-blue-600 dark:text-sky-400"
              >
                ← Back
              </button>
              <h3 className="font-black text-base">My Rating</h3>
              <span className="w-10" />
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 text-center space-y-1">
              <p className="text-4xl font-black text-amber-500">★ {currentRating}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Average rating from completed work & hirers
              </p>
            </div>
          </div>
        ) : (
          /* FULL PROFILE DETAILS VIEW & EDIT (Photo 2 Layout + Edit Button at Last + Save Only When Edited) */
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    syncProfileFormState(profile, session.user);
                    setIsEditingDetails(false);
                    setHasProfileChanges(false);
                    setProfileSubView('hub');
                  }}
                  className="text-lg font-black"
                  aria-label="Back to Profile"
                >
                  ←
                </button>
                <h2 className="text-lg font-black">Profile</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveMenuModal('about')}
                className="px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 text-xs font-bold"
              >
                (?) Help
              </button>
            </div>

            {!isEditingDetails ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                    <p className="font-bold">{profile?.full_name || fullName}</p>
                  </div>
                  <span className="text-slate-400">&gt;</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Phone Number</p>
                    <p className="font-bold">{profile?.phone || profilePhone}</p>
                  </div>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    {profile?.email || profileEmail ? (
                      <p className="font-bold">{profile?.email || profileEmail}</p>
                    ) : (
                      <p className="text-xs font-bold text-rose-600">Required</p>
                    )}
                  </div>
                  <span className="text-slate-400">&gt;</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Gender</p>
                    <p className="font-bold">{profile?.gender || gender || 'Not set'}</p>
                  </div>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Date of Birth</p>
                    {profile?.date_of_birth || dateOfBirth ? (
                      <p className="font-bold">{profile?.date_of_birth || dateOfBirth}</p>
                    ) : (
                      <p className="text-xs font-bold text-rose-600">Required</p>
                    )}
                  </div>
                  <span className="text-slate-400">&gt;</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Member Since</p>
                    <p className="font-bold">{memberSinceText}</p>
                  </div>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Emergency contact</p>
                    {profile?.emergency_contact || emergencyContact ? (
                      <p className="font-bold">{profile?.emergency_contact || emergencyContact}</p>
                    ) : (
                      <p className="text-xs font-bold text-rose-600">Required</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingDetails(true);
                      setHasProfileChanges(false);
                    }}
                    className="text-xs font-extrabold text-blue-600 dark:text-sky-400"
                  >
                    Add
                  </button>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingDetails(true);
                      setHasProfileChanges(false);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-extrabold text-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setHasProfileChanges(true);
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => {
                      setProfilePhone(e.target.value);
                      setHasProfileChanges(true);
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => {
                      setProfileEmail(e.target.value);
                      setHasProfileChanges(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => {
                      setGender(e.target.value);
                      setHasProfileChanges(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      setHasProfileChanges(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => {
                      setEmergencyContact(e.target.value);
                      setHasProfileChanges(true);
                    }}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Payment UPI QR</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => qrInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                    >
                      Upload QR Image
                    </button>
                    {upiQrUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setUpiQrUrl('');
                          setHasProfileChanges(true);
                        }}
                        className="text-xs font-bold text-rose-600"
                      >
                        Remove QR
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {hasProfileChanges && (
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-extrabold text-xs"
                    >
                      Save
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      syncProfileFormState(profile, session.user);
                      setIsEditingDetails(false);
                      setHasProfileChanges(false);
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* REGISTER WORK CARD MODAL */}
        {showRegisterWorkCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-base">Register Work Card</h3>
                <button
                  type="button"
                  onClick={() => setShowRegisterWorkCard(false)}
                  className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                >
                  Close
                </button>
              </div>
              <RegisterProviderForm
                onSuccess={() => {
                  setProviderRefreshKey((prev) => prev + 1);
                  setShowRegisterWorkCard(false);
                }}
              />
            </div>
          </div>
        )}

        <MenuModal
          activeModal={activeMenuModal}
          onClose={() => setActiveMenuModal(null)}
          profile={profile}
          onUpdateProfile={handleUpdateProfileField}
        />
      </div>
    );
  }

  // 3. MAIN KAAM APPLICATION
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white pb-24">
      {showPermissions && <PermissionsModal onComplete={() => setShowPermissions(false)} />}

      {/* TOP HEADER BAR: Profile Tab (Left) | NeedHub Logo (Center) | Messages + Notification Bell (Right) */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            syncProfileFormState(profile, session.user);
            setProfileSubView('hub');
            setIsEditingDetails(false);
            setHasProfileChanges(false);
            setShowProfileScreen(true);
          }}
          title="Open Profile"
          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-7 h-7 rounded-full object-cover border border-blue-600 dark:border-sky-400"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-black text-xs flex items-center justify-center">
              {profile?.full_name?.[0]?.toUpperCase() || 'P'}
            </div>
          )}
          <span className="text-xs font-extrabold max-w-[90px] truncate">
            {profile?.full_name || 'Profile'}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <img src="/needhub-logo.png" alt="NeedHub" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-black text-lg tracking-tight">NeedHub</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMessagesModal(true)}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
          >
            💬 Messages
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedNotification(null);
              setShowNotificationsModal(true);
            }}
            aria-label="Notifications"
            className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-base flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <span>🔔</span>
            {notificationsList.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 text-[10px] font-black flex items-center justify-center">
                {notificationsList.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 3 MAIN OPTIONS NAVIGATION */}
      <nav className="max-w-2xl mx-auto px-4 pt-3">
        <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('stories')}
            className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'stories' ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
              </svg>
              <span>Home</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('post')}
            className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'post' ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Post Job
          </button>
          <button
            onClick={() => setActiveTab('find')}
            className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'find' ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Find Job & People
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT BODY */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
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
                className="px-4 py-2 rounded-xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-extrabold text-xs"
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
                      <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center">
                        {story.profiles?.full_name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{story.profiles?.full_name || 'NeedHub Member'}</p>
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

        {activeTab === 'post' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowPostForm((prev) => !prev)}
              className="w-full py-4 rounded-2xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-black text-sm shadow-md"
            >
              {showPostForm ? '✕ Close Post New Job Form' : '+ Post New Job'}
            </button>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="post-job-search" className="text-xs font-extrabold">
                  Search Work Type / Area
                </label>
                {postSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPostSearchQuery('')}
                    className="text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                id="post-job-search"
                type="text"
                value={postSearchQuery}
                onChange={(e) => setPostSearchQuery(e.target.value)}
                placeholder="Search by job type or area (e.g. Electrician, Plumber, Piprali Road)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm outline-none focus:border-blue-600 dark:focus:border-sky-400"
              />
              <div className="flex gap-1.5 flex-wrap pt-0.5">
                {['Electrician', 'Plumber', 'Helper', 'Driver', 'Technician'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setPostSearchQuery(chip)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                      postSearchQuery.toLowerCase() === chip.toLowerCase()
                        ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {postSearchQuery.trim() && (
                <div className="pt-2">
                  <ProviderSuggestions
                    refreshKey={providerRefreshKey}
                    initialQuery={postSearchQuery.trim()}
                    searchQuery={postSearchQuery.trim()}
                    currentUserId={session?.user?.id}
                    onJobRequestCreated={() => {
                      setProviderRefreshKey((k) => k + 1);
                      if (session?.user?.id) loadEverything(session.user.id);
                    }}
                    onOpenChatWithProvider={(provider) => {
                      setSelectedChatUser({
                        id: String(provider.id),
                        full_name: provider.full_name,
                        phone: provider.phone,
                      });
                      setShowMessagesModal(true);
                    }}
                  />
                </div>
              )}
            </div>

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
                  className="w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-extrabold text-sm"
                >
                  Publish Job Now
                </button>
              </form>
            )}

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
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-600 dark:hover:border-sky-400"
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

        {activeTab === 'find' && (
          <div className="space-y-4">
            <WorkerJobRequestsPanel
              currentUserId={session?.user?.id}
              refreshKey={providerRefreshKey}
              onUpdated={() => {
                setProviderRefreshKey((k) => k + 1);
                if (session?.user?.id) loadEverything(session.user.id);
              }}
            />

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
                        ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950'
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
                        className="px-4 py-2 rounded-xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-extrabold text-xs"
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

      {/* NOTIFICATIONS MODAL (Line-wise with Date & Time + Click to Delete) */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base">Notifications</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedNotification(null);
                  setShowNotificationsModal(false);
                }}
                className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex-1">
              {notificationsList.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">No notifications right now.</p>
              ) : (
                notificationsList.map((notif) => {
                  const isPicked = selectedNotification?.id === notif.id;
                  return (
                    <div key={notif.id} className="py-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedNotification(isPicked ? null : notif)}
                        className="w-full text-left flex items-start justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{notif.detail}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{notif.timestamp}</span>
                      </button>

                      {isPicked && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setDismissedNotificationIds((prev) => [...prev, notif.id]);
                              setSelectedNotification(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold"
                          >
                            Delete Notification
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

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
                className="flex-1 py-3 rounded-xl bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-extrabold text-xs"
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

      {/* MODAL: WORKER APPLIED JOB FULL DETAILS */}
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

      {/* MODAL: JOB COMPLETED */}
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
                    ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 border-blue-600 dark:border-sky-400'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                💵 Cash
              </button>
              <button
                onClick={() => setPaymentChoice('online')}
                className={`py-3 rounded-2xl font-extrabold text-xs border ${
                  paymentChoice === 'online'
                    ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 border-blue-600 dark:border-sky-400'
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

      {/* POP-UP TO HIRER */}
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
                      ratingValue >= star ? 'bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-800'
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

      {/* MESSAGES MODAL */}
      {showMessagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-sky-500/20 rounded-3xl p-5 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base">Messages</h3>
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 min-h-[380px] max-h-[65vh]">
              <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-3 md:pb-0 md:pr-3 overflow-y-auto space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                  Chats
                </div>
                {(() => {
                  const chatPartnersMap = new Map<string, any>();

                  people
                    .filter((p) => connectedIds.has(p.id) && p.allow_messages !== false)
                    .forEach((p) => {
                      chatPartnersMap.set(String(p.id), p);
                    });

                  messages.forEach((m: any) => {
                    const otherId =
                      m.sender_id === session.user.id ? String(m.receiver_id) : String(m.sender_id);
                    if (!otherId || otherId === session.user.id) return;
                    if (!chatPartnersMap.has(otherId)) {
                      const foundProfile = people.find((p) => String(p.id) === otherId);
                      chatPartnersMap.set(
                        otherId,
                        foundProfile || {
                          id: otherId,
                          full_name: `User (${otherId.slice(0, 6)})`,
                        }
                      );
                    }
                  });

                  const chatPartners = Array.from(chatPartnersMap.values());

                  if (chatPartners.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 px-1 py-2">
                        Connect with people or message a provider to start chatting.
                      </p>
                    );
                  }

                  return chatPartners.map((p) => {
                    const isSelected = String(selectedChatUser?.id) === String(p.id);
                    return (
                      <button
                        key={String(p.id)}
                        type="button"
                        onClick={() => setSelectedChatUser(p)}
                        className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-2xl transition ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-sky-500/15 border border-blue-200 dark:border-sky-500/40'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        <div className="w-8 h-8 shrink-0 rounded-full bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center text-xs font-extrabold">
                          {p.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {p.full_name}
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>

              <div className="md:col-span-7 flex flex-col justify-between min-h-[320px]">
                {!selectedChatUser ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Your Messages
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Left side se kisi user ko select karke chat shuru karo.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full justify-between gap-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center text-xs font-extrabold">
                          {selectedChatUser.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {selectedChatUser.full_name}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedChatUser(null)}
                        className="text-xs text-blue-600 dark:text-sky-400 font-bold hover:underline"
                      >
                        Unselect
                      </button>
                    </div>

                    <div className="h-64 overflow-y-auto space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800">
                      {messages
                        .filter(
                          (m) =>
                            (m.sender_id === session.user.id && String(m.receiver_id) === String(selectedChatUser.id)) ||
                            (String(m.sender_id) === String(selectedChatUser.id) && m.receiver_id === session.user.id)
                        )
                        .map((m) => (
                          <div
                            key={m.id}
                            className={`px-3.5 py-2 rounded-2xl text-xs max-w-[78%] break-words ${
                              m.sender_id === session.user.id
                                ? 'ml-auto rounded-br-sm bg-blue-600 dark:bg-sky-500 text-white dark:text-slate-950 font-medium'
                                : 'mr-auto rounded-bl-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
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
                        className="flex-1 px-4 py-2 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 dark:focus:border-sky-400"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 transition"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS / PRIVACY / ABOUT US / REFER MODAL */}
      <MenuModal
        activeModal={activeMenuModal}
        onClose={() => setActiveMenuModal(null)}
        profile={profile}
        onUpdateProfile={handleUpdateProfileField}
      />
    </div>
  );
}
