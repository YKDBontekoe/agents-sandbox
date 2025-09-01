// Centralized FontAwesome icon library to optimize bundle size
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faWheatAwn,
  faCoins,
  faWandSparkles,
  faCrown,
  faBolt,
  faSkullCrossbones,
  faPlay,
  faPause,
  faForward,
  faLandmark,
  faScroll,
  faEye,
  faMousePointer,
  faArrowsAlt,
  faMagnifyingGlass,
  faXmark,
  faLock,
  faSackDollar,
  faShieldHalved,
  faUsers,
  faHatWizard,
  faGear
} from '@fortawesome/free-solid-svg-icons';

// Add icons to the library for tree-shaking optimization
library.add(
  faWheatAwn,
  faCoins,
  faWandSparkles,
  faCrown,
  faBolt,
  faSkullCrossbones,
  faPlay,
  faPause,
  faForward,
  faLandmark,
  faScroll,
  faEye,
  faMousePointer,
  faArrowsAlt,
  faMagnifyingGlass,
  faXmark,
  faLock,
  faSackDollar,
  faShieldHalved,
  faUsers,
  faHatWizard,
  faGear
);

// Export icons for direct use
export {
  faWheatAwn,
  faCoins,
  faWandSparkles,
  faCrown,
  faBolt,
  faSkullCrossbones,
  faPlay,
  faPause,
  faForward,
  faLandmark,
  faScroll,
  faEye,
  faMousePointer,
  faArrowsAlt,
  faMagnifyingGlass,
  faXmark,
  faLock,
  faSackDollar,
  faShieldHalved,
  faUsers,
  faHatWizard,
  faGear
};