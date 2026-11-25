'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type WorkerJobRequestsPanelProps = {
  currentUserId?: string;
  refreshKey?: number;
  onUpdated?: () => void;
};

export default function WorkerJobRequestsPanel({
  currentUserId,
  refreshKey = 0,
  onUpdated,
}: WorkerJobRequestsPanelProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Reschedule / Date-Time Change state per job
  const [rescheduleJobId, setRescheduleJobId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [changeMsg, setChangeMsg] = useState('');

  const loadRequestsAndSchedule = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = data || [];

      const incoming = list.filter((j: any) =>
        currentUserId
          ? j.target_provider_id === currentUserId || j.status === 'pending_provider'
          : j.status === 'pending_provider' || j.status === 'reschedule_requested'
      );

      const accepted = list.filter((j: any) => j.status === 'accepted' || j.status === 'scheduled');
      setRequests(incoming);
      setBookedSlots(accepted);
    } catch {
      // ignore if table not ready
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequestsAndSchedule();
  }, [currentUserId, refreshKey]);

  const isSlotBusy = (date?: string, time?: string) => {
    if (!date) return false;
    return bookedSlots.some(
      (b) => b.work_date === date && (!time || !b.work_time || b.work_time === time)
    );
  };

  const handleAction = async (jobId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
    if (error) return alert(error.message);
    await loadRequestsAndSchedule();
    onUpdated?.();
  };

  const handleSendReschedule = async (e: React.FormEvent, jobId: string) => {
    e.preventDefault();
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'reschedule_requested',
        proposed_date: newDate || null,
        proposed_time: newTime || null,
        provider_note: changeMsg.trim() || 'Date/time change ka request bheja gaya hai.',
      })
      .eq('id', jobId);

    if (error) return alert(error.message);
    setRescheduleJobId(null);
    setNewDate('');
    setNewTime('');
    setChangeMsg('');
    await loadRequestsAndSchedule();
    onUpdated?.();
  };

  if (loading && requests.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Direct Job Requests & Your Schedule</h3>
          <p className="text-xs text-neutral-400">
            Apna schedule dekh kar accept/reject karein ya date/time change ka message bhejein
          </p>
        </div>
        <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] text-neutral-300">
          Booked Slots: {bookedSlots.length}
        </span>
      </div>

      {/* Booked Schedule Strip */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-xs">
        <p className="font-semibold text-neutral-300 mb-1">Aapka Booked Schedule:</p>
        {bookedSlots.length === 0 ? (
          <p className="text-neutral-500">Abhi koi slot booked nahi hai — aap free hain.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bookedSlots.map((slot) => (
              <span
                key={slot.id}
                className="rounded-md bg-amber-950/60 border border-amber-700/40 px-2 py-1 text-amber-200 text-[11px]"
              >
                {slot.job_type} • {slot.work_date || 'Date TBD'} {slot.work_time ? `(${slot.work_time})` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {requests.length === 0 ? (
        <p className="text-xs text-neutral-400">Abhi koi naya job request nahi aaya hai.</p>
      ) : (
        <div className="space-y-2.5">
          {requests.map((req) => {
            const busy = isSlotBusy(req.work_date, req.work_time);
            return (
              <div
                key={req.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {req.job_type} • ₹{req.pay_per_person}/person
                    </p>
                    <p className="text-xs text-neutral-400">
                      {req.location_name || 'Area'} • Date: {req.work_date || 'N/A'} • Time:{' '}
                      {req.work_time || 'N/A'} ({req.duration_hours || 4}h)
                    </p>
                    {req.description && (
                      <p className="text-xs text-neutral-300 mt-0.5">{req.description}</p>
                    )}
                  </div>

                  <span
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                      busy
                        ? 'bg-rose-950 text-rose-300 border border-rose-700/40'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-700/40'
                    }`}
                  >
                    {busy ? 'Schedule Conflict / Busy' : 'Slot Free'}
                  </span>
                </div>

                {req.status === 'reschedule_requested' && (
                  <div className="rounded-lg bg-sky-950/50 border border-sky-700/40 p-2 text-xs text-sky-200">
                    Proposed: {req.proposed_date || 'Same Date'} at {req.proposed_time || 'Same Time'} —{' '}
                    {req.provider_note}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAction(req.id, 'accepted')}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(req.id, 'rejected')}
                    className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleJobId(rescheduleJobId === req.id ? null : req.id);
                      setNewDate(req.work_date || '');
                      setNewTime(req.work_time || '');
                      setChangeMsg('');
                    }}
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
                  >
                    Date / Time Change Message
                  </button>
                </div>

                {rescheduleJobId === req.id && (
                  <form
                    onSubmit={(e) => handleSendReschedule(e, req.id)}
                    className="mt-2 rounded-lg border border-neutral-800 bg-neutral-900 p-2.5 space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="rounded bg-neutral-950 border border-neutral-700 px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="rounded bg-neutral-950 border border-neutral-700 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      value={changeMsg}
                      onChange={(e) => setChangeMsg(e.target.value)}
                      placeholder="Message likhein (jaise: Is time busy hoon, shaam 4 baje chalega?)"
                      className="w-full rounded bg-neutral-950 border border-neutral-700 px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                    >
                      Send Date/Time Proposal
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
