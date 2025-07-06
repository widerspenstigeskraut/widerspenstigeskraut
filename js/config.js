const CONFIG = {
    // Display settings
    MOBILE_BREAKPOINT: 768,
    MIN_DISTANCE_BETWEEN_SVGS: 60,
    MAX_POSITIONING_ATTEMPTS: 100,

    // GPS settings
    GPS_MARKERS: [
        {id: 'redCircle1', lat: 51.492060, lng: 11.956057, radius: 40},
        {id: 'redCircle2', lat: 51.491434, lng: 11.956762, radius: 40},
        {id: 'redCircle3', lat: 51.490917, lng: 11.956818, radius: 40},
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
        MAP_POINTS: '.map-point',
        PFLANZE_CIRCLES: '.map-point.pflanze',
        MAGIC_CIRCLES: '.map-point.magic',
        ANWEISUNG_BOX: '#anweisungsbox',
        CLOSE_BUTTON: '#closeButton',
        PFLANZE_CLOSE_BUTTON: '#pflanzeCloseButton',
        FULLSIZE_IMAGE: '.fullsize-image'
    },

    // GPS Testing mode
    GPS_TESTING: {
        ENABLED: false,
        REAL_LOCATION: null, // User's actual GPS position
        TEST_OFFSET: { lat: 0, lng: 0 } // Offset to map real location to first marker
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