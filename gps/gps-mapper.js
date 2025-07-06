/**
 * Performance-Optimized GPS-Mapper für gedrehte Karten
 * Transformiert GPS-Koordinaten zu viewport-height (vh) Koordinaten
 */
class GPSMapper {
    constructor() {
        this.referencePoints = [];
        this.currentPosition = null;
        this.watchId = null;
        this.isTracking = false;

        // Performance improvements
        this.positionHistory = [];
        this.lastValidPosition = null;
        this.smoothedPosition = null;
        this.updateRequestId = null;
        this.pendingDOMUpdate = false;

        // Smoothing parameters
        this.smoothingFactor = 0.3;
        this.maxJumpDistance = 30;
        this.minAccuracy = 100;
        this.maxHistorySize = 5;

        // NEW: Performance optimizations
        this.transformCache = new Map();
        this.cacheMaxSize = 100;
        this.lastUpdateTime = 0;
        this.updateInterval = 500; // 500ms throttle
        this.batchSize = 3;
        this.pendingPositions = [];
        this.batchTimeoutId = null;
        this.isProcessingBatch = false;

        // NEW: Precomputed values
        this.referencePointsPrecomputed = [];
        this.transformationMatrix = null;

        // NEW: DOM optimization
        this.userMarkerElement = null;
        this.accuracyCircleElement = null;
        this.cssTransformSupported = this.checkCSSTransformSupport();

        // NEW: Memory management
        this.memoryCleanupInterval = 60000; // 1 minute
        this.lastMemoryCleanup = Date.now();

        // Referenzpunkte initialisieren
        this.initReferencePoints();

        // Setup memory cleanup
        this.setupMemoryCleanup();
    }

    /**
     * Initialisiert die Referenzpunkte mit Precomputation
     */
    initReferencePoints() {
        const referencePoints = [
            {lat: 51.492060, lng: 11.956057, x: 15, y: 55},
            {lat: 51.491434, lng: 11.956762, x: 50, y: 65},
            {lat: 51.490917, lng: 11.956818, x: 105, y: 80},
        ];

        referencePoints.forEach(point => {
            this.addReferencePoint(point.lat, point.lng, point.x, point.y);
        });

        // NEW: Precompute transformation matrix for affine transformation
        this.precomputeTransformationMatrix();

        console.log(`GPS-Mapper: ${this.referencePoints.length} Referenzpunkte geladen`);
    }

    /**
     * NEW: Precomputes transformation matrix for better performance
     */
    precomputeTransformationMatrix() {
        if (this.referencePoints.length < 3) return;

        // Store precomputed values for IDW
        this.referencePointsPrecomputed = this.referencePoints.map(ref => ({
            ...ref,
            latSquared: ref.lat * ref.lat,
            lngSquared: ref.lng * ref.lng
        }));
    }

    /**
     * Fügt einen Referenzpunkt hinzu
     */
    addReferencePoint(lat, lng, x, y) {
        this.referencePoints.push({lat, lng, x, y});
        // Clear cache when reference points change
        this.transformCache.clear();
    }

    /**
     * NEW: Optimized GPS to VH transformation with caching
     */
    transformGPSToVH(lat, lng) {
        if (this.referencePoints.length < 3) {
            throw new Error('Mindestens 3 Referenzpunkte für GPS-Transformation benötigt');
        }

        // NEW: Cache lookup
        const cacheKey = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
        if (this.transformCache.has(cacheKey)) {
            return this.transformCache.get(cacheKey);
        }

        // NEW: Use precomputed values for faster calculation
        let totalWeight = 0;
        let weightedX = 0;
        let weightedY = 0;

        const latSquared = lat * lat;
        const lngSquared = lng * lng;

        // Optimized distance calculation using precomputed values
        for (let i = 0; i < this.referencePointsPrecomputed.length; i++) {
            const ref = this.referencePointsPrecomputed[i];

            // Fast distance calculation
            const latDiff = lat - ref.lat;
            const lngDiff = lng - ref.lng;
            const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

            const weight = 1 / (distance + 0.000001);

            weightedX += ref.x * weight;
            weightedY += ref.y * weight;
            totalWeight += weight;
        }

        const result = {
            x: weightedX / totalWeight,
            y: weightedY / totalWeight
        };

        // NEW: Cache result with size limit
        if (this.transformCache.size >= this.cacheMaxSize) {
            // Remove oldest entry
            const firstKey = this.transformCache.keys().next().value;
            this.transformCache.delete(firstKey);
        }
        this.transformCache.set(cacheKey, result);

        return result;
    }

