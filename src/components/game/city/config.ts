import {
  faCity,
  faUsers,
  faSmile,
  faCar,
  faSmog,
  faShieldAlt,
  faGraduationCap,
  faHospital,
  faBriefcase,
  faCoins,
  faArrowUp,
  faArrowDown,
  faPlay,
  faPause,
  faTools,
  faHome,
  faIndustry,
  faStore,
  faRoad,
  faTrash,
  faLevelUpAlt,
  faTimes,
  faChartLine,
  faExclamationTriangle,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export const cityIcons = {
  city: faCity,
  users: faUsers,
  smile: faSmile,
  car: faCar,
  smog: faSmog,
  shield: faShieldAlt,
  gradCap: faGraduationCap,
  hospital: faHospital,
  briefcase: faBriefcase,
  coins: faCoins,
  arrowUp: faArrowUp,
  arrowDown: faArrowDown,
  play: faPlay,
  pause: faPause,
  tools: faTools,
  home: faHome,
  industry: faIndustry,
  store: faStore,
  road: faRoad,
  trash: faTrash,
  levelUp: faLevelUpAlt,
  times: faTimes,
  chartLine: faChartLine,
  exclamationTriangle: faExclamationTriangle,
  checkCircle: faCheckCircle,
};

export type TabId = 'statistics' | 'tools' | 'zones' | 'services';

export const tabs: { id: TabId; label: string; icon: IconDefinition; color: string }[] = [
  { id: 'statistics', label: 'Stats', icon: cityIcons.chartLine, color: 'blue' },
  { id: 'tools', label: 'Tools', icon: cityIcons.tools, color: 'purple' },
  { id: 'zones', label: 'Zones', icon: cityIcons.home, color: 'green' },
  { id: 'services', label: 'Services', icon: cityIcons.shield, color: 'orange' },
];

export const tools = [
  { tool: 'select', icon: cityIcons.checkCircle, label: 'Select', color: 'blue' },
  { tool: 'build_road', icon: cityIcons.road, label: 'Build Road', color: 'gray' },
  { tool: 'demolish', icon: cityIcons.trash, label: 'Demolish', color: 'red' },
  { tool: 'upgrade', icon: cityIcons.levelUp, label: 'Upgrade', color: 'green' },
];

export const zones = [
  {
    zone: 'residential',
    icon: cityIcons.home,
    label: 'Residential Zone',
    color: 'green',
    desc: 'Housing for citizens',
  },
  {
    zone: 'commercial',
    icon: cityIcons.store,
    label: 'Commercial Zone',
    color: 'blue',
    desc: 'Shops and businesses',
  },
  {
    zone: 'industrial',
    icon: cityIcons.industry,
    label: 'Industrial Zone',
    color: 'orange',
    desc: 'Factories and production',
  },
];

export const services = [
  { service: 'police', icon: cityIcons.shield, label: 'Police', color: 'blue' },
  { service: 'fire', icon: cityIcons.exclamationTriangle, label: 'Fire Dept', color: 'red' },
  { service: 'hospital', icon: cityIcons.hospital, label: 'Hospital', color: 'green' },
  { service: 'school', icon: cityIcons.gradCap, label: 'School', color: 'purple' },
];

export type ManagementTool =
  | 'select'
  | 'zone_residential'
  | 'zone_commercial'
  | 'zone_industrial'
  | 'build_road'
  | 'build_service'
  | 'demolish'
  | 'upgrade';

export type ZoneType = 'residential' | 'commercial' | 'industrial';

export type ServiceType = 'police' | 'fire' | 'hospital' | 'school';

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
