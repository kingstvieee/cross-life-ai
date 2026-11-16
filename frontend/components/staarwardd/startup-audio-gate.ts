export type StartupAudioState = {
  sessionReady: boolean;
  filmRequested: boolean;
  approvedMusicAvailable: boolean;
  approvedMusicLoaded: boolean;
  approvedMusicFailed: boolean;
  muted: boolean;
};

export function decideStartupPlayback(state: StartupAudioState) {
  const wantsApprovedMusic = state.approvedMusicAvailable && !state.approvedMusicFailed;
  const waitingForMusic = state.sessionReady && state.filmRequested
    && wantsApprovedMusic && !state.approvedMusicLoaded;
  const ready = state.sessionReady && !waitingForMusic;
  const playFilm = ready && state.filmRequested;
  const playApprovedMusic = playFilm && wantsApprovedMusic && state.approvedMusicLoaded;
  return {
    waitingForMusic,
    playFilm,
    playApprovedMusic,
    muteFilm: playApprovedMusic || state.muted,
    muteMusic: state.muted,
    fallbackToFilmAudio: !wantsApprovedMusic
  };
}