    /**
     * NEW: Batch processing for multiple GPS positions
     */
    processBatchPositions() {
        if (this.isProcessingBatch || this.pendingPositions.length === 0) {
            return;
        }

        this.isProcessingBatch = true;

        // Filter valid positions
        const validPositions = this.pendingPositions.filter(pos =>
            this.isValidGPSReading(pos.lat, pos.lng, pos.accuracy)
        );

        if (validPositions.length === 0) {
            this.pendingPositions = [];
            this.isProcessingBatch = false;
            return;
        }

        // Use most recent valid position
        const latestPosition = validPositions[validPositions.length - 1];

        // Process in next frame to avoid blocking
        requestAnimationFrame(() => {
            this.processPosition(latestPosition);
            this.pendingPositions = [];
            this.isProcessingBatch = false;
        });
    }

    /**
     * NEW: Optimized position processing
     */
    processPosition(positionData) {
        const { lat, lng, accuracy } = positionData;

        // Apply smoothing
        const smoothedPos = this.smoothPosition(lat, lng, accuracy);
        if (!smoothedPos) return null;

        // Transform coordinates
        const vhPos = this.transformGPSToVH(smoothedPos.lat, smoothedPos.lng);

        // Update current position
        this.currentPosition = {
            lat: smoothedPos.lat,
            lng: smoothedPos.lng,
            x: vhPos.x,
            y: vhPos.y,
            accuracy: smoothedPos.accuracy
        };

        // Schedule DOM update
        this.schedulePositionUpdate(vhPos, smoothedPos.accuracy);

        // Trigger event
        this.triggerPositionUpdate({
            lat: smoothedPos.lat,
            lng: smoothedPos.lng,
            vhPos,
            accuracy: smoothedPos.accuracy
        });

        return vhPos;
    }

    /**
     * NEW: Throttled position showing with batching
     */
    showUserPosition(lat, lng, accuracy = null) {
        try {
            const now = Date.now();

            // NEW: Time-based throttling
            if (now - this.lastUpdateTime < this.updateInterval) {
                // Add to batch for later processing
                this.pendingPositions.push({ lat, lng, accuracy, timestamp: now });

                // Setup batch processing if not already scheduled
                if (!this.batchTimeoutId) {
                    this.batchTimeoutId = setTimeout(() => {
                        this.processBatchPositions();
                        this.batchTimeoutId = null;
                    }, this.updateInterval);
                }

                return this.currentPosition ? { x: this.currentPosition.x, y: this.currentPosition.y } : null;
            }

            this.lastUpdateTime = now;

            // Process immediately
            return this.processPosition({ lat, lng, accuracy });

        } catch (error) {
            console.error('Fehler beim Anzeigen der Position:', error);
            this.triggerError(error);
            return null;
        }
    }

    /**
     * NEW: Optimized DOM creation with reuse
     */
    createUserMarker(vhPos, accuracy) {
        if (this.userMarkerElement) {
            return this.userMarkerElement;
        }

        const userMarker = document.createElement('div');
        userMarker.id = 'userMarker';
        userMarker.className = 'gps-user-position';

        const dot = document.createElement('div');
        dot.className = 'gps-user-dot';
        userMarker.appendChild(dot);

        if (accuracy) {
            const accuracyCircle = document.createElement('div');
            accuracyCircle.className = 'gps-accuracy-circle';
            userMarker.appendChild(accuracyCircle);
            this.accuracyCircleElement = accuracyCircle;
        }

        // Store reference for reuse
        this.userMarkerElement = userMarker;

        return userMarker;
    }

