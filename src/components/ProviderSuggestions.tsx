'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  rankProvidersByAreaAndCategory,
  type ServiceProvider,
} from '@/lib/providerRanking';

const CATEGORIES = [
  'All',
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'AC / Appliance Repair',
  'Mason / Mistri',
  'Cleaning',
];

type ProviderSuggestionsProps = {
  refreshKey?: number;
};

export default function ProviderSuggestions({ refreshKey = 0 }: ProviderSuggestionsProps) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Electrician');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          const msg = err instanceof Error ? err.message : 'Suggestions load karne mein error aaya.';
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
            {CATEGORIES.map((cat) => (
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
        <p className="text-sm text-neutral-400">Is area aur category ke liye abhi koi worker nahi mila.</p>
      )}

      <div className="space-y-2.5">
        {rankedList.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-3"
          >
            <div>
              <p className="font-medium text-white">{item.full_name}</p>
              <p className="text-xs text-neutral-400">
                {item.category} • {item.area_name}
                {item.city ? `, ${item.city}` : ''}
              </p>
            </div>

            {item.phone && (
              <a
                href={`tel:${item.phone}`}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
              >
                Call
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
