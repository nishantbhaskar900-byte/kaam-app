'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'AC / Appliance Repair',
  'Mason / Mistri',
  'Cleaning',
];

type RegisterProviderFormProps = {
  onSuccess?: () => void;
};

export default function RegisterProviderForm({ onSuccess }: RegisterProviderFormProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Electrician');
  const [areaName, setAreaName] = useState('');
  const [city, setCity] = useState('');
  const [wantsPriorityBenefit, setWantsPriorityBenefit] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setErrorMsg(null);

    if (!fullName.trim() || !areaName.trim() || !category.trim()) {
      setErrorMsg('Naam, kaam ki category aur area bharna zaroori hai.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        category: category.trim(),
        area_name: areaName.trim(),
        city: city.trim(),
        has_priority_plan: wantsPriorityBenefit,
        priority_status: wantsPriorityBenefit ? 'pending' : 'none',
        priority_until: null,
      };

      const { error } = await supabase.from('service_providers').insert([payload]);
      if (error) throw error;

      setMessage(
        wantsPriorityBenefit
          ? 'Registration ho gaya! Aapka area top-suggestion benefit request bhi save ho gaya hai.'
          : 'Registration ho gaya! Aapki profile area aur category ke hisaab se list ho gayi hai.'
      );

      setFullName('');
      setPhone('');
      setAreaName('');
      setCity('');
      setWantsPriorityBenefit(false);

      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Register karte waqt error aaya.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-white">
      <h3 className="text-lg font-semibold">Worker / Service Provider Registration</h3>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">Poora Naam *</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jaise: Ramesh Sharma"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">Mobile Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit number"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Kaam / Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-300">Area / Locality *</label>
          <input
            type="text"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="Jaise: Piprali Road / Civil Lines"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">City</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Jaise: Sikar / Gorakhpur"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm">
        <input
          type="checkbox"
          checked={wantsPriorityBenefit}
          onChange={(e) => setWantsPriorityBenefit(e.target.checked)}
          className="mt-1 h-4 w-4 accent-blue-500"
        />
        <span className="text-neutral-200">
          Kya aap chahte hain ki aapke area mein koi aapki category search kare toh suggestions mein aapka naam sabse upar aaye? (Subscription benefit)
        </span>
      </label>

      {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {submitting ? 'Register ho raha hai...' : 'Register Karo'}
      </button>
    </form>
  );
}
