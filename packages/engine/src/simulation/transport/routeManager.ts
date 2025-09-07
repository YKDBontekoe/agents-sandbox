import { TransportRoute, TransportStop, TransportDemand } from './types';

export class RouteManager {
  constructor(
    private stops: Map<string, TransportStop>,
    private routes: Map<string, TransportRoute>
  ) {}

  createRoute(route: TransportRoute): void {
    this.routes.set(route.id, route);
  }

  findRoute(origin: string, destination: string): string[] | null {
    const visited = new Set<string>();
    const queue: Array<{ stopId: string; path: string[] }> = [{ stopId: origin, path: [origin] }];

    while (queue.length > 0) {
      const { stopId, path } = queue.shift()!;
      if (stopId === destination) {
        return path;
      }
      if (visited.has(stopId)) continue;
      visited.add(stopId);

      const stop = this.stops.get(stopId);
      if (!stop) continue;

      stop.connections.forEach(connectedId => {
        if (!visited.has(connectedId)) {
          queue.push({ stopId: connectedId, path: [...path, connectedId] });
        }
      });

      this.routes.forEach(route => {
        if (route.stops.includes(stopId)) {
          route.stops.forEach(routeStopId => {
            if (!visited.has(routeStopId) && routeStopId !== stopId) {
              queue.push({ stopId: routeStopId, path: [...path, routeStopId] });
            }
          });
        }
      });
    }

    return null;
  }

  optimizeRoutes(demandData: TransportDemand[]): void {
    this.routes.forEach(route => {
      const routeDemand = demandData.filter(demand =>
        route.stops.includes(demand.origin) && route.stops.includes(demand.destination)
      );
      const totalDemand = routeDemand.reduce((sum, demand) => sum + demand.passengers, 0);

      if (totalDemand > route.capacity * 0.8) {
        route.frequency = Math.max(2, route.frequency - 1);
      } else if (totalDemand < route.capacity * 0.3) {
        route.frequency = Math.min(15, route.frequency + 1);
      }

      route.efficiency = Math.min(100, (totalDemand / Math.max(1, route.capacity)) * 100);
    });
  }
}
