class AudioManager {
  constructor() {
    this.currentAudio = null;
    this.currentSVGAudio = null;
    this.currentPflanzeAudio = null;
    this.isAudioPlaying = false;
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
    }
  }

  stopSVGAudio() {
    if (this.currentSVGAudio) {
      this.currentSVGAudio.pause();
      this.currentSVGAudio.currentTime = 0;
      this.currentSVGAudio = null;
    }
  }

  stopPflanzeAudio() {
    if (this.currentPflanzeAudio) {
      this.currentPflanzeAudio.pause();
      this.currentPflanzeAudio.currentTime = 0;
      this.currentPflanzeAudio = null;
    }
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

      // Neues Audio-Objekt erstellen
      this.currentPflanzeAudio = new Audio(audioFile);

      // Event-Listener hinzufügen
      this.currentPflanzeAudio.addEventListener('loadstart', () => {
        console.log('Audio lädt...');
      });

      this.currentPflanzeAudio.addEventListener('canplay', () => {
        console.log('Audio ist bereit zum Abspielen');
      });

      this.currentPflanzeAudio.addEventListener('play', () => {
        console.log('Audio wird abgespielt');
        element.addClass('playing');
      });

      this.currentPflanzeAudio.addEventListener('ended', () => {
        console.log('Audio beendet');
        element.removeClass('playing');
        resolve(true);
      });

      this.currentPflanzeAudio.addEventListener('error', (e) => {
        console.error('Audio-Fehler:', e);
        console.error('Fehler-Details:', this.currentPflanzeAudio.error);
        element.removeClass('playing');
        reject(e);
      });

      // Audio abspielen
      this.currentPflanzeAudio.play()
        .then(() => {
          console.log('Audio erfolgreich gestartet');
        })
        .catch(e => {
          console.error('Audio konnte nicht abgespielt werden:', e);
          element.removeClass('playing');
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

      // Neues Audio-Objekt erstellen
      this.currentSVGAudio = new Audio(audioFile);

      // Event-Listener hinzufügen
      this.currentSVGAudio.addEventListener('loadstart', () => {
        console.log('Magic-Audio lädt...');
      });

      this.currentSVGAudio.addEventListener('canplay', () => {
        console.log('Magic-Audio ist bereit zum Abspielen');
      });

      this.currentSVGAudio.addEventListener('play', () => {
        console.log('Magic-Audio wird abgespielt');
        element.addClass('playing');
      });

      this.currentSVGAudio.addEventListener('ended', () => {
        console.log('Magic-Audio beendet');
        element.removeClass('playing');
        resolve(true);
      });

      this.currentSVGAudio.addEventListener('error', (e) => {
        console.error('Magic-Audio-Fehler:', e);
        console.error('Fehler-Details:', this.currentSVGAudio.error);
        element.removeClass('playing');
        reject(e);
      });

      // Audio abspielen
      this.currentSVGAudio.play()
        .then(() => {
          console.log('Magic-Audio erfolgreich gestartet');
        })
        .catch(e => {
          console.error('Magic-Audio konnte nicht abgespielt werden:', e);
          element.removeClass('playing');
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

      this.currentAudio.addEventListener('ended', () => {
        this.isAudioPlaying = false;
        this.currentAudio = null;
        resolve();
      });

      this.currentAudio.addEventListener('error', (e) => {
        this.isAudioPlaying = false;
        this.currentAudio = null;
        reject(e);
      });

      this.currentAudio.play()
        .then(() => {
          console.log('Audio erfolgreich gestartet');
        })
        .catch(e => {
          this.isAudioPlaying = false;
          this.currentAudio = null;
          reject(e);
        });
    });
  }

  isPlaying() {
    return this.isAudioPlaying || 
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