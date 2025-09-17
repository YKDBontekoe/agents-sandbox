export interface CityStats {
  population: number;
  happiness: number;
  traffic: number;
  pollution: number;
  crime: number;
  education: number;
  healthcare: number;
  employment: number;
  budget: number;
  income: number;
  expenses: number;
}

const DEFAULT_STATS: Omit<CityStats, 'budget'> = {
  population: 0,
  happiness: 50,
  traffic: 0,
  pollution: 0,
  crime: 10,
  education: 30,
  healthcare: 30,
  employment: 70,
  income: 0,
  expenses: 0
};

type MutableMetrics = Omit<CityStats, 'budget' | 'income' | 'expenses' | 'population'>;

export class CityManagementState {
  private stats: CityStats;

  constructor(initialBudget: number) {
    this.stats = {
      ...DEFAULT_STATS,
      budget: initialBudget
    };
  }

  resetFlow(): void {
    this.stats.income = 0;
    this.stats.expenses = 0;
  }

  applyIncome(amount: number): void {
    if (amount <= 0) return;

    this.stats.income += amount;
    this.stats.budget += amount;
  }

  applyExpense(amount: number): void {
    if (amount <= 0) return;

    this.stats.expenses += amount;
    this.stats.budget -= amount;
  }

  updatePopulation(population: number): void {
    this.stats.population = Math.max(0, Math.floor(population));
  }

  updateMetrics(metrics: Partial<MutableMetrics>): void {
    this.stats = {
      ...this.stats,
      ...metrics
    };
  }

  canAfford(cost: number): boolean {
    return this.stats.budget >= cost;
  }

  getBudget(): number {
    return this.stats.budget;
  }

  getStats(): CityStats {
    return { ...this.stats };
  }
}
