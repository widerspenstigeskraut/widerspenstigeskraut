/* ============================
   KRAUT TEILEN - MAIN SCRIPT
   ============================ */

document.addEventListener('DOMContentLoaded', function () {

    // ===== DOM ELEMENTS =====
    const morphContainer = document.getElementById('morphContainer');
    const plusIcon = document.getElementById('plusIcon');
    const plantInput = document.getElementById('plantInput');
    const submitBtn = document.getElementById('submitBtn');
    const startButton = document.getElementById('startButton');
    const morphContainer2 = document.getElementById('morphContainer2');
    const plusIcon2 = document.getElementById('plus-icon');

    // ===== STATE =====
    let isExpanded = false;
    let isExpanded2 = false;
    let isSubmitting = false;

    // ===== START OVERLAY HANDLER =====
    if (startButton) {
        startButton.addEventListener('click', function () {
            const startOverlay = document.getElementById('startOverlay');
            if (startOverlay) {
                startOverlay.classList.add('hidden');
            }
            document.body.classList.remove('start-active');
        });
    }

    // ===== MORPH CONTAINER 1 (PLANT INPUT) =====

    // Event Listeners
    morphContainer.addEventListener('click', function (e) {
        if (!isExpanded && !isSubmitting) {
            expand();
        }
    });

    plusIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        isExpanded ? collapse() : expand();
    });

    submitBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        submitPlant();
    });

    plantInput.addEventListener('click', function (e) {
        e.stopPropagation();
    });

    plantInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            submitPlant();
        }
    });

    // Expand/Collapse Functions
    function expand() {
        if (isExpanded) return;

        if (isExpanded2) {
            collapse2();
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
        morphContainer.classList.remove('expanded', 'success', 'error');
        plantInput.value = '';
    }

    // ===== MORPH CONTAINER 2 (INFO) =====

    if (morphContainer2 && plusIcon2) {
        morphContainer2.addEventListener('click', function (e) {
            if (!isExpanded2) {
                expand2();
            }
        });

        plusIcon2.addEventListener('click', function (e) {
            e.stopPropagation();
            isExpanded2 ? collapse2() : expand2();
        });
    }

    function expand2() {
        if (isExpanded2) return;

        if (isExpanded) {
            collapse();
        }

        isExpanded2 = true;
        morphContainer2.classList.add('expanded');
    }

    function collapse2() {
        if (!isExpanded2) return;

        isExpanded2 = false;
        morphContainer2.classList.remove('expanded');
    }

    // ===== KEYBOARD SHORTCUTS =====

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (isExpanded) {
                collapse();
            } else if (isExpanded2) {
                collapse2();
            }
        }
    });

    // ===== PLANT SUBMISSION =====

    async function submitPlant() {
        if (isSubmitting) return;

        const plantName = plantInput.value.trim();

        if (!plantName) {
            showError();
            return;
        }

        isSubmitting = true;
        submitBtn.innerHTML = '...';
        submitBtn.disabled = true;

        try {
            await submitToGoogleSheets(plantName);
            showSuccess();

            setTimeout(() => {
                collapse();
            }, 1500);

        } catch (error) {
            console.error('Submission error:', error);
            showError();
        } finally {
            isSubmitting = false;
            submitBtn.innerHTML = '→';
            submitBtn.disabled = false;
        }
    }

    function showSuccess() {
        morphContainer.classList.add('success');
    }

    function showError() {
        morphContainer.classList.add('error');
        setTimeout(() => morphContainer.classList.remove('error'), 600);
    }

    // ===== GOOGLE SHEETS INTEGRATION =====

    async function submitToGoogleSheets(plantName) {
        const gpsLocation = await getGPSLocation();

        const formData = new URLSearchParams({
            plant: plantName.trim(),
            location: gpsLocation
        });

        logSubmissionData(formData);

        const response = await fetch(
            'https://script.google.com/macros/s/AKfycbwS_MbLps-y9n88kbfU_kq0AOlixCns7L8pq6RCTJ4laPJw5BYg5CvSpvCvAnr0hYUf/exec',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const responseText = await response.text();
        console.log('Google Apps Script response:', responseText);
        console.log('Successfully submitted:', { plant: plantName.trim(), location: gpsLocation });
    }

    // ===== GPS LOCATION =====

    async function getGPSLocation() {
        try {
            // Try app GPS manager first
            if (window.app?.gpsManager) {
                const location = await window.app.gpsManager.getCurrentLocation();
                if (location?.lat && location?.lng) {
                    return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
                }
            }

            // Fallback to browser geolocation
            if (navigator.geolocation) {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000
                    });
                });
                return `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            }
        } catch (error) {
            console.warn('GPS location error:', error);
        }

        return 'Standort nicht verfügbar';
    }

    function logSubmissionData(formData) {
        console.log('Form data being sent:');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}: "${value}"`);
        }
    }

    // ===== GLOBAL FUNCTIONS =====

    window.testGPS = async function () {
        console.log('=== GPS TEST START ===');
        console.log('navigator.geolocation:', navigator.geolocation);
        console.log('window.app:', window.app);
        console.log('window.app.gpsManager:', window.app?.gpsManager || 'no app');

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

        if (window.app?.gpsManager) {
            try {
                const location = await window.app.gpsManager.getCurrentLocation();
                console.log('App GPS Manager success:', location);
            } catch (error) {
                console.error('App GPS Manager error:', error);
            }
        }

        console.log('=== GPS TEST END ===');
    };

    window.closeMorphContainer = function () {
        if (isExpanded) collapse();
    };

    window.closeMorphContainer2 = function () {
        if (isExpanded2) collapse2();
    };
});