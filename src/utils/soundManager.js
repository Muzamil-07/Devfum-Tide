// Lightweight sound manager to coordinate background audio and mute state
let tryPlayFn = null
let muteHandler = null
let loaderHandler = null
let muted = false // always start unmuted on reload
let loaderVisible = false

export function registerTryPlay(fn) {
  tryPlayFn = fn
}

export async function triggerEnable() {
  if (!tryPlayFn) return false
  try {
    const res = await tryPlayFn()
    return res
  } catch (e) {
    return false
  }
}

export function registerMuteHandler(fn) {
  muteHandler = fn
  // invoke immediately with current state
  if (typeof muteHandler === "function") muteHandler(muted)
}

export function setMuted(v) {
  muted = !!v
  if (typeof muteHandler === "function") muteHandler(muted)
}

export function getMuted() {
  return muted
}

export function registerLoaderHandler(fn) {
  loaderHandler = fn
  if (typeof loaderHandler === "function") loaderHandler(loaderVisible)
}

export function setLoaderVisible(v) {
  loaderVisible = !!v
  if (typeof loaderHandler === "function") loaderHandler(loaderVisible)
}

export function getLoaderVisible() {
  return loaderVisible
}
