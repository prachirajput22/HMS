// ============================================================
// Smart Roommate Matching Utility — Weighted Priority Engine
// ============================================================
// Scoring formula:
//   finalScore = Σ(matched × weight) / Σ(all weights) × 100
//
// Weight comes from user.preferences.priorities (1=Low, 2=Medium, 3=High)
// Each criterion contributes proportionally to its weight.
// ============================================================

const Room = require('../models/Room');

// -------------------------------------------------------------
// CRITERIA DEFINITIONS
// Extensible: add new criteria here without changing the engine
// -------------------------------------------------------------
const CRITERIA = [
  {
    key: 'sleepSchedule',
    label: 'Sleep Schedule',
    icon: '🌙',
    // Compare user pref vs occupant pref
    match: (userPrefs, occupantPrefs) =>
      userPrefs.sleepSchedule === occupantPrefs.sleepSchedule,
  },
  {
    key: 'food',
    label: 'Food Preference',
    icon: '🥬',
    match: (userPrefs, occupantPrefs) =>
      userPrefs.food === occupantPrefs.food,
  },
  {
    key: 'lifestyle',
    label: 'Lifestyle',
    icon: '🎯',
    match: (userPrefs, occupantPrefs) =>
      userPrefs.lifestyle === occupantPrefs.lifestyle,
  },
];

// -------------------------------------------------------------
// getUserWeight — resolve priority weight from user preferences
// Falls back to 1 (Low) if priorities not set
// -------------------------------------------------------------
const getUserWeight = (user, criterionKey) => {
  return (user.preferences?.priorities?.[criterionKey]) || 1;
};

// -------------------------------------------------------------
// calculateMatchScore
//   Computes weighted match between a requesting user and a room.
//   For empty rooms → score 50 (neutral match, preferred over 0).
//   For rooms with occupants → average weighted score per occupant.
//
// Returns:
//   {
//     percentage: Number (0-100),
//     matched:    String[] (labels of matched criteria),
//     unmatched:  String[] (labels of unmatched criteria),
//     breakdown:  [{ criterion, label, icon, weight, matched, contribution }]
//   }
// -------------------------------------------------------------
const calculateMatchScore = (user, room) => {
  const userPrefs = user.preferences || {};
  const priorities = userPrefs.priorities || {};

  // Compute total possible weight sum
  const totalWeight = CRITERIA.reduce((sum, c) => sum + (priorities[c.key] || 1), 0);

  if (!room.occupants || room.occupants.length === 0) {
    // Empty room: give a neutral score of 50%
    // Build breakdown with "unknown" matches since no occupants
    const breakdown = CRITERIA.map((c) => ({
      criterion:    c.key,
      label:        c.label,
      icon:         c.icon,
      weight:       priorities[c.key] || 1,
      matched:      null, // unknown — no occupants to compare
      contribution: 0,
    }));
    return {
      percentage: 50,
      matched:    [],
      unmatched:  [],
      breakdown,
      emptyRoom:  true,
    };
  }

  // For rooms with occupants: average score across all occupants
  const occupantScores = room.occupants.map((occupant) => {
    const occPrefs = occupant.preferences || {};
    let weightedScore = 0;

    const breakdown = CRITERIA.map((c) => {
      const weight = priorities[c.key] || 1;
      const isMatch = c.match(userPrefs, occPrefs);
      const contribution = isMatch ? weight : 0;
      weightedScore += contribution;
      return {
        criterion:    c.key,
        label:        c.label,
        icon:         c.icon,
        weight,
        matched:      isMatch,
        contribution,
      };
    });

    return { weightedScore, breakdown };
  });

  // Average across all occupants
  const avgWeightedScore =
    occupantScores.reduce((sum, o) => sum + o.weightedScore, 0) /
    occupantScores.length;

  const percentage = Math.round((avgWeightedScore / totalWeight) * 100);

  // Build aggregate breakdown (majority vote per criterion across occupants)
  const breakdown = CRITERIA.map((c) => {
    const weight = priorities[c.key] || 1;
    const matchCount = occupantScores.filter(
      (o) => o.breakdown.find((b) => b.criterion === c.key)?.matched
    ).length;
    const isMatch = matchCount > room.occupants.length / 2;
    return {
      criterion:    c.key,
      label:        c.label,
      icon:         c.icon,
      weight,
      matched:      isMatch,
      contribution: isMatch ? weight : 0,
    };
  });

  const matched   = breakdown.filter((b) => b.matched).map((b) => `${b.icon} ${b.label}`);
  const unmatched = breakdown.filter((b) => !b.matched).map((b) => `${b.icon} ${b.label}`);

  return { percentage, matched, unmatched, breakdown, emptyRoom: false };
};

// -------------------------------------------------------------
// compatibilityScore — legacy equal-weight score (for roommate display)
// -------------------------------------------------------------
const compatibilityScore = (prefsA, prefsB) => {
  let score = 0;
  if (prefsA.sleepSchedule === prefsB.sleepSchedule) score++;
  if (prefsA.food === prefsB.food) score++;
  if (prefsA.lifestyle === prefsB.lifestyle) score++;
  return score;
};

// -------------------------------------------------------------
// compatibilityPercentage — legacy helper (still used in userController)
// -------------------------------------------------------------
const compatibilityPercentage = (prefsA, prefsB) => {
  return Math.round((compatibilityScore(prefsA, prefsB) / 3) * 100);
};

// -------------------------------------------------------------
// getRoomSuggestions
//   Returns available rooms sorted by match score (desc).
//   Each entry: { room, score: { percentage, matched, unmatched, breakdown } }
// -------------------------------------------------------------
const getRoomSuggestions = (user, rooms) => {
  const available = rooms.filter(
    (r) => r.status === 'Available' && r.occupants.length < r.capacity
  );

  const scored = available.map((room) => ({
    room,
    score: calculateMatchScore(user, room),
  }));

  // Sort: higher percentage first; ties: non-empty rooms first
  scored.sort((a, b) => {
    if (b.score.percentage !== a.score.percentage) {
      return b.score.percentage - a.score.percentage;
    }
    // Prefer rooms with existing occupants (proven compatibility) over empty
    const aEmpty = a.score.emptyRoom ? 1 : 0;
    const bEmpty = b.score.emptyRoom ? 1 : 0;
    return aEmpty - bEmpty;
  });

  return scored;
};

// -------------------------------------------------------------
// findBestRoom — backward-compatible entry point
//   Used by userController.postRoomRequest and adminController.autoAllocate
// -------------------------------------------------------------
const findBestRoom = async (requestingUser) => {
  const rooms = await Room.find({ status: 'Available' }).populate('occupants');
  const suggestions = getRoomSuggestions(requestingUser, rooms);
  return suggestions.length > 0 ? suggestions[0].room : null;
};

module.exports = {
  findBestRoom,
  calculateMatchScore,
  getRoomSuggestions,
  compatibilityScore,
  compatibilityPercentage,
};
