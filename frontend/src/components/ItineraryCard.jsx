import React, { useState } from 'react';

export default function ItineraryCard({ day, onAddActivity, onRemoveActivity, onRegenerateDay, regenerating }) {
  const [newActivityName, setNewActivityName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showRegenInput, setShowRegenInput] = useState(false);

  const handleAdd = () => {
    if (!newActivityName.trim()) return;
    onAddActivity(day.dayNumber, {
      title: newActivityName,
      description: 'Added by traveler',
      estimatedCostUSD: 0,
      timeOfDay: 'Afternoon'
    });
    setNewActivityName('');
  };

  const handleRegenerate = () => {
    if (!feedback.trim()) return;
    onRegenerateDay(day.dayNumber, feedback);
    setFeedback('');
    setShowRegenInput(false);
  };

  return (
    <div className="border-l-2 border-indigo-500 pl-6 relative">
      <div className="absolute -left-[9px] top-1 w-4 h-4 bg-indigo-500 rounded-full border-4 border-slate-900" />
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-200">Day {day.dayNumber}</h3>
        <button
          onClick={() => setShowRegenInput((s) => !s)}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          {showRegenInput ? 'Cancel' : '✨ Regenerate Day'}
        </button>
      </div>

      {showRegenInput && (
        <div className="flex items-center gap-2 mb-4 bg-slate-800 border border-slate-700 rounded-lg p-2">
          <input
            type="text"
            placeholder="e.g. Change to outdoor hiking activities"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-full"
          />
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap"
          >
            {regenerating ? '...' : 'Apply'}
          </button>
        </div>
      )}

      <div className="space-y-3 mb-4">
        {day.activities.map((act) => (
          <div key={act._id} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <div className="flex justify-between items-start gap-2">
              <span className="font-semibold text-white">{act.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-full">
                  {act.timeOfDay}
                </span>
                <button
                  onClick={() => onRemoveActivity(day.dayNumber, act._id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                  title="Remove activity"
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">{act.description}</p>
            {act.estimatedCostUSD > 0 && (
              <p className="text-xs text-emerald-400 mt-1">${act.estimatedCostUSD}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <input
          type="text"
          placeholder="Add new activity..."
          value={newActivityName}
          onChange={(e) => setNewActivityName(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-full"
        />
        <button
          onClick={handleAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap"
        >
          Add
        </button>
      </div>
    </div>
  );
}
