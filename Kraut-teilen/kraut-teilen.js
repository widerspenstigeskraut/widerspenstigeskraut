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
            showNotification('🌿 Bitte gib den Namen eines Krauts ein!', 'error');
            morphContainer.classList.add('error');
            setTimeout(() => morphContainer.classList.remove('error'), 600);
            return;
        }

        isSubmitting = true;
        submitBtn.innerHTML = '...';
        submitBtn.disabled = true;

        try {
            // Simulation - hier würde Google Apps Script stehen
            await new Promise(resolve => setTimeout(resolve, 1000));

            morphContainer.classList.add('success');
            showNotification(`✅ "${plantName}" wurde erfolgreich gemeldet!`, 'success');

            setTimeout(() => {
                collapse();
            }, 1500);

        } catch (error) {
            console.error('Error:', error);
            morphContainer.classList.add('error');
            showNotification('❌ Fehler beim Speichern. Bitte versuche es erneut.', 'error');
            setTimeout(() => morphContainer.classList.remove('error'), 600);
        }

        isSubmitting = false;
        submitBtn.innerHTML = '→';
        submitBtn.disabled = false;
    }

    // function showNotification(message, type) {
    //     // Erstelle oder verwende existierende Notification
    //     let notification = document.getElementById('krautNotification');
    //     if (!notification) {
    //         notification = document.createElement('div');
    //         notification.id = 'krautNotification';
    //         notification.className = 'kraut-notification';
    //         document.body.appendChild(notification);
    //     }

    //     notification.textContent = message;
    //     notification.className = `kraut-notification ${type}`;
    //     notification.classList.add('show');

    //     setTimeout(() => {
    //         notification.classList.remove('show');
    //     }, 3000);
    // }
});