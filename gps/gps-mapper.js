/**
 * GPS-Mapper für gedrehte Karten
 * Transformiert GPS-Koordinaten zu viewport-height (vh) Koordinaten
 */
class GPSMapper {
    constructor() {
        this.referencePoints = [];
        this.currentPosition = null;
        this.watchId = null;
        this.isTracking = false;

        // Referenzpunkte initialisieren
        this.initReferencePoints();
    }

    /**
     * Initialisiert die Referenzpunkte
     * WICHTIG: Diese Koordinaten müssen durch echte GPS-Koordinaten ersetzt werden
     */
    initReferencePoints() {
        const referencePoints = [
            // Format: { lat: GPS_LATITUDE, lng: GPS_LONGITUDE, x: VH_X, y: VH_Y }
            {lat: 51.492060, lng: 11.956057, x: 15, y: 55},  // Beispiel für redCircle1
            {lat: 51.491434, lng: 11.956762, x: 50, y: 65},  // Beispiel für redCircle2s
            {lat: 51.490917, lng: 11.956818, x: 105, y: 80}, // Beispiel für redCircle3
        ];

        referencePoints.forEach(point => {
            this.addReferencePoint(point.lat, point.lng, point.x, point.y);
        });

        console.log(`GPS-Mapper: ${this.referencePoints.length} Referenzpunkte geladen`);
    }

    /**
     * Fügt einen Referenzpunkt hinzu
     */
    addReferencePoint(lat, lng, x, y) {
        this.referencePoints.push({lat, lng, x, y});
    }

    /**
     * Entfernt alle Referenzpunkte
     */
    clearReferencePoints() {
        this.referencePoints = [];
    }

    /**
     * Transformiert GPS-Koordinaten zu vh-Koordinaten
     * Verwendet Inverse Distance Weighting (IDW)
     */
    transformGPSToVH(lat, lng) {
        if (this.referencePoints.length < 3) {
            throw new Error('Mindestens 3 Referenzpunkte für GPS-Transformation benötigt');
        }

        let totalWeight = 0;
        let weightedX = 0;
        let weightedY = 0;

        this.referencePoints.forEach(ref => {
            // Euklidische Distanz zwischen GPS-Punkten
            const distance = Math.sqrt(
                Math.pow(lat - ref.lat, 2) + Math.pow(lng - ref.lng, 2)
            );

            // Gewichtung: 1/Distanz (mit kleinem Offset um Division durch 0 zu vermeiden)
            const weight = 1 / (distance + 0.000001);

            weightedX += ref.x * weight;
            weightedY += ref.y * weight;
            totalWeight += weight;
        });

        return {
            x: weightedX / totalWeight,
            y: weightedY / totalWeight
        };
    }

    /**
     * Alternative Transformation mit Affiner Transformation
     * Für erweiterte Kontrolle über Rotation und Skalierung
     */
    transformGPSToVHAffine(lat, lng) {
        if (this.referencePoints.length < 3) {
            throw new Error('Mindestens 3 Referenzpunkte für affine Transformation benötigt');
        }

        // Vereinfachte Implementierung - für komplexere Fälle
        // würde hier eine vollständige Affine Transformation implementiert
        return this.transformGPSToVH(lat, lng);
    }

    /**
     * Zeigt die Benutzerposition auf der Karte an
     */
    showUserPosition(lat, lng, accuracy = null) {
        try {
            const vhPos = this.transformGPSToVH(lat, lng);

            // Bestehenden User-Marker entfernen
            this.removeUserMarker();

            // Neuen User-Marker erstellen
            const userMarker = this.createUserMarker(vhPos, accuracy);

            // Zur Karte hinzufügen
            $('.hintergrund').append(userMarker);

            // Position speichern
            this.currentPosition = {lat, lng, x: vhPos.x, y: vhPos.y, accuracy};

            console.log(`User Position: GPS(${lat.toFixed(6)}, ${lng.toFixed(6)}) -> VH(${vhPos.x.toFixed(1)}, ${vhPos.y.toFixed(1)})`);

            // Event für Positionsupdate feuern
            this.triggerPositionUpdate({lat, lng, vhPos, accuracy});

            return vhPos;
        } catch (error) {
            console.error('Fehler beim Anzeigen der Position:', error);
            this.triggerError(error);
            return null;
        }
    }

