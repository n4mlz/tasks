function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function getPlanningHealthUseCase(
  deps: {
    capacityRepository: {
      listBetween(dateFrom: string, dateTo: string): Promise<Array<{ date: string }>>;
    };
    clock: {
      today(): string;
    };
  },
  _input: Record<string, never>,
) {
  const today = deps.clock.today();
  const end = addDays(today, 6);
  const capacities = await deps.capacityRepository.listBetween(today, end);
  const configuredDates = new Set(capacities.map((capacity) => capacity.date));
  const missingCapacityDatesWithin7Days: string[] = [];

  for (let current = today; current <= end; current = addDays(current, 1)) {
    if (!configuredDates.has(current)) {
      missingCapacityDatesWithin7Days.push(current);
    }
  }

  return {
    missingCapacityDatesWithin7Days,
    warningCount: missingCapacityDatesWithin7Days.length,
  };
}
