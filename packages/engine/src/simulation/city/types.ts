export interface CityConfig {
  gridWidth: number;
  gridHeight: number;
  initialPopulation: number;
  startingBudget: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface CityMetrics {
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
