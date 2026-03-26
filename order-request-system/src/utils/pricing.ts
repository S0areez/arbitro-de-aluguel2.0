export const calculateMatchPrice = (
  hourlyRate: number,
  duration: number,
  dateStr: string,
  timeStr: string
) => {
  const basePrice = hourlyRate * duration;
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
    // Note: This uses local browser time. For a real app, timezone handling is crucial.
    // Assuming the user is in the same timezone as the intended match for now.
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
