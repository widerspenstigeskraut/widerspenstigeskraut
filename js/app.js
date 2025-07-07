class App {
    constructor() {
        this.currentActiveIndex = 0;
        this.currentBackgroundPos = { x: 0, y: 0 };
        this.audioManager = new AudioManager();
        this.gpsManager = this.initGPSManager();

        this.init();
    }

    init() {
        this.initGPSFeatures();
        this.bindEvents();
        this.handleMobileSetup();
        this.autoStartGPS();
    }

    initGPSManager() {
        const gpsManager = new GPSMapper();
        this.bindGPSEvents(gpsManager);
        return gpsManager;
    }

    bindGPSEvents(gpsManager) {
        $(document).on('gps:positionUpdate', (event, data) => {
            console.log('GPS Position aktualisiert:', data);
            this.showGPSCoordinates(data);
        });

        $(document).on('gps:error', (event, error) => {
            console.error('GPS Fehler:', error);
            this.showGPSStatus('GPS Fehler: ' + error.message, 'error');
        });

        $(document).on('gps:trackingStart', () => {
            $('#gpsTrackingBtn').addClass('active').text('⏹');
            this.showGPSStatus('GPS-Tracking gestartet', 'success');
        });

        $(document).on('gps:trackingStop', () => {
            $('#gpsTrackingBtn').removeClass('active').text('🎯');
            this.showGPSStatus('GPS-Tracking gestoppt', 'loading');
        });
    }

    isMobile() {
        return window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    }

    initGPSFeatures() {
        let body = $('body');
        body.append('<button id="gpsUpdateBtn" class="gps-update-button">GPS Update</button>');
        body.append('<button id="gpsTrackingBtn" class="gps-tracking-toggle">👽</button>');
        body.append('<button id="gpsTestingBtn" class="gps-testing-toggle">Test Mode</button>');
        body.append('<div id="gpsStatus" class="gps-status"></div>');
        body.append('<div id="gpsCoordinates" class="gps-coordinates"></div>');
        body.append('<button id="audioPlayPauseBtn" class="audio-play-pause-button">⏸️</button>');
    }

    showGPSStatus(message, type = 'success') {
        const statusEl = $('#gpsStatus');
        statusEl.removeClass('success error loading').addClass(type + ' visible');
        statusEl.text(message);

        setTimeout(() => {
            statusEl.removeClass('visible');
        }, CONFIG.STATUS_DISPLAY_DURATION);
    }

    showGPSCoordinates(data) {
        const coordEl = $('#gpsCoordinates');
        coordEl.html(`
      GPS: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}<br>
      Genauigkeit: ±${data.accuracy ? data.accuracy.toFixed(0) + 'm' : 'unbekannt'}
    `).addClass('visible');
    }

    disableScrolling() {
        $('body').addClass('no-scroll');
    }

    enableScrolling() {
        $('body').removeClass('no-scroll');
    }

    closePflanze() {
        $(CONFIG.SELECTORS.PFLANZE_CIRCLES).removeClass(`${CONFIG.CSS_CLASSES.FULLSCREEN} ${CONFIG.CSS_CLASSES.PLAYING}`);
        $(CONFIG.SELECTORS.PFLANZE_CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.VISIBLE);
        this.audioManager.stopPflanzeAudio();
        this.hidePlayPauseButton();
    }

    closeMagic() {
        $(CONFIG.SELECTORS.MAGIC_CIRCLES).removeClass(`${CONFIG.CSS_CLASSES.FULLSCREEN} ${CONFIG.CSS_CLASSES.PLAYING}`);
        $('#magicCloseButton').removeClass(CONFIG.CSS_CLASSES.VISIBLE);
        this.audioManager.stopSVGAudio();
        this.hidePlayPauseButton();
    }

    handleRedCircleClick(circleNumber) {
        $('.anweisung').hide();
        $(`.anweisung.nr${circleNumber}`).show();
        $(CONFIG.SELECTORS.ANWEISUNG_BOX).addClass(CONFIG.CSS_CLASSES.VISIBLE);
        $(CONFIG.SELECTORS.CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.ARROW_UP).addClass(CONFIG.CSS_CLASSES.ARROW_DOWN);
        this.disableScrolling();

        // Disable ALL map-point clicks while anweisungsbox is open
        $('.map-point').addClass('disabled-while-anweisung');
    }

    closeAnweisungsbox() {
        $(CONFIG.SELECTORS.ANWEISUNG_BOX).removeClass(CONFIG.CSS_CLASSES.VISIBLE);
        $(CONFIG.SELECTORS.CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.ARROW_DOWN).addClass(CONFIG.CSS_CLASSES.ARROW_UP);
        this.enableScrolling();

        // Re-enable other map-point clicks
        $('.map-point').removeClass('disabled-while-anweisung');
    }

    handlePflanzeClick(element) {
        const audioFile = element.getAttribute('data-audio');
        const clickedElement = $(element);

        console.log('Pflanze geklickt:', clickedElement.attr('id'), 'Audio:', audioFile);

        if (clickedElement.hasClass(CONFIG.CSS_CLASSES.FULLSCREEN)) {
            this.closePflanze();
            return;
        }

        $(CONFIG.SELECTORS.PFLANZE_CIRCLES).removeClass(`${CONFIG.CSS_CLASSES.FULLSCREEN} ${CONFIG.CSS_CLASSES.PLAYING}`);
        this.audioManager.stopPflanzeAudio();

        clickedElement.addClass(CONFIG.CSS_CLASSES.FULLSCREEN);
        $(CONFIG.SELECTORS.PFLANZE_CLOSE_BUTTON).addClass(CONFIG.CSS_CLASSES.VISIBLE);

        if (audioFile && audioFile !== '') {
            this.showPlayPauseButton();
            this.audioManager.playPflanzeAudio(audioFile, clickedElement)
                .then(() => {
                    setTimeout(() => {
                        this.closePflanze();
                    }, CONFIG.AUTO_CLOSE_DELAY);
                })
                .catch(() => {
                    clickedElement.addClass(CONFIG.CSS_CLASSES.PLAYING);
                    setTimeout(() => {
                        this.closePflanze();
                    }, CONFIG.AUDIO_ERROR_FALLBACK_DURATION);
                });
        } else {
            clickedElement.addClass(CONFIG.CSS_CLASSES.PLAYING);
            setTimeout(() => {
                this.closePflanze();
            }, CONFIG.AUDIO_ERROR_FALLBACK_DURATION);
        }
    }

    handleMagicClick(element) {
        const audioFile = element.getAttribute('data-audio');
        const clickedElement = $(element);

        console.log('Magic-Kreis geklickt:', clickedElement.attr('id'), 'Audio:', audioFile);

        if (clickedElement.hasClass(CONFIG.CSS_CLASSES.FULLSCREEN)) {
            this.closeMagic();
            return;
        }

        $(CONFIG.SELECTORS.MAGIC_CIRCLES).removeClass(`${CONFIG.CSS_CLASSES.FULLSCREEN} ${CONFIG.CSS_CLASSES.PLAYING}`);
        this.audioManager.stopSVGAudio();

        clickedElement.addClass(CONFIG.CSS_CLASSES.FULLSCREEN);
        $('#magicCloseButton').addClass(CONFIG.CSS_CLASSES.VISIBLE);

        if (audioFile && audioFile !== '') {
            this.showPlayPauseButton();
            this.audioManager.playMagicAudio(audioFile, clickedElement)
                .then(() => {
                    setTimeout(() => {
                        this.closeMagic();
                    }, CONFIG.AUTO_CLOSE_DELAY);
                })
                .catch(() => {
                    clickedElement.addClass(CONFIG.CSS_CLASSES.PLAYING);
                    setTimeout(() => {
                        this.closeMagic();
                    }, CONFIG.AUDIO_ERROR_FALLBACK_DURATION);
                });
        } else {
            clickedElement.addClass(CONFIG.CSS_CLASSES.PLAYING);
            setTimeout(() => {
                this.closeMagic();
            }, CONFIG.AUDIO_ERROR_FALLBACK_DURATION);
        }
    }

    bindEvents() {
        // Red circle click handlers
        $('#redCircle1').click((e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                return;
            }
            e.stopPropagation(); // Prevent body click handler
            this.handleRedCircleClick(1);
        });
        $('#redCircle2').click((e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                return;
            }
            e.stopPropagation(); // Prevent body click handler
            this.handleRedCircleClick(2);
        });
        $('#redCircle3').click((e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                return;
            }
            e.stopPropagation(); // Prevent body click handler
            this.handleRedCircleClick(3);
        });

        // Anweisungsbox events - close on any click
        $(CONFIG.SELECTORS.ANWEISUNG_BOX).on('click touchend', (e) => {
            this.closeAnweisungsbox();
        });

        // Prevent close button from bubbling up
        $(CONFIG.SELECTORS.CLOSE_BUTTON).on('click touchend', (e) => {
            e.stopPropagation();
            this.closeAnweisungsbox();
        });

        // Close anweisungsbox when clicking anywhere on the body (but not on disabled elements)
        $('body').on('click touchend', (e) => {
            // Only close if anweisungsbox is visible and click is not on anweisungsbox itself
            if ($(CONFIG.SELECTORS.ANWEISUNG_BOX).hasClass(CONFIG.CSS_CLASSES.VISIBLE) &&
                !$(e.target).closest(CONFIG.SELECTORS.ANWEISUNG_BOX).length) {
                this.closeAnweisungsbox();
            }
        });

        // Pflanze events
        $(CONFIG.SELECTORS.PFLANZE_CIRCLES).click((e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                return;
            }
            e.stopPropagation(); // Prevent body click handler
            this.handlePflanzeClick(e.currentTarget);
        });

        $(CONFIG.SELECTORS.PFLANZE_CLOSE_BUTTON).on('click touchend', (e) => {
            e.stopPropagation();
            this.closePflanze();
        });

        // Magic circle events
        $(CONFIG.SELECTORS.MAGIC_CIRCLES).click((e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                return;
            }
            e.stopPropagation(); // Prevent body click handler
            this.handleMagicClick(e.currentTarget);
        });

        $('#magicCloseButton').on('click touchend', (e) => {
            e.stopPropagation();
            this.closeMagic();
        });

        // GPS button events
        $(document).on('click', '#gpsUpdateBtn', () => this.handleGPSUpdate());
        $(document).on('click', '#gpsTrackingBtn', () => this.handleTrackingToggle());
        $(document).on('click', '#gpsTestingBtn', () => this.handleTestingToggle());

        // Audio play/pause button event
        $(document).on('click', '#audioPlayPauseBtn', () => this.handlePlayPauseToggle());

        // Window resize
        $(window).resize(() => {
            if (this.isMobile()) {
                this.currentBackgroundPos = { x: 0, y: 0 };
            }
        });
    }

    handleGPSUpdate() {
        const btn = $('#gpsUpdateBtn');
        btn.addClass('loading').text('GPS...');
        this.showGPSStatus('GPS-Position wird ermittelt...', 'loading');

        this.gpsManager.getCurrentLocation()
            .then(result => {
                btn.removeClass('loading').addClass('success').text('GPS OK');
                this.showGPSStatus(`Position erhalten (±${result.accuracy.toFixed(0)}m)`, 'success');
                setTimeout(() => {
                    btn.removeClass('success').text('📍 GPS Update');
                }, 2000);
            })
            .catch(error => {
                btn.removeClass('loading').addClass('error').text('GPS Fehler');
                this.showGPSStatus('GPS-Fehler: ' + error.message, 'error');
                setTimeout(() => {
                    btn.removeClass('error').text('📍 GPS Update');
                }, 3000);
            });
    }

    handleTrackingToggle() {
        if (this.gpsManager.isCurrentlyTracking()) {
            this.gpsManager.stopTracking();
        } else {
            if (this.gpsManager.startTracking()) {
                this.showGPSStatus('GPS-Tracking wird gestartet...', 'loading');
            }
        }
    }

    handleTestingToggle() {
        const btn = $('#gpsTestingBtn');
        const status = this.gpsManager.getTestingStatus();

        if (status.enabled) {
            // Disable testing mode
            this.gpsManager.disableTestingMode();
            btn.removeClass('active').text('Test Mode');
            this.showGPSStatus('Test-Modus deaktiviert', 'success');
        } else {
            // Enable testing mode
            btn.addClass('loading').text('Setze Position...');
            this.showGPSStatus('Aktuelle Position wird auf ersten Marker gemappt...', 'loading');

            this.gpsManager.enableTestingMode()
                .then(result => {
                    btn.removeClass('loading').addClass('active').text('🧪 Test Aktiv');
                    this.showGPSStatus(`Simulated walking: ${result.path}`, 'success');

                    // Auto-refresh GPS to show new test position
                    setTimeout(() => {
                        this.handleGPSUpdate();
                    }, 500);
                })
                .catch(error => {
                    btn.removeClass('loading').text('Test Mode');
                    this.showGPSStatus('Test-Modus Fehler: ' + error.message, 'error');
                });
        }
    }

    showPlayPauseButton() {
        $('#audioPlayPauseBtn').addClass('visible').text('⏸️');
    }

    hidePlayPauseButton() {
        $('#audioPlayPauseBtn').removeClass('visible');
    }

    handlePlayPauseToggle() {
        const btn = $('#audioPlayPauseBtn');
        const isPlaying = this.audioManager.isPlaying();

        if (isPlaying) {
            if (this.audioManager.pauseCurrentAudio()) {
                btn.text('▶️');
            }
        } else {
            if (this.audioManager.resumeCurrentAudio()) {
                btn.text('⏸️');
            }
        }
    }

    handleMobileSetup() {
        if (this.isMobile()) {
            // Mobile setup if needed
        }
    }

    autoStartGPS() {
        if (this.gpsManager.isGPSAvailable()) {
            setTimeout(() => {
                // Start continuous GPS tracking automatically
                if (this.gpsManager.startTracking()) {
                    console.log('GPS-Tracking automatisch gestartet');
                } else {
                    // Fallback: get single position if tracking fails
                    this.gpsManager.getCurrentLocation()
                        .then(result => {
                            console.log('Initiale GPS-Position erhalten:', result);
                        })
                        .catch(error => {
                            console.log('Initiale GPS-Position konnte nicht ermittelt werden:', error.message);
                        });
                }
            }, 1000);
        }
    }
}