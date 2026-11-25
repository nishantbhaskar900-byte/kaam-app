'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  rankProvidersByAreaAndCategory,
  type ServiceProvider,
} from '@/lib/providerRanking';

const BASE_CATEGORIES = [
  'All',
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'AC / Appliance Repair',
  'Mason / Mistri',
  'Cleaning',
  'Driver',
  'Helper',
  'Technician',
];

type ProviderSuggestionsProps = {
  refreshKey?: number;
  initialQuery?: string;
  searchQuery?: string;
  currentUserId?: string;
  onJobRequestCreated?: () => void;
  onOpenChatWithProvider?: (provider: ServiceProvider, prefillText?: string) => void;
};

export default function ProviderSuggestions({
  refreshKey = 0,
  initialQuery = '',
  searchQuery,
  currentUserId,
  onJobRequestCreated,
  onOpenChatWithProvider,
}: ProviderSuggestionsProps) {
  const incomingQuery = (searchQuery ?? initialQuery).trim();

  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(incomingQuery || 'All');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [profileProvider, setProfileProvider] = useState<ServiceProvider | null>(null);

  const [chatProvider, setChatProvider] = useState<ServiceProvider | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const [jobTargetProvider, setJobTargetProvider] = useState<ServiceProvider | null>(null);
  const [jobType, setJobType] = useState('Helper');
  const [customJobType, setCustomJobType] = useState('');
  const [peopleNeeded, setPeopleNeeded] = useState(1);
  const [payPerPerson, setPayPerPerson] = useState('500');
  const [workDate, setWorkDate] = useState('');
  const [workTime, setWorkTime] = useState('09:00');
  const [durationHours, setDurationHours] = useState('4');
  const [locationName, setLocationName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [submittingJob, setSubmittingJob] = useState(false);

  useEffect(() => {
    if (!incomingQuery) {
      setSelectedCategory('All');
      return;
    }
    const matchedCategory = BASE_CATEGORIES.find(
      (cat) => cat.toLowerCase() === incomingQuery.toLowerCase()
    );
    setSelectedCategory(matchedCategory || incomingQuery);
  }, [incomingQuery]);

  const categoryOptions = useMemo(() => {
    const list = [...BASE_CATEGORIES];
    if (
      selectedCategory &&
      !list.some((c) => c.toLowerCase() === selectedCategory.toLowerCase())
    ) {
      list.splice(1, 0, selectedCategory);
    }
    return list;
  }, [selectedCategory]);

  useEffect(() => {
    let active = true;
    async function loadProviders() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data, error } = await supabase
          .from('service_providers')
          .select(
            'id, full_name, phone, category, area_name, city, has_priority_plan, priority_status, priority_until, created_at'
          );

        if (error) throw error;
        if (active) {
          setProviders((data as ServiceProvider[]) || []);
        }
      } catch (err: unknown) {
        if (active) {
          const msg =
            err instanceof Error ? err.message : 'Suggestions load karne mein error aaya.';
          setErrorMsg(msg);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProviders();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const rankedList = rankProvidersByAreaAndCategory(
    providers,
    selectedArea,
    selectedCategory === 'All' ? '' : selectedCategory
  );

  const openJobModalForProvider = (provider: ServiceProvider) => {
    setProfileProvider(null);
    setJobTargetProvider(provider);
    setJobType(provider.category || 'Helper');
    setCustomJobType('');
    setPeopleNeeded(1);
    setPayPerPerson('500');
    setWorkDate(new Date().toISOString().split('T')[0]);
    setWorkTime('09:00');
    setDurationHours('4');
    setLocationName(provider.area_name || selectedArea || '');
    setJobDescription(`${provider.full_name} ke liye direct job request`);
  };

  const handleSendDirectJobRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTargetProvider) return;
    setSubmittingJob(true);
    try {
      const finalType = customJobType.trim() || jobType;
      const payload = {
        hirer_id: currentUserId || null,
        target_provider_id: String(jobTargetProvider.id),
        job_type: finalType,
        people_needed: Number(peopleNeeded) || 1,
        pay_per_person: Number(payPerPerson) || 0,
        work_date: workDate || null,
        work_time: workTime || '09:00',
        duration_hours: Number(durationHours) || 4,
        location_name: locationName.trim() || jobTargetProvider.area_name || 'Nearby Area',
        distance_km: Number((Math.random() * 5 + 0.5).toFixed(1)),
        description: jobDescription.trim(),
        status: 'pending_provider',
      };

      const { error } = await supabase.from('jobs').insert(payload);
      if (error) throw error;

      alert(`Job request ${jobTargetProvider.full_name} ko bhej di gayi hai!`);
      setJobTargetProvider(null);
      onJobRequestCreated?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Job request bhejne mein error aaya.');
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleOpenMessageModal = async (provider: ServiceProvider) => {
    setProfileProvider(null);
    setChatProvider(provider);

    const introMsg = {
      id: 'intro',
      sender: provider.full_name,
      text: `Namaste! Main ${provider.full_name} (${provider.category}, ${provider.area_name}). Kaam ke baare mein bataiye.`,
      mine: false,
    };

    if (!currentUserId) {
      setChatMessages([introMsg]);
      return;
    }

    const targetId = String(provider.id);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      setChatMessages(
        data.map((m: any) => ({
          id: String(m.id),
          sender: m.sender_id === currentUserId ? 'You' : provider.full_name,
          text: m.body,
          mine: m.sender_id === currentUserId,
        }))
      );
    } else {
      setChatMessages([introMsg]);
    }
  };

  const handleSendInModalMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatProvider) return;
    setSendingChat(true);
    const msgText = chatInput.trim();
    setChatInput('');

    const tempId = String(Date.now());
    setChatMessages((prev) => [
      ...prev,
      { id: tempId, sender: 'You', text: msgText, mine: true },
    ]);

    try {
      if (currentUserId) {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUserId,
            receiver_id: String(chatProvider.id),
            body: msgText,
          })
          .select()
          .single();

        if (!error && data) {
          setChatMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, id: String(data.id) } : m))
          );
          onJobRequestCreated?.();
        }
      }
    } catch {
      // ignore if schema differs
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-white">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-400">Area / Locality</label>
          <input
            type="text"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            placeholder="Apna area daalein (jaise: Piprali Road)"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-400">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-neutral-400">Suggestions load ho rahe hain...</p>}
      {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

      {!loading && !errorMsg && rankedList.length === 0 && (
        <p className="text-sm text-neutral-400">
          Is area aur category ke liye abhi koi worker nahi mila.
        </p>
      )}

      <div className="space-y-2.5">
        {rankedList.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-3"
          >
            <button
              type="button"
              onClick={() => setProfileProvider(item)}
              className="text-left group"
              title="Profile dekhein"
            >
              <p className="font-medium text-white group-hover:text-sky-400 group-hover:underline">
                {item.full_name}
              </p>
              <p className="text-xs text-neutral-400">
                {item.category} • {item.area_name}
                {item.city ? `, ${item.city}` : ''}
              </p>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openJobModalForProvider(item)}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              >
                Post a Job to Him
              </button>

              <button
                type="button"
                onClick={() => handleOpenMessageModal(item)}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
              >
                Message
              </button>

              {item.phone && (
                <a
                  href={`tel:${item.phone}`}
                  className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
                >
                  Call
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {profileProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">{profileProvider.full_name}</h3>
                <p className="text-xs text-neutral-400">
                  {profileProvider.category} • {profileProvider.area_name}
                  {profileProvider.city ? `, ${profileProvider.city}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileProvider(null)}
                className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
              >
                Close
              </button>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs space-y-1.5">
              <p>
                <span className="text-neutral-400">Kaam / Category:</span>{' '}
                <span className="font-semibold">{profileProvider.category}</span>
              </p>
              <p>
                <span className="text-neutral-400">Area / City:</span>{' '}
                <span className="font-semibold">
                  {profileProvider.area_name}
                  {profileProvider.city ? `, ${profileProvider.city}` : ''}
                </span>
              </p>
              <p>
                <span className="text-neutral-400">Phone:</span>{' '}
                <span className="font-semibold">{profileProvider.phone || 'Not shared'}</span>
              </p>
              <p>
                <span className="text-neutral-400">Priority Status:</span>{' '}
                <span className="font-semibold text-sky-400">
                  {profileProvider.has_priority_plan ? 'Priority Active' : 'Standard'}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => openJobModalForProvider(profileProvider)}
                className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Post a Job to Him
              </button>
              <button
                type="button"
                onClick={() => handleOpenMessageModal(profileProvider)}
                className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
              >
                Message
              </button>
              {profileProvider.phone && (
                <a
                  href={`tel:${profileProvider.phone}`}
                  className="rounded-lg bg-neutral-800 px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
                >
                  Call
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {jobTargetProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <form
            onSubmit={handleSendDirectJobRequest}
            className="w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-900 p-5 text-white shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <div>
                <h3 className="text-base font-bold">
                  Post a Job to {jobTargetProvider.full_name}
                </h3>
                <p className="text-xs text-neutral-400">
                  Ye job request seedha {jobTargetProvider.full_name} ke paas jaayegi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJobTargetProvider(null)}
                className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Kaam / Job Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                >
                  {categoryOptions
                    .filter((c) => c !== 'All')
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Custom Job Type (Optional)</label>
                <input
                  type="text"
                  value={customJobType}
                  onChange={(e) => setCustomJobType(e.target.value)}
                  placeholder="e.g. Car Driver"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">People Needed</label>
                <input
                  type="number"
                  min={1}
                  value={peopleNeeded}
                  onChange={(e) => setPeopleNeeded(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Pay per Person (₹)</label>
                <input
                  type="number"
                  value={payPerPerson}
                  onChange={(e) => setPayPerPerson(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Time</label>
                <input
                  type="time"
                  required
                  value={workTime}
                  onChange={(e) => setWorkTime(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Duration (Hours)</label>
                <input
                  type="number"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Area / Location</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Civil Lines, Sikar"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Job Details / Notes</label>
              <textarea
                rows={2}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Kaam ki details likhein..."
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setJobTargetProvider(null)}
                className="rounded-lg bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingJob}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {submittingJob ? 'Sending...' : 'Send Job Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {chatProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-white shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div>
                <h3 className="text-sm font-bold">{chatProvider.full_name}</h3>
                <p className="text-[11px] text-neutral-400">
                  {chatProvider.category} • {chatProvider.area_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChatProvider(null)}
                className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300"
              >
                Close
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl bg-neutral-950 p-3 border border-neutral-800">
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[82%] rounded-xl px-3 py-2 text-xs ${
                    m.mine
                      ? 'ml-auto bg-blue-600 text-white'
                      : 'bg-neutral-800 text-neutral-100'
                  }`}
                >
                  <p className="text-[10px] opacity-75 mb-0.5">{m.sender}</p>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendInModalMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="App ke andar message likhein..."
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={sendingChat}
                className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
