const CONFIG = {
  // Display settings
  MOBILE_BREAKPOINT: 768,
  MIN_DISTANCE_BETWEEN_SVGS: 60,
  MAX_POSITIONING_ATTEMPTS: 100,
  
  // GPS settings
  GPS_MARKERS: [
    { id: 'redCircle1', lat: 51.4634, lng: 11.9695, radius: 25 },
    { id: 'redCircle2', lat: 51.4644, lng: 11.9705, radius: 25 },
    { id: 'redCircle3', lat: 51.4624, lng: 11.9685, radius: 25 },
    { id: 'magic1', lat: 51.4654, lng: 11.9715, radius: 20 },
    { id: 'magic2', lat: 51.4628, lng: 11.9678, radius: 20 },
    { id: 'magic3', lat: 51.4638, lng: 11.9688, radius: 20 },
    { id: 'pflanze1', lat: 51.4632, lng: 11.9692, radius: 15 },
    { id: 'pflanze2', lat: 51.4642, lng: 11.9702, radius: 15 },
    { id: 'pflanze3', lat: 51.4622, lng: 11.9682, radius: 15 },
    { id: 'pflanze4', lat: 51.4652, lng: 11.9712, radius: 15 },
    { id: 'pflanze5', lat: 51.4636, lng: 11.9686, radius: 15 }
  ],
  
  // Animation and timing settings
  PROXIMITY_HIGHLIGHT_DURATION: 5000,
  STATUS_DISPLAY_DURATION: 3000,
  AUTO_CLOSE_DELAY: 500,
  AUDIO_ERROR_FALLBACK_DURATION: 3000,
  
  // UI element margins
  SVG_POSITIONING_MARGIN: 40,
  SVG_SIZE_OFFSET: 80,
  
  // Selectors
  SELECTORS: {
    SVG_ICONS: '.svg-icon',
    RED_CIRCLES: '.red-circle',
    PFLANZE_CIRCLES: '.red-circle.pflanze',
    MAGIC_CIRCLES: '.red-circle.magic',
    ANWEISUNG_BOX: '#anweisungsbox',
    CLOSE_BUTTON: '#closeButton',
    PFLANZE_CLOSE_BUTTON: '#pflanzeCloseButton',
    FULLSIZE_IMAGE: '.fullsize-image'
  },
  
  // CSS classes
  CSS_CLASSES: {
    VISIBLE: 'visible',
    FULLSCREEN: 'fullscreen',
    PLAYING: 'playing',
    ARROW_UP: 'arrow-up',
    ARROW_DOWN: 'arrow-down',
    PROXIMITY_HIGHLIGHT: 'proximity-highlight'
  }
};

window.CONFIG = CONFIG;