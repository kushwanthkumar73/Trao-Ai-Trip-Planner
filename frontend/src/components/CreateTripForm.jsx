import React, { useState } from 'react';

const INTEREST_OPTIONS = ['Adventure', 'Culture', 'Food', 'Relaxation', 'Nature', 'Nightlife', 'Shopping', 'History'];

export default function CreateTripForm({ onGenerate, generating }) {
  const [destination, setDestination] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [budgetTier, setBudgetTier] = useState('Medium');
  const [interests, setInterests] = useState([]);

  const toggleInterest = (tag) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((i) => i !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!destination.trim()) return;
    onGenerate({ destination, durationDays: Number(durationDays), budgetTier, interests });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-bold text-white">Plan a New Trip</h2>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Destination</label>
        <input
          type="text"
          required
          placeholder="e.g. Kyoto, Japan"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Duration (days)</label>
          <input
            type="number"
            min={1}
            max={14}
            required
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Budget Tier</label>
          <select
            value={budgetTier}
            onChange={(e) => setBudgetTier(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-2 block">Interests</label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => toggleInterest(tag)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                interests.includes(tag)
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={generating}
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 transition text-white rounded-lg py-2.5 text-sm font-semibold"
      >
        {generating ? 'Generating with AI...' : 'Generate Itinerary'}
      </button>
    </form>
  );
}
