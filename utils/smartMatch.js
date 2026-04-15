// ============================================================
// Smart Roommate Matching Utility
// ============================================================
// Scores compatibility between a requesting user and existing
// room occupants. Returns the best available room.

const Room = require('../models/Room');
const User = require('../models/User');

/**
 * Calculate compatibility score between two preference sets.
 * Max score = 3 (one point per matching preference)
 */
const compatibilityScore = (prefsA, prefsB) => {
  let score = 0;
  if (prefsA.sleepSchedule === prefsB.sleepSchedule) score++;
  if (prefsA.food === prefsB.food) score++;
  if (prefsA.lifestyle === prefsB.lifestyle) score++;
  return score;
};

/**
 * Calculate compatibility percentage between two users
 */
const compatibilityPercentage = (prefsA, prefsB) => {
  const score = compatibilityScore(prefsA, prefsB);
  return Math.round((score / 3) * 100);
};

/**
 * Find the best matching room for a user.
 * - Filters rooms that are Available and have capacity
 * - Scores each room based on average preference match with existing occupants
 * - Returns the highest-scored room, or null if none available
 */
const findBestRoom = async (requestingUser) => {
  // Get all rooms with available slots
  const rooms = await Room.find({ status: 'Available' }).populate('occupants');

  // Filter rooms with open slots
  const available = rooms.filter(
    (room) => room.occupants.length < room.capacity
  );

  if (available.length === 0) return null;

  let bestRoom = null;
  let bestScore = -1;

  for (const room of available) {
    if (room.occupants.length === 0) {
      // Empty room: score = 1 (valid, but not preferred over a matched room)
      if (bestScore < 1) {
        bestScore = 1;
        bestRoom = room;
      }
      continue;
    }

    // Score against all current occupants, take average
    const scores = room.occupants.map((occupant) =>
      compatibilityScore(requestingUser.preferences, occupant.preferences)
    );
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avgScore > bestScore) {
      bestScore = avgScore;
      bestRoom = room;
    }
  }

  return bestRoom;
};

module.exports = { findBestRoom, compatibilityScore, compatibilityPercentage };
