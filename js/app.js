class App {
    constructor() {
        this.currentActiveIndex = 0;
        this.currentBackgroundPos = { x: 0, y: 0 };
        this.audioManager = new AudioManager();
        this.gpsManager = this.initGPSManager();
        this.isStarted = false; // Neuer Status-Flag

        this.init();
    }

    init() {
        this.initGPSFeatures();
        this.bindEvents();
        this.handleMobileSetup();
        this.showStartOverlay(); // Start-Overlay anzeigen
        // GPS wird erst nach dem Start initialisiert
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

        // Only add the audio controls if they don't exist in HTML
        if ($('#audioControlStrip').length === 0) {
            body.append(`
                <div id="audioControlStrip" class="audio-control-strip">
                    <button id="audioPlayPauseBtn" class="audio-play-pause-button">⏸️</button>
                </div>
            `);
        }
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

    showStartOverlay() {
        // Start-Overlay anzeigen und alle Interaktionen blockieren
        this.disableScrolling();
        $('.map-point').addClass('disabled-while-anweisung'); // Alle Map-Points deaktivieren
        $('.morph-container').addClass('disabled-while-anweisung'); // Kraut-Button auch deaktivieren
        $('#startOverlay').show(); // Falls es im CSS versteckt ist
    }

    hideStartOverlay() {
        const overlay = $('#startOverlay');
        overlay.addClass('hidden');

        // Nach der Transition alles aktivieren
        setTimeout(() => {
            this.enableScrolling();
            $('.map-point').removeClass('disabled-while-anweisung');
            $('.morph-container').removeClass('disabled-while-anweisung'); // Kraut-Button wieder aktivieren
            this.isStarted = true;
            this.autoStartGPS(); // GPS erst nach dem Start aktivieren
        }, 1000); // Wartezeit entspricht der CSS-Transition
    }

    disableScrolling() {
        $('body').addClass('no-scroll');
    }

    enableScrolling() {
        $('body').removeClass('no-scroll');
    }

    closeAllMapPoints() {
        // Alle Pflanzen schließen
        $(CONFIG.SELECTORS.PFLANZE_CIRCLES).removeClass(`${CONFIG.CSS_CLASSES.FULLSCREEN} ${CONFIG.CSS_CLASSES.PLAYING}`);
        $(CONFIG.SELECTORS.PFLANZE_CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.VISIBLE);

        // Alle Magic-Kreise schließen
        $(CONFIG.SELECTORS.MAGIC_CIRCLES).removeClass(`${CONFIG.CSS_CLASSES.FULLSCREEN} ${CONFIG.CSS_CLASSES.PLAYING}`);
        $('#magicCloseButton').removeClass(CONFIG.CSS_CLASSES.VISIBLE);

        // Alle Audios stoppen
        this.audioManager.stopAllAudio();
        this.hidePlayPauseButton();

        // MorphContainer schließen
        this.closeMorphContainer2();
    }

    closePflanze() {
        this.closeAllMapPoints();
    }

    closeMagic() {
        this.closeAllMapPoints();
    }

    handleRedCircleClick(circleNumber) {
        // Nicht reagieren wenn noch nicht gestartet
        if (!this.isStarted) return;

        // Alle aktiven Map-Points schließen und Play/Pause-Button verstecken
        this.closeAllMapPoints();

        $('.anweisung').hide();
        $(`.anweisung.nr${circleNumber}`).show();
        $(CONFIG.SELECTORS.ANWEISUNG_BOX).addClass(CONFIG.CSS_CLASSES.VISIBLE);
        $(CONFIG.SELECTORS.CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.ARROW_UP).addClass(CONFIG.CSS_CLASSES.ARROW_DOWN);
        this.disableScrolling();

        // Disable ALL map-point clicks while anweisungsbox is open
        $('.map-point').addClass('disabled-while-anweisung');
        $('.morph-container').addClass('disabled-while-anweisung'); // Kraut-Button auch deaktivieren
    }

    closeAnweisungsbox() {
        $(CONFIG.SELECTORS.ANWEISUNG_BOX).removeClass(CONFIG.CSS_CLASSES.VISIBLE);
        $(CONFIG.SELECTORS.CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.ARROW_DOWN).addClass(CONFIG.CSS_CLASSES.ARROW_UP);
        this.enableScrolling();

        // Re-enable other map-point clicks
        $('.map-point').removeClass('disabled-while-anweisung');
        $('.morph-container').removeClass('disabled-while-anweisung'); // Kraut-Button wieder aktivieren
    }

    handlePflanzeClick(element) {
        // Nicht reagieren wenn noch nicht gestartet
        if (!this.isStarted) return;

        const audioFile = element.getAttribute('data-audio');
        const clickedElement = $(element);

        console.log('Pflanze geklickt:', clickedElement.attr('id'), 'Audio:', audioFile);

        if (clickedElement.hasClass(CONFIG.CSS_CLASSES.FULLSCREEN)) {
            this.closeAllMapPoints();
            return;
        }

        // ALLE anderen Map-Points schließen bevor neuer geöffnet wird
        this.closeAllMapPoints();

        clickedElement.addClass(CONFIG.CSS_CLASSES.FULLSCREEN);
        $(CONFIG.SELECTORS.PFLANZE_CLOSE_BUTTON).addClass(CONFIG.CSS_CLASSES.VISIBLE);

        if (audioFile && audioFile !== '') {
            this.showPlayPauseButton();
            this.audioManager.playPflanzeAudio(audioFile, clickedElement)
                .then(() => {
                    setTimeout(() => {
                        this.closeAllMapPoints();
                    }, CONFIG.AUTO_CLOSE_DELAY);
                })
                .catch(() => {
                    clickedElement.addClass(CONFIG.CSS_CLASSES.PLAYING);
                    setTimeout(() => {
                        this.closeAllMapPoints();
                    }, CONFIG.AUDIO_ERROR_FALLBACK_DURATION);
                });
        } else {
            clickedElement.addClass(CONFIG.CSS_CLASSES.PLAYING);
            setTimeout(() => {
                this.closeAllMapPoints();
            }, CONFIG.AUDIO_ERROR_FALLBACK_DURATION);
        }
    }

    handleMagicClick(element) {
        // Nicht reagieren wenn noch nicht gestartet
        if (!this.isStarted) return;

        const audioFile = element.getAttribute('data-audio');
        const clickedElement = $(element);

        console.log('Magic-Kreis geklickt:', clickedElement.attr('id'), 'Audio:', audioFile);

        if (clickedElement.hasClass(CONFIG.CSS_CLASSES.FULLSCREEN)) {
            this.closeAllMapPoints();
            return;
        }

        // ALLE anderen Map-Points schließen bevor neuer geöffnet wird
        this.closeAllMapPoints();

        clickedElement.addClass(CONFIG.CSS_CLASSES.FULLSCREEN);
        $('#magicCloseButton').addClass(CONFIG.CSS_CLASSES.VISIBLE);

        if (audioFile && audioFile !== '') {
            this.showPlayPauseButton();
            this.audioManager.playMagicAudio(audioFile, clickedElement)
                .then(() => {
                    setTimeout(() => {
                        this.closeAllMapPoints();
                    }, CONFIG.AUTO_CLOSE_DELAY);
                })
                .catch(() => {
                    clickedElement.addClass(CONFIG.CSS_CLASSES.PLAYING);
                    setTimeout(() => {
                        this.closeAllMapPoints();
                    }, CONFIG.AUDIO_ERROR_FALLBACK_DURATION);
                });
        } else {
            clickedElement.addClass(CONFIG.CSS_CLASSES.PLAYING);
            setTimeout(() => {
                this.closeAllMapPoints();
            }, CONFIG.AUDIO_ERROR_FALLBACK_DURATION);
        }
    }

    handleMorphContainer2Click() {
        // Nicht reagieren wenn noch nicht gestartet
        if (!this.isStarted) return;

        const container = $('#morphContainer2');

        if (container.hasClass('expanded')) {
            this.closeMorphContainer2();
        } else {
            this.openMorphContainer2();
        }
    }

    openMorphContainer2() {
        // Schließe alle anderen aktiven Elemente
        this.closeAllMapPoints();
        this.closeAnweisungsbox();

        // Öffne morphContainer2
        $('#morphContainer2').addClass('expanded');
    }

    closeMorphContainer2() {
        $('#morphContainer2').removeClass('expanded');
    }

    bindEvents() {
        // Red circle click handlers - use proper touch detection
        $('#redCircle1').on('click', (e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            e.preventDefault();
            e.stopPropagation(); // Prevent body click handler
            this.handleRedCircleClick(1);
        });
        $('#redCircle2').on('click', (e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            e.preventDefault();
            e.stopPropagation(); // Prevent body click handler
            this.handleRedCircleClick(2);
        });
        $('#redCircle3').on('click', (e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            e.preventDefault();
            e.stopPropagation(); // Prevent body click handler
            this.handleRedCircleClick(3);
        });
        $('#redCircle4').on('click', (e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            e.preventDefault();
            e.stopPropagation(); // Prevent body click handler
            this.handleRedCircleClick(4);
        });

        // MorphContainer2 events
        $('#morphContainer2').on('click', (e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            e.preventDefault();
            e.stopPropagation(); // Prevent body click handler
            this.handleMorphContainer2Click();
        });

        // Anweisungsbox events - close on any click
        $(CONFIG.SELECTORS.ANWEISUNG_BOX).on('click', (e) => {
            e.preventDefault();
            this.closeAnweisungsbox();
        });

        // Prevent close button from bubbling up
        $(CONFIG.SELECTORS.CLOSE_BUTTON).on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeAnweisungsbox();
        });

        // Close anweisungsbox und alle map-points when clicking anywhere on the body
        $('body').on('click', (e) => {
            // Only close if anweisungsbox is visible and click is not on anweisungsbox itself
            if ($(CONFIG.SELECTORS.ANWEISUNG_BOX).hasClass(CONFIG.CSS_CLASSES.VISIBLE) &&
                !$(e.target).closest(CONFIG.SELECTORS.ANWEISUNG_BOX).length) {
                this.closeAnweisungsbox();
            }

            // Close audio control strip und alle map-points when clicking anywhere (but not on the strip itself)
            if ($('#audioControlStrip').hasClass('visible') &&
                !$(e.target).closest('#audioControlStrip').length &&
                !$(e.target).closest('.map-point').length) { // Wichtig: nicht bei map-point clicks schließen
                this.closeAllMapPoints(); // Neue Methode verwenden
            }

            // Close morphContainer2 when clicking outside
            if ($('#morphContainer2').hasClass('expanded') &&
                !$(e.target).closest('#morphContainer2').length) {
                this.closeMorphContainer2();
            }
        });

        // Pflanze events
        $(CONFIG.SELECTORS.PFLANZE_CIRCLES).on('click', (e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            e.preventDefault();
            e.stopPropagation(); // Prevent body click handler
            this.handlePflanzeClick(e.currentTarget);
        });

        $(CONFIG.SELECTORS.PFLANZE_CLOSE_BUTTON).on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closePflanze();
        });

        // Magic circle events
        $(CONFIG.SELECTORS.MAGIC_CIRCLES).on('click', (e) => {
            // Don't handle click if disabled while anweisungsbox is open
            if ($(e.currentTarget).hasClass('disabled-while-anweisung')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            e.preventDefault();
            e.stopPropagation(); // Prevent body click handler
            this.handleMagicClick(e.currentTarget);
        });

        $('#magicCloseButton').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeMagic();
        });

        // GPS button events
        $(document).on('click', '#gpsUpdateBtn', () => this.handleGPSUpdate());
        $(document).on('click', '#gpsTrackingBtn', () => this.handleTrackingToggle());
        $(document).on('click', '#gpsTestingBtn', () => this.handleTestingToggle());

        // Start button event
        $(document).on('click', '#startButton', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hideStartOverlay();
        });

        // Audio play/pause button event
        $(document).on('click', '#audioPlayPauseBtn', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Verhindert, dass der body click handler ausgelöst wird
            this.handlePlayPauseToggle();
        });

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
        $('#audioControlStrip').addClass('visible');
        $('#audioPlayPauseBtn').text('pause');
    }

    hidePlayPauseButton() {
        $('#audioControlStrip').removeClass('visible');
    }

    handlePlayPauseToggle() {
        const btn = $('#audioPlayPauseBtn');
        const isPlaying = this.audioManager.isPlaying();

        if (isPlaying) {
            if (this.audioManager.pauseCurrentAudio()) {
                btn.text('play');
            }
        } else {
            if (this.audioManager.resumeCurrentAudio()) {
                btn.text('pause');
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