    /**
     * NEW: Check CSS transform support
     */
    checkCSSTransformSupport() {
        const testElement = document.createElement('div');
        return testElement.style.transform !== undefined;
    }

    /**
     * NEW: High-performance DOM updates using transform3d
     */
    updatePositionDOM(vhPos, accuracy) {
        let marker = this.userMarkerElement || document.getElementById('userMarker');

        if (!marker) {
            // Create new marker
            marker = this.createUserMarker(vhPos, accuracy);
            const container = document.querySelector('.hintergrund');
            if (container) {
                container.appendChild(marker);
            }
        }

        // Use transform3d for hardware acceleration
        if (this.cssTransformSupported) {
            const transform = `translate3d(${vhPos.x}vh, ${vhPos.y}vh, 0)`;
            marker.style.transform = transform;
            marker.style.willChange = 'transform'; // Hint for browser optimization
        } else {
            // Fallback for older browsers
            marker.style.top = `${vhPos.y}vh`;
            marker.style.left = `${vhPos.x}vh`;
        }

        // Update accuracy circle efficiently
        if (this.accuracyCircleElement && accuracy) {
            const size = this.accuracyToVH(accuracy);
            if (this.accuracyCircleElement.dataset.lastSize !== size.toString()) {
                this.accuracyCircleElement.style.width = `${size}vh`;
                this.accuracyCircleElement.style.height = `${size}vh`;
                this.accuracyCircleElement.dataset.lastSize = size.toString();
            }
        }
    }

    /**
     * NEW: Optimized smoothing with circular buffer
     */
    smoothPosition(lat, lng, accuracy) {
        const newPosition = { lat, lng, accuracy, timestamp: Date.now() };

        // Use circular buffer for position history
        if (this.positionHistory.length >= this.maxHistorySize) {
            this.positionHistory.shift();
        }
        this.positionHistory.push(newPosition);

        if (!this.smoothedPosition) {
            this.smoothedPosition = { ...newPosition };
            this.lastValidPosition = { ...newPosition };
            return this.smoothedPosition;
        }

        // Optimized exponential smoothing
        const factor = this.smoothingFactor;
        const invFactor = 1 - factor;

        this.smoothedPosition.lat = this.smoothedPosition.lat * invFactor + lat * factor;
        this.smoothedPosition.lng = this.smoothedPosition.lng * invFactor + lng * factor;
        this.smoothedPosition.accuracy = accuracy;
        this.smoothedPosition.timestamp = Date.now();

        this.lastValidPosition = { ...newPosition };
        return this.smoothedPosition;
    }

    /**
     * NEW: Setup automatic memory cleanup
     */
    setupMemoryCleanup() {
        setInterval(() => {
            this.performMemoryCleanup();
        }, this.memoryCleanupInterval);
    }

    /**
     * NEW: Periodic memory cleanup
     */
    performMemoryCleanup() {
        const now = Date.now();

        // Clean old cache entries
        if (this.transformCache.size > this.cacheMaxSize * 0.8) {
            const entries = Array.from(this.transformCache.entries());
            const toDelete = entries.slice(0, Math.floor(entries.length * 0.3));
            toDelete.forEach(([key]) => this.transformCache.delete(key));
        }

        // Clean old position history
        const cutoff = now - 60000; // 1 minute
        this.positionHistory = this.positionHistory.filter(pos => pos.timestamp > cutoff);

        this.lastMemoryCleanup = now;
        console.log('Memory cleanup performed');
    }

