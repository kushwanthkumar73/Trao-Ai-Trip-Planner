const Trip = require('../models/Trip');

// ---------- Exponential Backoff Executor for External AI API Resilience ----------
async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.log(`Rate limited. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      const errBody = await response.text();
      throw new Error(`External API Error: Status ${response.status} - ${errBody}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.log(`Request failed. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

// ---------- Helper: Call Gemini with a prompt, return parsed JSON ----------
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const requestPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Could not extract generation data from AI response.');
  }

  return JSON.parse(rawText);
}

// ---------- Generate a brand new trip ----------
exports.generateNewTrip = async (req, res) => {
  const { destination, durationDays, budgetTier, interests } = req.body;
  const userId = req.user.id;

  if (!destination || !durationDays || !budgetTier) {
    return res.status(400).json({ message: 'destination, durationDays, and budgetTier are required' });
  }

  const prompt = `
    Create a detailed travel plan for a ${durationDays}-day trip to ${destination}.
    Budget preference is ${budgetTier}. Interests are: ${(interests || []).join(', ') || 'general sightseeing'}.

    Also act as a weather-aware packing specialist: based on ${destination}'s typical climate
    and the planned activities, generate a smart packing checklist divided into categories:
    "Documents" (crucial travel documents), "Gear" (activity-specific equipment, e.g. hiking boots
    if hiking is planned), and "Clothing" (climate-appropriate wear, e.g. rain gear or high SPF
    sunscreen if relevant). Include an "Other" category for anything else essential.

    You must output ONLY a valid JSON object matching this exact structure, no extra text:
    {
      "itinerary": [
        {
          "dayNumber": 1,
          "activities": [
            { "title": "Activity name", "description": "Brief text details", "estimatedCostUSD": 20, "timeOfDay": "Morning" }
          ]
        }
      ],
      "hotels": [
        { "name": "Recommended Hotel", "tier": "Budget", "estimatedCostNightUSD": 85, "rating": "4.5/5" }
      ],
      "estimatedBudget": {
        "transport": 120,
        "accommodation": 300,
        "food": 150,
        "activities": 100,
        "total": 670
      },
      "packingList": [
        { "item": "Passport", "category": "Documents", "isPacked": false }
      ]
    }
    Generate exactly ${durationDays} day entries in the itinerary array (dayNumber 1 to ${durationDays}).
    Make sure estimates match typical realistic local rates for the specified budgetTier.
  `;

  try {
    const cleanResult = await callGemini(prompt);

    const newTrip = new Trip({
      userId,
      destination,
      durationDays,
      budgetTier,
      interests: interests || [],
      itinerary: cleanResult.itinerary,
      hotels: cleanResult.hotels,
      estimatedBudget: cleanResult.estimatedBudget,
      packingList: cleanResult.packingList
    });

    const savedTrip = await newTrip.save();
    return res.status(201).json(savedTrip);
  } catch (error) {
    console.error('Critical AI Generation Error:', error);
    return res.status(500).json({ message: 'Fail-safe: AI encountered an error processing your trip. Please try again.' });
  }
};

// ---------- Get all trips for the logged-in user (strict isolation) ----------
exports.getUserTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json(trips);
  } catch (error) {
    console.error('Get Trips Error:', error);
    return res.status(500).json({ message: 'Server error fetching trips' });
  }
};

// ---------- Get single trip by id (ownership enforced) ----------
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    return res.status(200).json(trip);
  } catch (error) {
    console.error('Get Trip Error:', error);
    return res.status(500).json({ message: 'Server error fetching trip' });
  }
};

// ---------- Generic update (itinerary edits, packing list toggles, etc.) ----------
exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const allowedFields = ['itinerary', 'hotels', 'estimatedBudget', 'packingList', 'destination', 'durationDays', 'budgetTier', 'interests'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        trip[field] = req.body[field];
      }
    });

    const updatedTrip = await trip.save();
    return res.status(200).json(updatedTrip);
  } catch (error) {
    console.error('Update Trip Error:', error);
    return res.status(500).json({ message: 'Server error updating trip' });
  }
};

// ---------- Delete trip ----------
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    return res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete Trip Error:', error);
    return res.status(500).json({ message: 'Server error deleting trip' });
  }
};

// ---------- Add a single activity to a specific day ----------
exports.addActivity = async (req, res) => {
  try {
    const { dayNumber, activity } = req.body;
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const day = trip.itinerary.find((d) => d.dayNumber === dayNumber);
    if (!day) {
      return res.status(404).json({ message: `Day ${dayNumber} not found in itinerary` });
    }

    day.activities.push(activity);
    const updatedTrip = await trip.save();
    return res.status(200).json(updatedTrip);
  } catch (error) {
    console.error('Add Activity Error:', error);
    return res.status(500).json({ message: 'Server error adding activity' });
  }
};

// ---------- Remove an activity from a specific day ----------
exports.removeActivity = async (req, res) => {
  try {
    const { dayNumber, activityId } = req.body;
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const day = trip.itinerary.find((d) => d.dayNumber === dayNumber);
    if (!day) {
      return res.status(404).json({ message: `Day ${dayNumber} not found in itinerary` });
    }

    day.activities = day.activities.filter((a) => a._id.toString() !== activityId);
    const updatedTrip = await trip.save();
    return res.status(200).json(updatedTrip);
  } catch (error) {
    console.error('Remove Activity Error:', error);
    return res.status(500).json({ message: 'Server error removing activity' });
  }
};

// ---------- Regenerate a specific day using AI with user feedback ----------
exports.regenerateDay = async (req, res) => {
  try {
    const { dayNumber, feedback } = req.body;
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const day = trip.itinerary.find((d) => d.dayNumber === dayNumber);
    if (!day) {
      return res.status(404).json({ message: `Day ${dayNumber} not found in itinerary` });
    }

    const prompt = `
      Here is the existing travel context: destination is ${trip.destination}, a ${trip.durationDays}-day
      trip with a ${trip.budgetTier} budget. The current plan for Day ${dayNumber} is:
      ${JSON.stringify(day.activities)}.

      The traveler wants this change: "${feedback}".

      Regenerate ONLY Day ${dayNumber}'s activities to reflect this feedback. Output ONLY a valid JSON
      object with this exact structure, no extra text:
      {
        "activities": [
          { "title": "Activity name", "description": "Brief text details", "estimatedCostUSD": 20, "timeOfDay": "Morning" }
        ]
      }
    `;

    const result = await callGemini(prompt);
    day.activities = result.activities;

    const updatedTrip = await trip.save();
    return res.status(200).json(updatedTrip);
  } catch (error) {
    console.error('Regenerate Day Error:', error);
    return res.status(500).json({ message: 'Fail-safe: AI encountered an error regenerating this day. Please try again.' });
  }
};
