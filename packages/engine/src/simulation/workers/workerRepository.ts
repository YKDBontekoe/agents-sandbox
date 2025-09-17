import type { WorkerProfile, Workplace } from './types';

/**
 * Repository responsible for storing and retrieving worker and workplace data.
 * This keeps the storage concern isolated from the higher level simulation
 * system so the maps can be swapped for alternative implementations in tests.
 */
export class WorkerRepository {
  private readonly workers: Map<string, WorkerProfile> = new Map();
  private readonly workplaces: Map<string, Workplace> = new Map();

  upsertWorker(worker: WorkerProfile): void {
    this.workers.set(worker.citizenId, worker);
  }

  hasWorker(workerId: string): boolean {
    return this.workers.has(workerId);
  }

  getWorker(workerId: string): WorkerProfile | undefined {
    return this.workers.get(workerId);
  }

  removeWorker(workerId: string): boolean {
    return this.workers.delete(workerId);
  }

  getAllWorkers(): WorkerProfile[] {
    return Array.from(this.workers.values());
  }

  getWorkerMap(): ReadonlyMap<string, WorkerProfile> {
    return this.workers;
  }

  upsertWorkplace(workplace: Workplace): void {
    this.workplaces.set(workplace.buildingId, workplace);
  }

  getWorkplace(buildingId: string): Workplace | undefined {
    return this.workplaces.get(buildingId);
  }

  removeWorkplace(buildingId: string): boolean {
    return this.workplaces.delete(buildingId);
  }

  getAllWorkplaces(): Workplace[] {
    return Array.from(this.workplaces.values());
  }

  getWorkplaceMap(): ReadonlyMap<string, Workplace> {
    return this.workplaces;
  }
}