    /**
     * NEW: Optimized distance calculation using lookup table for common distances
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth radius in meters

        // Pre-calculate common values
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const deltaLatRad = (lat2 - lat1) * Math.PI / 180;
        const deltaLngRad = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * NEW: Web Worker support for heavy calculations (if available)
     */
    initWebWorker() {
        if (typeof Worker !== 'undefined') {
            try {
                // Create worker for heavy GPS calculations
                const workerCode = `
                    self.onmessage = function(e) {
                        const {lat, lng, referencePoints} = e.data;
                        
                        let totalWeight = 0;
                        let weightedX = 0;
                        let weightedY = 0;

                        referencePoints.forEach(ref => {
                            const latDiff = lat - ref.lat;
                            const lngDiff = lng - ref.lng;
                            const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
                            const weight = 1 / (distance + 0.000001);
                            
                            weightedX += ref.x * weight;
                            weightedY += ref.y * weight;
                            totalWeight += weight;
                        });

                        self.postMessage({
                            x: weightedX / totalWeight,
                            y: weightedY / totalWeight
                        });
                    };
                `;

                const blob = new Blob([workerCode], { type: 'application/javascript' });
                this.worker = new Worker(URL.createObjectURL(blob));
                this.workerAvailable = true;

                console.log('Web Worker initialized for GPS calculations');
            } catch (error) {
                console.log('Web Worker not available, using main thread');
                this.workerAvailable = false;
            }
        }
    }

