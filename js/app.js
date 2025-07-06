class App {
  constructor() {
    this.currentActiveIndex = 0;
    this.currentBackgroundPos = { x: 0, y: 0 };
    this.audioManager = new AudioManager();
    this.gpsManager = this.initGPSManager();
    
    this.init();
  }

  init() {
    this.positionSVGsRandomly();
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
      this.checkProximityToMarkers(data);
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

  positionSVGsRandomly() {
    const svgIcons = $(CONFIG.SELECTORS.SVG_ICONS);
    const usedPositions = [];
    const minDistance = CONFIG.MIN_DISTANCE_BETWEEN_SVGS;

    svgIcons.each((index, element) => {
      let position;
      let attempts = 0;
      const maxAttempts = CONFIG.MAX_POSITIONING_ATTEMPTS;

      do {
        const top = Math.random() * (window.innerHeight - CONFIG.SVG_SIZE_OFFSET) + CONFIG.SVG_POSITIONING_MARGIN;
        const left = Math.random() * (window.innerWidth - CONFIG.SVG_SIZE_OFFSET) + CONFIG.SVG_POSITIONING_MARGIN;

        position = { top, left };
        attempts++;

        const isFree = usedPositions.every(usedPos => {
          const distance = Math.sqrt(
            Math.pow(position.top - usedPos.top, 2) +
            Math.pow(position.left - usedPos.left, 2)
          );
          return distance >= minDistance;
        });

        if (isFree || attempts >= maxAttempts) {
          break;
        }
      } while (true);

      $(element).css({
        'top': position.top + 'px',
        'left': position.left + 'px'
      });

      usedPositions.push(position);
    });
  }

  initGPSFeatures() {
    let body = $('body');
    body.append('<button id="gpsUpdateBtn" class="gps-update-button">📍 GPS Update</button>');
    body.append('<button id="gpsTrackingBtn" class="gps-tracking-toggle">🎯</button>');
    body.append('<div id="gpsStatus" class="gps-status"></div>');
    body.append('<div id="gpsCoordinates" class="gps-coordinates"></div>');
    
    this.addProximityCSS();
  }

  addProximityCSS() {
    const proximityCSS = `
      <style>
        .proximity-highlight {
          animation: proximityPulse 2s infinite;
          z-index: 30 !important;
        }
        @keyframes proximityPulse {
          0% { 
            transform: scale(1);
            filter: drop-shadow(0px 0px 30px rgb(9, 255, 0));
          }
          50% { 
            transform: scale(1.1);
            filter: drop-shadow(0px 0px 50px rgb(255, 255, 0));
          }
          100% { 
            transform: scale(1);
            filter: drop-shadow(0px 0px 30px rgb(9, 255, 0));
          }
        }
      </style>
    `;
    $('head').append(proximityCSS);
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
      Karte: ${data.vhPos.x.toFixed(1)}vh, ${data.vhPos.y.toFixed(1)}vh<br>
      Genauigkeit: ±${data.accuracy ? data.accuracy.toFixed(0) + 'm' : 'unbekannt'}
    `).addClass('visible');
  }

  checkProximityToMarkers(data) {
    CONFIG.GPS_MARKERS.forEach(marker => {
      if (this.gpsManager.isNearPoint(marker.lat, marker.lng, marker.radius)) {
        console.log(`User ist in der Nähe von ${marker.id}`);
        this.triggerMarkerProximity(marker.id);
      }
    });
  }

  triggerMarkerProximity(markerId) {
    $(`#${markerId}`).addClass(CONFIG.CSS_CLASSES.PROXIMITY_HIGHLIGHT);
    this.showGPSStatus(`In der Nähe von ${markerId}`, 'success');

    setTimeout(() => {
      $(`#${markerId}`).removeClass(CONFIG.CSS_CLASSES.PROXIMITY_HIGHLIGHT);
    }, CONFIG.PROXIMITY_HIGHLIGHT_DURATION);
  }

  closePflanze() {
    $(CONFIG.SELECTORS.PFLANZE_CIRCLES).removeClass(`${CONFIG.CSS_CLASSES.FULLSCREEN} ${CONFIG.CSS_CLASSES.PLAYING}`);
    $(CONFIG.SELECTORS.PFLANZE_CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.VISIBLE);
    this.audioManager.stopPflanzeAudio();
  }

  closeMagic() {
    $(CONFIG.SELECTORS.MAGIC_CIRCLES).removeClass(`${CONFIG.CSS_CLASSES.FULLSCREEN} ${CONFIG.CSS_CLASSES.PLAYING}`);
    $('#magicCloseButton').removeClass(CONFIG.CSS_CLASSES.VISIBLE);
    this.audioManager.stopSVGAudio();
  }

  handleRedCircleClick(circleNumber) {
    $('.anweisung').hide();
    $(`.anweisung.nr${circleNumber}`).show();
    $(CONFIG.SELECTORS.ANWEISUNG_BOX).addClass(CONFIG.CSS_CLASSES.VISIBLE);
    $(CONFIG.SELECTORS.CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.ARROW_UP).addClass(CONFIG.CSS_CLASSES.ARROW_DOWN);
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
    $('#redCircle1').click(() => this.handleRedCircleClick(1));
    $('#redCircle2').click(() => this.handleRedCircleClick(2));
    $('#redCircle3').click(() => this.handleRedCircleClick(3));

    // Anweisungsbox events
    $(CONFIG.SELECTORS.ANWEISUNG_BOX).on('click touchend', (e) => {
      if (!$(e.target).is(CONFIG.SELECTORS.CLOSE_BUTTON)) {
        $(CONFIG.SELECTORS.ANWEISUNG_BOX).removeClass(CONFIG.CSS_CLASSES.VISIBLE);
        $(CONFIG.SELECTORS.CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.ARROW_DOWN).addClass(CONFIG.CSS_CLASSES.ARROW_UP);
      }
    });

    $(CONFIG.SELECTORS.CLOSE_BUTTON).on('click touchend', (e) => {
      e.stopPropagation();
      $(CONFIG.SELECTORS.ANWEISUNG_BOX).removeClass(CONFIG.CSS_CLASSES.VISIBLE);
      $(CONFIG.SELECTORS.CLOSE_BUTTON).removeClass(CONFIG.CSS_CLASSES.ARROW_DOWN).addClass(CONFIG.CSS_CLASSES.ARROW_UP);
    });

    // Pflanze events
    $(CONFIG.SELECTORS.PFLANZE_CIRCLES).click((e) => {
      this.handlePflanzeClick(e.currentTarget);
    });

    $(CONFIG.SELECTORS.PFLANZE_CLOSE_BUTTON).on('click touchend', (e) => {
      e.stopPropagation();
      this.closePflanze();
    });

    // Magic circle events
    $(CONFIG.SELECTORS.MAGIC_CIRCLES).click((e) => {
      this.handleMagicClick(e.currentTarget);
    });

    $('#magicCloseButton').on('click touchend', (e) => {
      e.stopPropagation();
      this.closeMagic();
    });

    // GPS button events
    $(document).on('click', '#gpsUpdateBtn', () => this.handleGPSUpdate());
    $(document).on('click', '#gpsTrackingBtn', () => this.handleTrackingToggle());

    // Window resize
    $(window).resize(() => {
      this.positionSVGsRandomly();
      if (this.isMobile()) {
        this.currentBackgroundPos = { x: 0, y: 0 };
        $(CONFIG.SELECTORS.FULLSIZE_IMAGE, '.karte').css('transform', 'translateX(0px)');
        setTimeout(() => {
          this.saveOriginalRedCirclePositions();
        }, 100);
      }
    });
  }

  handleGPSUpdate() {
    const btn = $('#gpsUpdateBtn');
    btn.addClass('loading').text('🔄 GPS...');
    this.showGPSStatus('GPS-Position wird ermittelt...', 'loading');

    this.gpsManager.getCurrentLocation()
      .then(result => {
        btn.removeClass('loading').addClass('success').text('✅ GPS OK');
        this.showGPSStatus(`Position erhalten (±${result.accuracy.toFixed(0)}m)`, 'success');
        setTimeout(() => {
          btn.removeClass('success').text('📍 GPS Update');
        }, 2000);
      })
      .catch(error => {
        btn.removeClass('loading').addClass('error').text('❌ GPS Fehler');
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

  handleMobileSetup() {
    if (this.isMobile()) {
      setTimeout(() => {
        this.saveOriginalRedCirclePositions();
      }, 100);
    }
  }

  saveOriginalRedCirclePositions() {
    $(CONFIG.SELECTORS.RED_CIRCLES).each((index, element) => {
      const position = $(element).position();
      $(element).data('original-top', position.top);
      $(element).data('original-left', position.left);
    });
  }

  autoStartGPS() {
    if (this.gpsManager.isGPSAvailable()) {
      setTimeout(() => {
        this.gpsManager.getCurrentLocation()
          .then(result => {
            console.log('Initiale GPS-Position erhalten:', result);
          })
          .catch(error => {
            console.log('Initiale GPS-Position konnte nicht ermittelt werden:', error.message);
          });
      }, 1000);
    }
  }
}