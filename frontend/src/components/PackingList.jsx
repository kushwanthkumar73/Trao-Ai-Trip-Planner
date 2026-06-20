import React from 'react';

export default function PackingList({ packingList, onToggle }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xl font-bold mb-1 text-white">⛈️ AI Weather-Aware Packing Assistant</h3>
      <p className="text-xs text-slate-400 mb-6">
        Based on your destination's climate and planned activities, pack these items:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {packingList && packingList.length > 0 ? (
          packingList.map((item) => (
            <div
              key={item._id}
              onClick={() => onToggle(item._id)}
              className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-700 transition"
            >
              <input
                type="checkbox"
                checked={item.isPacked}
                readOnly
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 accent-emerald-500 cursor-pointer"
              />
              <span className={`text-sm ${item.isPacked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {item.item}
              </span>
              <span className="ml-auto text-[10px] uppercase bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono">
                {item.category}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500">No packing list generated yet.</p>
        )}
      </div>
    </div>
  );
}
