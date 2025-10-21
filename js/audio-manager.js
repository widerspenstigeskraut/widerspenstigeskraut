class AudioManager {
  constructor() {
    this.currentAudio = null;
    this.currentSVGAudio = null;
    this.currentPflanzeAudio = null;
    this.isAudioPlaying = false;
    this.isPaused = false;
    this.currentPlayingElement = null;
  }

  stopAllAudio() {
    this.stopCurrentAudio();
    this.stopSVGAudio();
    this.stopPflanzeAudio();
  }

  stopCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.isAudioPlaying = false;
      this.isPaused = false;
    }
  }

  stopSVGAudio() {
    if (this.currentSVGAudio) {
      this.currentSVGAudio.pause();
      this.currentSVGAudio.currentTime = 0;
      this.currentSVGAudio = null;
      this.isPaused = false;

      // Animation stoppen und zurück zum Normalzustand
      if (this.currentPlayingElement && this.currentPlayingElement.hasClass('magic')) {
        this.currentPlayingElement.removeClass('playing paused fullscreen').addClass('stopped');

        // Nach kurzer Verzögerung auch stopped entfernen
        setTimeout(() => {
          this.currentPlayingElement.removeClass('stopped');
        }, 100);
      }
    }
  }

  stopPflanzeAudio() {
    if (this.currentPflanzeAudio) {
      this.currentPflanzeAudio.pause();
      this.currentPflanzeAudio.currentTime = 0;
      this.currentPflanzeAudio = null;
      this.isPaused = false;

      // Shadow entfernen und zurück zum Normalzustand
      if (this.currentPlayingElement && this.currentPlayingElement.hasClass('pflanze')) {
        this.currentPlayingElement.removeClass('playing paused fullscreen').addClass('stopped');

        // Nach kurzer Verzögerung auch stopped entfernen
        setTimeout(() => {
          this.currentPlayingElement.removeClass('stopped');
        }, 100);
      }
    }
  }

  pauseCurrentAudio() {
    if (this.currentPflanzeAudio && !this.currentPflanzeAudio.paused) {
      this.currentPflanzeAudio.pause();
      this.isPaused = true;

      // NUR die Animation pausieren, nicht den Shadow entfernen
      if (this.currentPlayingElement && this.currentPlayingElement.hasClass('pflanze')) {
        this.currentPlayingElement.removeClass('playing').addClass('paused');
      }

      return true;
    } else if (this.currentSVGAudio && !this.currentSVGAudio.paused) {
      this.currentSVGAudio.pause();
      this.isPaused = true;

      // Animation pausieren für Magic-Elemente
      if (this.currentPlayingElement && this.currentPlayingElement.hasClass('magic')) {
        this.currentPlayingElement.removeClass('playing').addClass('paused');
      }

      return true;
    } else if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.isPaused = true;
      return true;
    }
    return false;
  }

  resumeCurrentAudio() {
    if (this.isPaused) {
      if (this.currentPflanzeAudio && this.currentPflanzeAudio.paused) {
        this.currentPflanzeAudio.play();
        this.isPaused = false;

        // Animation wieder starten
        if (this.currentPlayingElement && this.currentPlayingElement.hasClass('pflanze')) {
          this.currentPlayingElement.removeClass('paused').addClass('playing');
        }

        return true;
      } else if (this.currentSVGAudio && this.currentSVGAudio.paused) {
        this.currentSVGAudio.play();
        this.isPaused = false;

        // Animation fortsetzen für Magic-Elemente
        if (this.currentPlayingElement && this.currentPlayingElement.hasClass('magic')) {
          this.currentPlayingElement.removeClass('paused').addClass('playing');
        }

        return true;
      } else if (this.currentAudio && this.currentAudio.paused) {
        this.currentAudio.play();
        this.isPaused = false;
        return true;
      }
    }
    return false;
  }

  playPflanzeAudio(audioFile, element) {
    return new Promise((resolve, reject) => {
      if (!audioFile || audioFile === '') {
        console.log('Kein Audio-File definiert für diese Pflanze');
        resolve(false);
        return;
      }

      console.log('Versuche Audio abzuspielen:', audioFile);

      // Eventuell andere Pflanzen-Audios stoppen
      this.stopPflanzeAudio();

      // Store the element for future reference
      this.currentPlayingElement = element;

      // Neues Audio-Objekt erstellen
      this.currentPflanzeAudio = new Audio(audioFile);
      this.isPaused = false;

      // Event-Listener hinzufügen
      this.currentPflanzeAudio.addEventListener('loadstart', () => {
        console.log('Audio lädt...');
      });

      this.currentPflanzeAudio.addEventListener('canplay', () => {
        console.log('Audio ist bereit zum Abspielen');
      });

      this.currentPflanzeAudio.addEventListener('play', () => {
        console.log('Audio wird abgespielt');
        element.removeClass('paused stopped').addClass('playing');
        this.isPaused = false;
      });

      this.currentPflanzeAudio.addEventListener('pause', () => {
        console.log('Audio pausiert');
        // Shadow wird über pauseCurrentAudio() gesteuert
      });

      this.currentPflanzeAudio.addEventListener('ended', () => {
        console.log('Audio beendet');

        // Erst stopped State setzen
        element.removeClass('playing paused').addClass('stopped');

        // Nach kurzer Verzögerung fullscreen entfernen und zurück zum Normalzustand
        setTimeout(() => {
          element.removeClass('fullscreen stopped');
          // Trigger reflow für saubere Animation
          void element[0].offsetWidth;
        }, 100);

        this.currentPflanzeAudio = null;
        this.currentPlayingElement = null;
        this.isPaused = false;
        resolve(true);
      });

      this.currentPflanzeAudio.addEventListener('error', (e) => {
        console.error('Audio-Fehler:', e);
        console.error('Fehler-Details:', this.currentPflanzeAudio.error);
        element.removeClass('playing paused').addClass('stopped');
        this.currentPflanzeAudio = null;
        this.currentPlayingElement = null;
        this.isPaused = false;
        reject(e);
      });

      // Audio abspielen
      this.currentPflanzeAudio.play()
        .then(() => {
          console.log('Audio erfolgreich gestartet');
        })
        .catch(e => {
          console.error('Audio konnte nicht abgespielt werden:', e);
          element.removeClass('playing paused').addClass('stopped');
          this.currentPflanzeAudio = null;
          this.currentPlayingElement = null;
          this.isPaused = false;
          reject(e);
        });
    });
  }

  playMagicAudio(audioFile, element) {
    return new Promise((resolve, reject) => {
      if (!audioFile || audioFile === '') {
        console.log('Kein Audio-File definiert für diesen Magic-Kreis');
        resolve(false);
        return;
      }

      console.log('Versuche Magic-Audio abzuspielen:', audioFile);

      // Eventuell andere SVG-Audios stoppen
      this.stopSVGAudio();

      // Store the element for future reference
      this.currentPlayingElement = element;

      // Neues Audio-Objekt erstellen
      this.currentSVGAudio = new Audio(audioFile);
      this.isPaused = false;

      // Event-Listener hinzufügen
      this.currentSVGAudio.addEventListener('loadstart', () => {
        console.log('Magic-Audio lädt...');
      });

      this.currentSVGAudio.addEventListener('canplay', () => {
        console.log('Magic-Audio ist bereit zum Abspielen');
      });

      this.currentSVGAudio.addEventListener('play', () => {
        console.log('Magic-Audio wird abgespielt');
        element.removeClass('paused stopped').addClass('playing');
        this.isPaused = false;
      });

      this.currentSVGAudio.addEventListener('ended', () => {
        console.log('Magic-Audio beendet');

        // Erst stopped State setzen
        element.removeClass('playing paused').addClass('stopped');

        // Nach kurzer Verzögerung fullscreen entfernen und zurück zum Normalzustand
        setTimeout(() => {
          element.removeClass('fullscreen stopped');
          // Trigger reflow für saubere Animation
          void element[0].offsetWidth;
        }, 100);

        this.currentSVGAudio = null;
        this.currentPlayingElement = null;
        this.isPaused = false;
        resolve(true);
      });

      this.currentSVGAudio.addEventListener('ended', () => {
        console.log('Magic-Audio beendet');
        element.removeClass('playing paused').addClass('stopped');
        this.currentSVGAudio = null;
        this.currentPlayingElement = null;
        this.isPaused = false;
        resolve(true);
      });

      this.currentSVGAudio.addEventListener('error', (e) => {
        console.error('Magic-Audio-Fehler:', e);
        console.error('Fehler-Details:', this.currentSVGAudio.error);
        element.removeClass('playing paused').addClass('stopped');
        this.currentSVGAudio = null;
        this.currentPlayingElement = null;
        this.isPaused = false;
        reject(e);
      });

      // Audio abspielen
      this.currentSVGAudio.play()
        .then(() => {
          console.log('Magic-Audio erfolgreich gestartet');
        })
        .catch(e => {
          console.error('Magic-Audio konnte nicht abgespielt werden:', e);
          element.removeClass('playing paused').addClass('stopped');
          this.currentSVGAudio = null;
          this.currentPlayingElement = null;
          this.isPaused = false;
          reject(e);
        });
    });
  }

  playGenericAudio(audioFile) {
    return new Promise((resolve, reject) => {
      if (!audioFile) {
        reject(new Error('Kein Audio-File angegeben'));
        return;
      }

      this.stopCurrentAudio();

      this.currentAudio = new Audio(audioFile);
      this.isAudioPlaying = true;
      this.isPaused = false;

      this.currentAudio.addEventListener('play', () => {
        this.isPaused = false;
      });

      this.currentAudio.addEventListener('pause', () => {
        // Don't set isAudioPlaying to false when paused, only when stopped
      });

      this.currentAudio.addEventListener('ended', () => {
        this.isAudioPlaying = false;
        this.currentAudio = null;
        this.isPaused = false;
        resolve();
      });

      this.currentAudio.addEventListener('error', (e) => {
        this.isAudioPlaying = false;
        this.currentAudio = null;
        this.isPaused = false;
        reject(e);
      });

      this.currentAudio.play()
        .then(() => {
          console.log('Audio erfolgreich gestartet');
        })
        .catch(e => {
          this.isAudioPlaying = false;
          this.currentAudio = null;
          this.isPaused = false;
          reject(e);
        });
    });
  }

  isPlaying() {
    return (this.isAudioPlaying && !this.isPaused) ||
      (this.currentPflanzeAudio && !this.currentPflanzeAudio.paused) ||
      (this.currentSVGAudio && !this.currentSVGAudio.paused);
  }

  getCurrentAudio() {
    return {
      current: this.currentAudio,
      svg: this.currentSVGAudio,
      pflanze: this.currentPflanzeAudio
    };
  }
}