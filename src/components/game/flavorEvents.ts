import { ResourceType } from './resourceUtils';

export interface FlavorEventDef {
  message: string;
  delta?: Partial<Record<ResourceType, number>>;
}

export const FLAVOR_EVENTS: FlavorEventDef[] = [
  {
    message: 'A traveling bard sings of your realm, bolstering morale.',
    delta: { favor: 1 },
  },
  {
    message: 'A stray pixie leaves a trail of glittering mana in its wake.',
    delta: { mana: 2 },
  },
  {
    message: 'A mischievous urchin filches a few coins from the treasury.',
    delta: { coin: -3 },
  },
  {
    message: 'A bumper crop of grain sprouted overnight after a warm rain.',
    delta: { grain: 4 },
  },
  {
    message: 'A quiet day passes with nothing of note.'
  },
];

export function getRandomFlavorEvent(): FlavorEventDef {
  return FLAVOR_EVENTS[Math.floor(Math.random() * FLAVOR_EVENTS.length)];
}
