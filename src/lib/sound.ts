export function playCue(kind: 'tick' | 'reveal' | 'win', muted: boolean) {
  if (muted) return
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain()
    oscillator.type = 'sine'; oscillator.frequency.value = kind === 'tick' ? 440 : kind === 'reveal' ? 660 : 784
    gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'win' ? 0.55 : 0.18))
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + (kind === 'win' ? 0.6 : 0.2)); oscillator.onended = () => void context.close()
  } catch { /* Sound is a progressive enhancement. */ }
}

export function useStoredMute(): [boolean, (value: boolean) => void] {
  const key = 'toohak-muted'
  const get = () => localStorage.getItem(key) === 'true'
  const set = (value: boolean) => localStorage.setItem(key, String(value))
  return [get(), set]
}