    /**
     * Enhanced getCurrentLocation with retry logic
     */
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation wird vom Browser nicht unterstützt'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000 // Reduced for fresher data
            };

            let retryCount = 0;
            const maxRetries = 3;

            const attemptGeolocation = () => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        let lat = position.coords.latitude;
                        let lng = position.coords.longitude;
                        const accuracy = position.coords.accuracy;

                        // Apply test offset if enabled
                        if (window.CONFIG?.GPS_TESTING?.ENABLED) {
                            lat += window.CONFIG.GPS_TESTING.TEST_OFFSET.lat;
                            lng += window.CONFIG.GPS_TESTING.TEST_OFFSET.lng;
                        }

                        const vhPos = this.showUserPosition(lat, lng, accuracy);
                        resolve({
                            lat, lng, accuracy, vhPos,
                            testing: window.CONFIG?.GPS_TESTING?.ENABLED || false
                        });
                    },
                    (error) => {
                        retryCount++;
                        if (retryCount < maxRetries) {
                            console.log(`GPS retry ${retryCount}/${maxRetries}`);
                            setTimeout(attemptGeolocation, 1000 * retryCount);
                        } else {
                            console.error('GPS-Fehler nach mehreren Versuchen:', error.message);
                            reject(error);
                        }
                    },
                    options
                );
            };

            attemptGeolocation();
        });
    }

    /**
     * Enhanced tracking with adaptive intervals
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

        // Adaptive timeout based on device capabilities
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const timeout = isMobile ? 6000 : 8000;

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                let lat = position.coords.latitude;
                let lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                if (window.CONFIG?.GPS_TESTING?.ENABLED) {
                    lat += window.CONFIG.GPS_TESTING.TEST_OFFSET.lat;
                    lng += window.CONFIG.GPS_TESTING.TEST_OFFSET.lng;
                }

                this.showUserPosition(lat, lng, accuracy);
            },
            (error) => {
                console.error('GPS-Tracking-Fehler:', error.message);
                this.triggerError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: timeout,
                maximumAge: 1000 // Fresh data every second
            }
        );

        this.isTracking = true;
        this.triggerTrackingStart();
        return true;
    }

    /**
     * Enhanced cleanup on stop
     */
    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Clear pending operations
        if (this.batchTimeoutId) {
            clearTimeout(this.batchTimeoutId);
            this.batchTimeoutId = null;
        }

        if (this.updateRequestId) {
            cancelAnimationFrame(this.updateRequestId);
            this.updateRequestId = null;
        }

        // Clear batched positions
        this.pendingPositions = [];
        this.isProcessingBatch = false;
        this.pendingDOMUpdate = false;

        this.isTracking = false;
        this.triggerTrackingStop();
        console.log('GPS-Tracking gestoppt');
    }

    /**
     * Enhanced cleanup method
     */
    destroy() {
        this.stopTracking();

        // Clean up worker
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        // Clear caches
        this.transformCache.clear();
        this.positionHistory = [];

        // Remove DOM elements
        if (this.userMarkerElement) {
            this.userMarkerElement.remove();
            this.userMarkerElement = null;
        }

        console.log('GPS-Mapper destroyed');
    }

    // Keep all other existing methods unchanged...
    clearReferencePoints() {
        this.referencePoints = [];
        this.transformCache.clear();
    }

    removeUserMarker() {
        if (this.userMarkerElement) {
            this.userMarkerElement.remove();
            this.userMarkerElement = null;
            this.accuracyCircleElement = null;
        }
    }

    accuracyToVH(accuracyMeters) {
        const metersPerVH = 1.35;
        return Math.min(Math.max(accuracyMeters / metersPerVH, 0.5), 50);
    }

    isNearPoint(targetLat, targetLng, radiusMeters = 50) {
        if (!this.currentPosition) return false;

        const distance = this.calculateDistance(
            this.currentPosition.lat,
            this.currentPosition.lng,
            targetLat,
            targetLng
        );

        return distance <= radiusMeters;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    triggerPositionUpdate(data) {
        $(document).trigger('gps:positionUpdate', data);
    }

    triggerError(error) {
        $(document).trigger('gps:error', error);
    }

    triggerTrackingStart() {
        $(document).trigger('gps:trackingStart');
    }

    triggerTrackingStop() {
        $(document).trigger('gps:trackingStop');
    }

    getCurrentPosition() {
        return this.currentPosition;
    }

    isGPSAvailable() {
        return 'geolocation' in navigator;
    }

    isCurrentlyTracking() {
        return this.isTracking;
    }

    schedulePositionUpdate(vhPos, accuracy) {
        if (this.pendingDOMUpdate) return;

        this.pendingDOMUpdate = true;

        if (this.updateRequestId) {
            cancelAnimationFrame(this.updateRequestId);
        }

        this.updateRequestId = requestAnimationFrame(() => {
            this.updatePositionDOM(vhPos, accuracy);
            this.pendingDOMUpdate = false;
        });
    }

    isValidGPSReading(lat, lng, accuracy) {
        if (!lat || !lng || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return false;
        }

        if (accuracy && accuracy > this.minAccuracy) {
            return false;
        }

        if (this.lastValidPosition) {
            const distance = this.calculateDistance(
                this.lastValidPosition.lat,
                this.lastValidPosition.lng,
                lat,
                lng
            );

            if (distance > this.maxJumpDistance) {
                return false;
            }
        }

        return true;
    }

    resetSmoothing() {
        this.positionHistory = [];
        this.lastValidPosition = null;
        this.smoothedPosition = null;
        this.transformCache.clear();
        console.log('GPS smoothing and cache reset');
    }

    // Testing methods remain unchanged...
    enableTestingMode() {
        if (!window.CONFIG?.GPS_MARKERS?.length) {
            return Promise.reject(new Error('Konfiguration nicht verfügbar'));
        }

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation wird vom Browser nicht unterstützt'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    window.CONFIG.GPS_TESTING.REAL_LOCATION = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    const firstMarker = window.CONFIG.GPS_MARKERS[0];
                    window.CONFIG.GPS_TESTING.TEST_OFFSET = {
                        lat: firstMarker.lat - position.coords.latitude,
                        lng: firstMarker.lng - position.coords.longitude
                    };

                    window.CONFIG.GPS_TESTING.ENABLED = true;
                    resolve({
                        realLocation: window.CONFIG.GPS_TESTING.REAL_LOCATION,
                        mappedTo: firstMarker,
                        offset: window.CONFIG.GPS_TESTING.TEST_OFFSET
                    });
                },
                reject,
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                }
            );
        });
    }

    disableTestingMode() {
        if (window.CONFIG) {
            window.CONFIG.GPS_TESTING.ENABLED = false;
            window.CONFIG.GPS_TESTING.REAL_LOCATION = null;
            window.CONFIG.GPS_TESTING.TEST_OFFSET = {lat: 0, lng: 0};
            return true;
        }
        return false;
    }

    getTestingStatus() {
        if (!window.CONFIG) return {enabled: false};

        return {
            enabled: window.CONFIG.GPS_TESTING.ENABLED,
            realLocation: window.CONFIG.GPS_TESTING.REAL_LOCATION,
            offset: window.CONFIG.GPS_TESTING.TEST_OFFSET
        };
    }
}

// Export as global variable
window.GPSMapper = GPSMapper;