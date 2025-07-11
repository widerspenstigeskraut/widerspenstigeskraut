document.addEventListener('DOMContentLoaded', function () {
    const morphContainer = document.getElementById('morphContainer');
    const plusIcon = document.getElementById('plusIcon');
    const plantInput = document.getElementById('plantInput');
    const submitBtn = document.getElementById('submitBtn');

    let isExpanded = false;
    let isSubmitting = false;

    // Container Click
    morphContainer.addEventListener('click', function (e) {
        if (!isExpanded && !isSubmitting) {
            expand();
        }
    });

    // Plus Icon Click
    plusIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        if (isExpanded) {
            collapse();
        } else {
            expand();
        }
    });

    // Submit Button
    submitBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        submitPlant();
    });

    // Input Events
    plantInput.addEventListener('click', function (e) {
        e.stopPropagation();
    });

    plantInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            submitPlant();
        }
    });

    // Escape Key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isExpanded) {
            collapse();
        }
    });

    function expand() {
        if (isExpanded) return;

        // Schließe morphContainer2 falls es geöffnet ist
        const morphContainer2 = document.getElementById('morphContainer2');
        if (morphContainer2 && morphContainer2.classList.contains('expanded')) {
            morphContainer2.classList.remove('expanded');
            // Informiere App.js über das Schließen falls verfügbar
            if (window.app && typeof window.app.closeMorphContainer2 === 'function') {
                window.app.closeMorphContainer2();
            }
        }

        isExpanded = true;
        morphContainer.classList.add('expanded');

        setTimeout(() => {
            plantInput.focus();
        }, 300);
    }

    function collapse() {
        if (!isExpanded || isSubmitting) return;

        isExpanded = false;
        morphContainer.classList.remove('expanded');
        plantInput.value = '';
        morphContainer.classList.remove('success', 'error');
    }

    async function submitPlant() {
        if (isSubmitting) return;

        const plantName = plantInput.value.trim();

        if (!plantName) {
            // Notification entfernt - nur visuelles Feedback über morphContainer
            morphContainer.classList.add('error');
            setTimeout(() => morphContainer.classList.remove('error'), 600);
            return;
        }

        isSubmitting = true;
        submitBtn.innerHTML = '...';
        submitBtn.disabled = true;

        try {
            // Send data to Google Sheets via Apps Script using JSONP to avoid CORS
            await submitToGoogleSheets(plantName);

            morphContainer.classList.add('success');
            // Notification entfernt - nur visuelles Feedback über morphContainer

            setTimeout(() => {
                collapse();
            }, 1500);

        } catch (error) {
            console.error('Error:', error);
            morphContainer.classList.add('error');
            // Notification entfernt - nur visuelles Feedback über morphContainer
            setTimeout(() => morphContainer.classList.remove('error'), 600);
        }

        isSubmitting = false;
        submitBtn.innerHTML = '→';
        submitBtn.disabled = false;
    }

    async function submitToGoogleSheets(plantName) {
        // Get GPS coordinates
        let gpsLocation = 'Standort nicht verfügbar';

        try {
            if (window.app && window.app.gpsManager) {
                const location = await window.app.gpsManager.getCurrentLocation();
                if (location?.lat && location?.lng) {
                    gpsLocation = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
                }
            } else if (navigator.geolocation) {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000
                    });
                });
                gpsLocation = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            }
        } catch (error) {
            console.warn('GPS location error:', error);
        }

        // Debug: Log what we're sending
        const formData = new URLSearchParams({
            plant: plantName.trim(),
            location: gpsLocation
        });

        console.log('Form data being sent:');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}: "${value}"`);
        }

        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbwS_MbLps-y9n88kbfU_kq0AOlixCns7L8pq6RCTJ4laPJw5BYg5CvSpvCvAnr0hYUf/exec', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const responseText = await response.text();
            console.log('Google Apps Script response:', responseText);
            console.log('Successfully submitted:', { plant: plantName.trim(), location: gpsLocation });
        } catch (error) {
            console.error('Submission error:', error);
            throw error;
        }
    }

    // showNotification Funktion komplett entfernt da nicht mehr benötigt

    // Global function for testing GPS access (can be called from browser console)
    window.testGPS = async function () {
        console.log('=== GPS TEST START ===');
        console.log('navigator.geolocation:', navigator.geolocation);
        console.log('window.app:', window.app);
        console.log('window.app.gpsManager:', window.app ? window.app.gpsManager : 'no app');

        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    });
                });
                console.log('Browser GPS success:', position.coords);
                console.log(`Lat: ${position.coords.latitude}, Lng: ${position.coords.longitude}, Accuracy: ${position.coords.accuracy}m`);
            } catch (error) {
                console.error('Browser GPS error:', error);
            }
        }

        if (window.app && window.app.gpsManager) {
            try {
                const location = await window.app.gpsManager.getCurrentLocation();
                console.log('App GPS Manager success:', location);
            } catch (error) {
                console.error('App GPS Manager error:', error);
            }
        }
        console.log('=== GPS TEST END ===');
    };

    // Global function to close morphContainer from outside (e.g., from App.js)
    window.closeMorphContainer = function () {
        if (isExpanded) {
            collapse();
        }
    };
});