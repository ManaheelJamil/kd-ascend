/**
 * Every asset comes from the Figma file — run `npm run assets` once to download them
 * into assets/figma/ (see scripts/fetch-figma-assets.mjs).
 */
import IllusKey from '../assets/figma/illus-key.svg';
import IllusParty from '../assets/figma/illus-party.svg';
import IconEye from '../assets/figma/icon-eye.svg';
import IconLogin from '../assets/figma/icon-login.svg';
import IconRegister from '../assets/figma/icon-register.svg';
import IconCloseBg from '../assets/figma/icon-close-bg.svg';
import IconClose from '../assets/figma/icon-close.svg';
import IconEmail from '../assets/figma/icon-email.svg';
import IconSms from '../assets/figma/icon-sms.svg';
import IconArrowRight from '../assets/figma/icon-arrow-right.svg';
import IconArrowDark from '../assets/figma/icon-arrow-dark.svg';
import IconChevronDown from '../assets/figma/icon-chevron-down.svg';
import IconCalendar from '../assets/figma/icon-calendar.svg';
import IconTickSmall from '../assets/figma/icon-tick-small.svg';
import IconTickStep from '../assets/figma/icon-tick-step.svg';
import IconUpload from '../assets/figma/icon-upload.svg';
import IconBack from '../assets/figma/icon-back.svg';
import IconRadioOn from '../assets/figma/icon-radio-on.svg';
import IconBank from '../assets/figma/icon-bank.svg';
import IconCalendarNav from '../assets/figma/icon-calendar-nav.svg';

// Jobs module (Figma "Verified", "Job Detail", "Bookings", popups) — exported from the Figma file.
import JobArrowOrange from '../assets/figma/jobs/arrow-orange.svg';
import JobArrowWhite from '../assets/figma/jobs/arrow-white.svg';
import JobBack from '../assets/figma/jobs/back.svg';
import JobBell from '../assets/figma/jobs/bell.svg';
import JobBookingCalendar from '../assets/figma/jobs/booking-calendar.svg';
import JobBuilding from '../assets/figma/jobs/building.svg';
import JobCalendarLg from '../assets/figma/jobs/calendar-lg.svg';
import JobCalendarSm from '../assets/figma/jobs/calendar-sm.svg';
import JobCardCalendar from '../assets/figma/jobs/card-calendar.svg';
import JobCardLocation from '../assets/figma/jobs/card-location.svg';
import JobChevronDown from '../assets/figma/jobs/chevron-down.svg';
import JobClockLg from '../assets/figma/jobs/clock-lg.svg';
import JobClockSm from '../assets/figma/jobs/clock-sm.svg';
import JobDetailLocation from '../assets/figma/jobs/detail-location.svg';
import JobDollarCircle from '../assets/figma/jobs/dollar-circle.svg';
import JobDollarLg from '../assets/figma/jobs/dollar-lg.svg';
import JobDollarSm from '../assets/figma/jobs/dollar-sm.svg';
import JobDot from '../assets/figma/jobs/dot.svg';
import JobFilterOrange from '../assets/figma/jobs/filter-orange.svg';
import JobFilterOrangeSm from '../assets/figma/jobs/filter-orange-sm.svg';
import JobFilterWhite from '../assets/figma/jobs/filter-white.svg';
import JobMapNavigate from '../assets/figma/jobs/map-navigate.svg';
import JobMapPin from '../assets/figma/jobs/map-pin.svg';
import JobPendingMask from '../assets/figma/jobs/pending-mask.svg';
import JobPerson from '../assets/figma/jobs/person.svg';
import JobPersonOrange from '../assets/figma/jobs/person-orange.svg';
import JobSearch from '../assets/figma/jobs/search.svg';
import JobSearchSm from '../assets/figma/jobs/search-sm.svg';
import JobSort from '../assets/figma/jobs/sort.svg';
import JobThumb from '../assets/figma/jobs/thumb.svg';
import JobTick from '../assets/figma/jobs/tick.svg';
import JobToggle from '../assets/figma/jobs/toggle.svg';
import JobToggleOff from '../assets/figma/jobs/toggle-off.svg';
import JobVerified from '../assets/figma/jobs/verified.svg';
import JobWarning from '../assets/figma/jobs/warning.svg';

export const images = {
  logo: require('../assets/figma/logo.png'),
  doodleHeader: require('../assets/figma/doodle-header.png'),
  doodleSplashTop: require('../assets/figma/doodle-splash-top.png'),
  doodleSplashBottom: require('../assets/figma/doodle-splash-bottom.png'),
  paynow: require('../assets/figma/paynow.png'),
  calendarSelected: require('../assets/figma/calendar-selected.png'),
  // Account section (Figma "Edit Profile" / "Upload Document" popups)
  illusWarning: require('../assets/figma/illus-warning.png'),
  illusVerifiedBadge: require('../assets/figma/illus-verified-badge.png'),
  iconClockOrange: require('../assets/figma/icon-clock-orange.png'),
};

export const Svg = {
  IllusKey,
  IllusParty,
  IconEye,
  IconLogin,
  IconRegister,
  IconCloseBg,
  IconClose,
  IconEmail,
  IconSms,
  IconArrowRight,
  IconArrowDark,
  IconChevronDown,
  IconCalendar,
  IconTickSmall,
  IconTickStep,
  IconUpload,
  IconBack,
  IconRadioOn,
  IconBank,
  IconCalendarNav,
};

/** Jobs module icons (Figma MObile App page), at their Figma sizes. */
export const JobSvg = {
  ArrowOrange: JobArrowOrange,
  ArrowWhite: JobArrowWhite,
  Back: JobBack,
  Bell: JobBell,
  BookingCalendar: JobBookingCalendar,
  Building: JobBuilding,
  CalendarLg: JobCalendarLg,
  CalendarSm: JobCalendarSm,
  CardCalendar: JobCardCalendar,
  CardLocation: JobCardLocation,
  ChevronDown: JobChevronDown,
  ClockLg: JobClockLg,
  ClockSm: JobClockSm,
  DetailLocation: JobDetailLocation,
  DollarCircle: JobDollarCircle,
  DollarLg: JobDollarLg,
  DollarSm: JobDollarSm,
  Dot: JobDot,
  FilterOrange: JobFilterOrange,
  FilterOrangeSm: JobFilterOrangeSm,
  FilterWhite: JobFilterWhite,
  MapNavigate: JobMapNavigate,
  MapPin: JobMapPin,
  PendingMask: JobPendingMask,
  Person: JobPerson,
  PersonOrange: JobPersonOrange,
  Search: JobSearch,
  SearchSm: JobSearchSm,
  Sort: JobSort,
  Thumb: JobThumb,
  Tick: JobTick,
  Toggle: JobToggle,
  ToggleOff: JobToggleOff,
  Verified: JobVerified,
  Warning: JobWarning,
};

export const jobImages = {
  /** Event Location map (Figma 194:1055). */
  map: require('../assets/figma/jobs/map.png'),
  /** Badge shape of "Booking Submitted", shown tinted green (Figma mask 281:892). */
  badgeMask: require('../assets/figma/jobs/badge-mask.png'),
  /** Calendar shape of "Cancel Booking", shown tinted red (Figma mask 308:665). */
  cancelMask: require('../assets/figma/jobs/cancel-mask.png'),
};
