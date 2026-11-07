// Runs once before any screen: gives the shared web music code (../../src/lib) the two browser APIs it expects.
import 'expo-sqlite/localStorage/install' // window.localStorage, saved on the device, so settings persist like on the web
import { AudioContext, AudioManager } from 'react-native-audio-api'
import { setBandSampleUrl } from '@music/band.js'

// audio.js and clickSounds.js create `new window.AudioContext()`; react-native-audio-api implements the same API natively.
;(globalThis as unknown as { AudioContext: typeof AudioContext }).AudioContext = AudioContext

// Play through the iPhone's silent switch (a metronome that goes quiet is a bug) and mix with music from other apps,
// so players can practise along with a track.
AudioManager.setAudioSessionOptions({ iosCategory: 'playback', iosMode: 'default', iosOptions: ['mixWithOthers'] })

// The Charts band's recorded piano, bass and drums are served by the web site and fetched the first time a chart opens.
setBandSampleUrl('https://joeyf116.github.io/music/samples/band/')
