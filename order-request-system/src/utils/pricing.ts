// Fixed pricing table for the platform
const FIXED_PRICES: Record<string, Record<number, number>> = {
  'futsal 5x5': {
    1: 38.21,
    1.15: 47.76,
    1.3: 57.31,
    1.45: 66.87,
    2: 76.42
  },
  'society 6x6/7x7': {
    1: 41.99,
    1.15: 52.49,
    1.3: 62.98,
    1.45: 73.48,
    2: 83.98
  },
  'campo 11x11': {
    1: 45.77,
    1.15: 57.21,
    1.3: 68.65,
    1.45: 80.10,
    2: 91.54
  }
};

export const calculateMatchPrice = (
  modality: string,
  duration: number,
  dateStr: string,
  timeStr: string
) => {
  // Normalize modality name
  const normalizedModality = modality.toLowerCase().trim();

  // Find the matching category
  let categoryKey = '';
  if (normalizedModality.includes('futsal') || normalizedModality.includes('5x5')) {
    categoryKey = 'futsal 5x5';
  } else if (normalizedModality.includes('society') || normalizedModality.includes('6x6') || normalizedModality.includes('7x7')) {
    categoryKey = 'society 6x6/7x7';
  } else if (normalizedModality.includes('campo') || normalizedModality.includes('11x11')) {
    categoryKey = 'campo 11x11';
  } else {
    // Default to futsal 5x5 if no match
    categoryKey = 'futsal 5x5';
  }

  // Get the fixed price for the duration, or interpolate if needed
  const categoryPrices = FIXED_PRICES[categoryKey];
  let basePrice = categoryPrices[duration];

  // If exact duration not found, find the closest
  if (!basePrice) {
    const availableDurations = Object.keys(categoryPrices).map(Number).sort((a, b) => a - b);
    const closestDuration = availableDurations.reduce((prev, curr) =>
      Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
    );
    basePrice = categoryPrices[closestDuration];
  }

  let feePercentage = 0;
  let isSurge = false;

  // Simple validation
  if (!dateStr || !timeStr) {
    return {
      basePrice,
      platformFee: 0,
      totalPrice: basePrice,
      isSurge: false,
      feePercentage: 0
    };
  }

  try {
    // Create date object to check day of week and time
    const date = new Date(`${dateStr}T${timeStr}`);
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    const hour = date.getHours();

    // Surge Logic: Saturday (6) or Sunday (0) between 06:00 and 12:00
    const isWeekend = day === 0 || day === 6;
    const isMorning = hour >= 6 && hour < 12;

    if (isWeekend && isMorning) {
      feePercentage = 0.10; // 10% surge
      isSurge = true;
    }
  } catch (e) {
    console.error("Error parsing date for pricing:", e);
  }

  const platformFee = basePrice * feePercentage;
  const totalPrice = basePrice + platformFee;

  return {
    basePrice,
    platformFee,
    totalPrice,
    isSurge,
    feePercentage
  };
};
