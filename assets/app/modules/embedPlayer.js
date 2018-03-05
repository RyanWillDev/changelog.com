import { u } from "umbrellajs";
import Episode from "modules/episode";
import Log from "modules/log";
import ChangelogAudio from "modules/audio";
import Embedly from "modules/embedly";
import gup from "../../shared/gup";

export default class EmbedPlayer {
  constructor(selector) {
    this.audio = new ChangelogAudio();
    this.audioLoaded = false;
    this.attachUI(selector);
    this.attachEvents();
    this.loadDetails();
    this.embedly = new Embedly(this);
  }

  attachUI(selector) {
    this.container = u(selector);
    this.player = this.container.find(".js-player");
    this.nav = this.container.find(".js-nav");
    this.scrubber = this.container.find(".js-player-scrubber");
    this.track = this.container.find(".js-player-track");
    this.duration = this.container.find(".js-player-duration");
    this.current = this.container.find(".js-player-current");
    this.playButton = this.container.find(".js-player-play-button");
    this.navButton = this.container.find(".js-nav-toggle-button");
  }

  attachEvents() {
    this.playButton.handle("click", () => { this.isLoaded() ? this.togglePlayPause() : this.load(); });
    this.navButton.handle("click", ()  => { this.toggleNav(); });
    this.scrubber.on("input",  (event) => { if (this.isLoaded()) this.scrub(event.target.value); });
    this.scrubber.on("change", (event) => { if (this.isLoaded()) this.scrubEnd(event.target.value); });
    this.audio.onEnd((event) => { this.embedly.emit("ended"); });
    this.audio.onTimeUpdate((event) => { this.embedly.emit("timeupdate", {seconds: this.currentTime(), duration: this.episodeDuration()}); });
  }

  load() {
    this.player.addClass("is-loading");
    this.loadAudio();
  }

  loadAudio() {
    this.audio.load(this.episode.audio(), () => {
      this.audioLoaded = true;
      Log.track("Embed Player", "play", `${this.episode.audioFile()} (via ${(gup("referrer") || "Unknown")})`);
      this.play();
    });
  }

  loadDetails() {
    this.episode = new Episode({
      podcast: this.playButton.data("podcast"),
      title: this.playButton.data("title"),
      duration: this.playButton.data("duration"),
      audio_url: this.playButton.attr("href")
    });
  }

  isPlaying() {
    return this.audio.playing();
  }

  isLoaded() {
    return this.audioLoaded;
  }

  play() {
    requestAnimationFrame(this.step.bind(this));
    this.audio.play();
    this.player.addClass("is-playing").removeClass("is-paused is-loading");
    this.embedly.emit("play");
  }

  pause() {
    this.audio.pause();
    this.player.addClass("is-paused").removeClass("is-playing is-loading");
    this.embedly.emit("pause");
  }

  togglePlayPause() {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  toggleNav() {
    this.player.toggleClass("nav-open");
  }

  loop(bool) {
    this.audio.loop(bool);
  }

  willLoop() {
    return this.audio.willLoop();
  }

  mute() {
    this.audio.mute();
  }

  unmute() {
    this.audio.unmute();
  }

  isMuted() {
    return this.audio.isMuted();
  }

  episodeDuration() {
    return this.episode.duration();
  }

  currentTime() {
    return Math.round(this.audio.currentSeek() || 0);
  }

  step() {
    const seek = this.currentTime();
    const percentComplete = seek / this.episodeDuration() * 100;

    if (!this.isScrubbing) {
      this.current.text(Episode.formatTime(seek));
      this.scrubber.first().value = seek;
      this.track.first().style.width = `${percentComplete}%`;
    }

    if (this.isPlaying()) {
      requestAnimationFrame(this.step.bind(this));
    }
  }

  scrub(to) {
    this.isScrubbing = true;
    const percentComplete = to / this.episodeDuration() * 100;
    this.current.text(Episode.formatTime(to));
    this.track.first().style.width = `${percentComplete}%`;
  }

  scrubEnd(to) {
    this.isScrubbing = false;
    this.audio.seek(to, () => {
      this.player.addClass("is-loading");
    }, () => {
      this.player.removeClass("is-loading");
    });
  }
}
