import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import CreateTripForm from '../components/CreateTripForm';
import ItineraryCard from '../components/ItineraryCard';
import PackingList from '../components/PackingList';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const data = await api.getTrips();
      setTrips(data);
      if (data.length > 0) setSelectedTrip(data[0]);
    } catch (err) {
      console.error('Failed to fetch trips', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (payload) => {
    setGenerating(true);
    setError('');
    try {
      const newTrip = await api.generateTrip(payload);
      setTrips((prev) => [newTrip, ...prev]);
      setSelectedTrip(newTrip);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!confirm('Delete this trip permanently?')) return;
    try {
      await api.deleteTrip(tripId);
      const remaining = trips.filter((t) => t._id !== tripId);
      setTrips(remaining);
      setSelectedTrip(remaining[0] || null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddActivity = async (dayNumber, activity) => {
    try {
      const updated = await api.addActivity(selectedTrip._id, { dayNumber, activity });
      applyTripUpdate(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveActivity = async (dayNumber, activityId) => {
    try {
      const updated = await api.removeActivity(selectedTrip._id, { dayNumber, activityId });
      applyTripUpdate(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegenerateDay = async (dayNumber, feedback) => {
    setRegenerating(true);
    try {
      const updated = await api.regenerateDay(selectedTrip._id, { dayNumber, feedback });
      applyTripUpdate(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleTogglePacking = async (itemId) => {
    const updatedPacking = selectedTrip.packingList.map((item) =>
      item._id === itemId ? { ...item, isPacked: !item.isPacked } : item
    );
    // Optimistic update
    setSelectedTrip({ ...selectedTrip, packingList: updatedPacking });
    try {
      const updated = await api.updateTrip(selectedTrip._id, { packingList: updatedPacking });
      applyTripUpdate(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const applyTripUpdate = (updatedTrip) => {
    setSelectedTrip(updatedTrip);
    setTrips((prev) => prev.map((t) => (t._id === updatedTrip._id ? updatedTrip : t)));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-950 text-white">
        <p className="text-xl animate-pulse">Loading your travel vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-slate-800 pb-5 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            AI Travel Dashboard
          </h1>
          <p className="text-sm text-slate-400">Welcome, {user?.name || 'Traveler'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-lg text-sm"
        >
          Sign Out
        </button>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2 mb-6">
          {error}
        </div>
      )}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Your Active Trips</h2>
              <button
                onClick={() => setShowForm((s) => !s)}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-semibold"
              >
                {showForm ? 'Close' : '+ New'}
              </button>
            </div>

            {trips.length === 0 ? (
              <p className="text-slate-500 text-sm">No itineraries found. Create one to begin!</p>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <div
                    key={trip._id}
                    className={`w-full text-left p-4 rounded-xl transition cursor-pointer ${
                      selectedTrip?._id === trip._id
                        ? 'bg-blue-600 border border-blue-500 text-white'
                        : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedTrip(trip)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{trip.destination}</p>
                        <p className="text-xs opacity-80">
                          {trip.durationDays} Days • {trip.budgetTier} Budget
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrip(trip._id);
                        }}
                        className="text-xs opacity-70 hover:opacity-100 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showForm && <CreateTripForm onGenerate={handleGenerate} generating={generating} />}

          {selectedTrip && !showForm && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Financial Cost Ledger</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Lodging & Accommodations:</span>
                  <span className="font-semibold">${selectedTrip.estimatedBudget?.accommodation || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Culinary & Dining:</span>
                  <span className="font-semibold">${selectedTrip.estimatedBudget?.food || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Activities & Sightseeing:</span>
                  <span className="font-semibold">${selectedTrip.estimatedBudget?.activities || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Transport:</span>
                  <span className="font-semibold">${selectedTrip.estimatedBudget?.transport || 0}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-800 pt-3 text-white font-bold">
                  <span>Grand Total:</span>
                  <span>${selectedTrip.estimatedBudget?.total || 0}</span>
                </div>
              </div>

              {selectedTrip.hotels?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold mb-2 text-slate-300">Recommended Hotels</h3>
                  <div className="space-y-2">
                    {selectedTrip.hotels.map((hotel, idx) => (
                      <div key={idx} className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-xs">
                        <p className="font-semibold text-white">{hotel.name}</p>
                        <p className="text-slate-400">{hotel.tier} • ${hotel.estimatedCostNightUSD}/night • {hotel.rating}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedTrip ? (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-800 pb-3">
                  Day-by-Day Timeline: {selectedTrip.destination}
                </h2>
                <div className="space-y-6">
                  {selectedTrip.itinerary.map((day) => (
                    <ItineraryCard
                      key={day.dayNumber}
                      day={day}
                      onAddActivity={handleAddActivity}
                      onRemoveActivity={handleRemoveActivity}
                      onRegenerateDay={handleRegenerateDay}
                      regenerating={regenerating}
                    />
                  ))}
                </div>
              </div>

              <PackingList packingList={selectedTrip.packingList} onToggle={handleTogglePacking} />
            </>
          ) : (
            <div className="flex flex-col justify-center items-center h-96 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-6xl mb-4">✈️</span>
              <p className="text-slate-400">Select an existing itinerary or create a new trip to begin exploring.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