    /**
     * Erstellt den User-Marker DOM-Element
     */
    createUserMarker(vhPos, accuracy) {
        const userMarker = $(`
      <div id="userMarker" class="gps-user-position">
        <div class="gps-user-dot"></div>
        ${accuracy ? `<div class="gps-accuracy-circle" style="width: ${this.accuracyToVH(accuracy)}vh; height: ${this.accuracyToVH(accuracy)}vh;"></div>` : ''}
      </div>
    `);

        // Position setzen
        userMarker.css({
            'top': `${vhPos.y}vh`,
            'left': `${vhPos.x}vh`
        });

        return userMarker;
    }

    /**
     * Konvertiert GPS-Genauigkeit (Meter) zu vh für Anzeige
     */
    accuracyToVH(accuracyMeters) {
        // 100vh = 135 meters, also 1vh = 1.35 meters
        const metersPerVH = 1.35;
        return Math.min(Math.max(accuracyMeters / metersPerVH, 0.5), 50); // Min 0.5vh, Max 50vh
    }

    /**
     * Entfernt den User-Marker
     */
    removeUserMarker() {
        $('#userMarker').remove();
    }

    /**
     * Ermittelt die aktuelle GPS-Position
     */
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const error = new Error('Geolocation wird vom Browser nicht unterstützt');
                reject(error);
                return;
            }

            console.log('GPS-Position wird ermittelt...');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    let lat = position.coords.latitude;
                    let lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;

                    // Check if testing mode is enabled and apply offset
                    if (window.CONFIG && window.CONFIG.GPS_TESTING.ENABLED) {
                        lat += window.CONFIG.GPS_TESTING.TEST_OFFSET.lat;
                        lng += window.CONFIG.GPS_TESTING.TEST_OFFSET.lng;
                        console.log(`GPS-Testing aktiv: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${accuracy}m) [OFFSET]`);
                    } else {
                        console.log(`GPS erhalten: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${accuracy}m)`);
                    }

                    const vhPos = this.showUserPosition(lat, lng, accuracy);
                    const result = {lat, lng, accuracy, vhPos, testing: window.CONFIG?.GPS_TESTING.ENABLED || false};
                    resolve(result);
                },
                (error) => {
                    console.error('GPS-Fehler:', error.message);
                    this.triggerError(error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000 // 1 Minute Cache
                }
            );
        });
    }

    /**
     * Startet kontinuierliches GPS-Tracking
     */
    startTracking() {
        if (!navigator.geolocation) {
            console.error('Geolocation wird nicht unterstützt');
            return false;
        }

        if (this.isTracking) {
            console.warn('GPS-Tracking läuft bereits');
            return true;
        }

        console.log('GPS-Tracking wird gestartet...');

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                let lat = position.coords.latitude;
                let lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                // Apply test offset if testing mode is enabled
                if (window.CONFIG && window.CONFIG.GPS_TESTING.ENABLED) {
                    lat += window.CONFIG.GPS_TESTING.TEST_OFFSET.lat;
                    lng += window.CONFIG.GPS_TESTING.TEST_OFFSET.lng;
                    console.log(`GPS-Tracking (Test): ${lat.toFixed(6)}, ${lng.toFixed(6)} [OFFSET]`);
                } else {
                    console.log(`GPS-Tracking: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                }

                this.showUserPosition(lat, lng, accuracy);
            },
            (error) => {
                console.error('GPS-Tracking-Fehler:', error.message);
                this.triggerError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 3000
            }
        );

        this.isTracking = true;
        this.triggerTrackingStart();
        return true;
    }

    /**
     * Stoppt das GPS-Tracking
     */
    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        this.isTracking = false;
        this.triggerTrackingStop();
        console.log('GPS-Tracking gestoppt');
    }

    /**
     * Prüft ob der User in der Nähe eines bestimmten Punktes ist
     */
    isNearPoint(targetLat, targetLng, radiusMeters = 50) {
        if (!this.currentPosition) {
            return false;
        }

        const distance = this.calculateDistance(
            this.currentPosition.lat,
            this.currentPosition.lng,
            targetLat,
            targetLng
        );

        return distance <= radiusMeters;
    }

    /**
     * Berechnet die Distanz zwischen zwei GPS-Punkten (Haversine-Formel)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Erdradius in Metern
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distanz in Metern
    }

    /**
     * Konvertiert Grad zu Radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Event-Handler für Positionsupdate
     */
    triggerPositionUpdate(data) {
        $(document).trigger('gps:positionUpdate', data);
    }

    /**
     * Event-Handler für Fehler
     */
    triggerError(error) {
        $(document).trigger('gps:error', error);
    }

    /**
     * Event-Handler für Tracking-Start
     */
    triggerTrackingStart() {
        $(document).trigger('gps:trackingStart');
    }

    /**
     * Event-Handler für Tracking-Stop
     */
    triggerTrackingStop() {
        $(document).trigger('gps:trackingStop');
    }

    /**
     * Gibt aktuelle Position zurück
     */
    getCurrentPosition() {
        return this.currentPosition;
    }

    /**
     * Prüft ob GPS verfügbar ist
     */
    isGPSAvailable() {
        return 'geolocation' in navigator;
    }

    /**
     * Prüft ob gerade getrackt wird
     */
    isCurrentlyTracking() {
        return this.isTracking;
    }

    /**
     * Aktiviert den GPS-Testing-Modus
     * Berechnet Offset um aktuelle Position auf ersten Marker zu mappen
     */
    enableTestingMode() {
        if (!window.CONFIG || !window.CONFIG.GPS_MARKERS || window.CONFIG.GPS_MARKERS.length === 0) {
            console.error('CONFIG oder GPS_MARKERS nicht verfügbar');
            return Promise.reject(new Error('Konfiguration nicht verfügbar'));
        }

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation wird vom Browser nicht unterstützt'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Aktuelle Position speichern
                    window.CONFIG.GPS_TESTING.REAL_LOCATION = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    // Offset berechnen um aktuelle Position auf ersten Marker zu mappen
                    const firstMarker = window.CONFIG.GPS_MARKERS[0];
                    window.CONFIG.GPS_TESTING.TEST_OFFSET = {
                        lat: firstMarker.lat - position.coords.latitude,
                        lng: firstMarker.lng - position.coords.longitude
                    };

                    // Testing-Modus aktivieren
                    window.CONFIG.GPS_TESTING.ENABLED = true;

                    console.log(`GPS-Testing-Modus aktiviert:`);
                    console.log(`Echte Position: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
                    console.log(`Gemappt auf: ${firstMarker.id} (${firstMarker.lat.toFixed(6)}, ${firstMarker.lng.toFixed(6)})`);
                    console.log(`Offset: ${window.CONFIG.GPS_TESTING.TEST_OFFSET.lat.toFixed(6)}, ${window.CONFIG.GPS_TESTING.TEST_OFFSET.lng.toFixed(6)}`);

                    resolve({
                        realLocation: window.CONFIG.GPS_TESTING.REAL_LOCATION,
                        mappedTo: firstMarker,
                        offset: window.CONFIG.GPS_TESTING.TEST_OFFSET
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                }
            );
        });
    }

    /**
     * Deaktiviert den GPS-Testing-Modus
     */
    disableTestingMode() {
        if (window.CONFIG) {
            window.CONFIG.GPS_TESTING.ENABLED = false;
            window.CONFIG.GPS_TESTING.REAL_LOCATION = null;
            window.CONFIG.GPS_TESTING.TEST_OFFSET = {lat: 0, lng: 0};
            console.log('GPS-Testing-Modus deaktiviert');
            return true;
        }
        return false;
    }

    /**
     * Gibt den aktuellen Testing-Status zurück
     */
    getTestingStatus() {
        if (!window.CONFIG) return {enabled: false};

        return {
            enabled: window.CONFIG.GPS_TESTING.ENABLED,
            realLocation: window.CONFIG.GPS_TESTING.REAL_LOCATION,
            offset: window.CONFIG.GPS_TESTING.TEST_OFFSET
        };
    }
}

// GPS-Manager als globale Variable
window.GPSMapper = GPSMapper;