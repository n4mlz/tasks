export interface DayCapacity {
  date: string;
  availableMinutes: number;
  bufferMinutes: number;
}

export function createDayCapacity(input: {
  date: string;
  availableMinutes: number;
  bufferMinutes?: number;
}): DayCapacity {
  if (!Number.isInteger(input.availableMinutes) || input.availableMinutes < 0) {
    throw new Error("availableMinutes must be zero or positive");
  }

  const bufferMinutes =
    input.bufferMinutes ?? Math.round(input.availableMinutes * 0.2);

  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0) {
    throw new Error("bufferMinutes must be zero or positive");
  }

  return {
    date: input.date,
    availableMinutes: input.availableMinutes,
    bufferMinutes,
  };
}
