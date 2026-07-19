// Pitch classes 0–11, C=0
export const PITCH_CLASSES = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B']

const pc = (n) => ((n % 12) + 12) % 12

// Intervals from root (semitones)
const M2 = 2, m3 = 3, M3 = 4, P4 = 5, P5 = 7, m6 = 8, M6 = 9, m7 = 10, M7 = 11
const b9 = 13, P9 = 14, s9 = 15, P11 = 17, s11 = 18, b13 = 20, P13 = 21

// Returns a Set of pitch class integers for a chord descriptor
export function chordNotes(root, quality) {
  const r = root // pitch class integer 0–11

  let notes = []
  let dropRoot = false
  let dropFifth = false

  switch (quality) {
    // --- Triads ---
    case 'maj':   notes = [r, pc(r+M3), pc(r+P5)]; break
    case 'min':   notes = [r, pc(r+m3), pc(r+P5)]; break
    case 'dim':   notes = [r, pc(r+m3), pc(r+m3+m3)]; break
    case 'aug':   notes = [r, pc(r+M3), pc(r+M3+M3)]; break

    // --- 7th chords ---
    case 'maj7':  notes = [r, pc(r+M3), pc(r+P5), pc(r+M7)]; break
    case 'min7':  notes = [r, pc(r+m3), pc(r+P5), pc(r+m7)]; break
    case 'dom7':  notes = [r, pc(r+M3), pc(r+P5), pc(r+m7)]; break
    case 'min7b5':notes = [r, pc(r+m3), pc(r+m3+m3), pc(r+m7)]; break
    case 'dim7':  notes = [r, pc(r+m3), pc(r+m3+m3), pc(r+m3+m3+m3)]; break
    case 'minmaj7':notes= [r, pc(r+m3), pc(r+P5), pc(r+M7)]; break

    // --- Dominant extensions (drop root; drop 5th for 11/b13/13/#11) ---
    case 'dom9':
      dropRoot = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+m7), pc(r+P9)]
      break
    case 'dom11':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+m7), pc(r+P9), pc(r+P11)]
      break
    case 'doms11':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+m7), pc(r+P9), pc(r+s11)]
      break
    case 'dom13':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+m7), pc(r+P9), pc(r+P13)]
      break
    case 'dom7b9':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+m7), pc(r+b9)]
      break
    case 'dom7s9':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+m7), pc(r+s9)]
      break
    case 'dom7b9b13':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+m7), pc(r+b9), pc(r+b13)]
      break
    case 'dom7b9s11':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+m7), pc(r+b9), pc(r+s11)]
      break
    case 'dom13b9':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+m7), pc(r+b9), pc(r+P13)]
      break

    // --- Major extensions ---
    case 'maj9':
      dropRoot = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+M7), pc(r+P9)]
      break
    case 'maj7s11':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+M7), pc(r+P9), pc(r+s11)]
      break
    case 'maj13':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+M3), pc(r+P5), pc(r+M7), pc(r+P9), pc(r+P13)]
      break

    // --- Minor extensions ---
    case 'min9':
      dropRoot = true
      notes = [r, pc(r+m3), pc(r+P5), pc(r+m7), pc(r+P9)]
      break
    case 'min11':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+m3), pc(r+P5), pc(r+m7), pc(r+P9), pc(r+P11)]
      break
    case 'min13':
      dropRoot = true; dropFifth = true
      notes = [r, pc(r+m3), pc(r+P5), pc(r+m7), pc(r+P9), pc(r+P13)]
      break
    case 'minmaj9':
      dropRoot = true
      notes = [r, pc(r+m3), pc(r+P5), pc(r+M7), pc(r+P9)]
      break

    default:
      throw new Error(`Unknown chord quality: ${quality}`)
  }

  if (dropRoot) notes = notes.filter(n => n !== r)
  if (dropFifth) notes = notes.filter(n => n !== pc(r + P5))

  return new Set(notes)
}

// Returns the pitch class name(s), e.g. "C#/Db" or "E"
export function pitchName(pc) {
  return PITCH_CLASSES[((pc % 12) + 12) % 12]
}

// Intersection of two chord note sets
export function intersection(setA, setB) {
  return new Set([...setA].filter(n => setB.has(n)))
}

// All roots as {label, value} for display
export const ROOTS = [
  { label: 'C',  value: 0  },
  { label: 'C#/Db', value: 1 },
  { label: 'D',  value: 2  },
  { label: 'D#/Eb', value: 3 },
  { label: 'E',  value: 4  },
  { label: 'F',  value: 5  },
  { label: 'F#/Gb', value: 6 },
  { label: 'G',  value: 7  },
  { label: 'G#/Ab', value: 8 },
  { label: 'A',  value: 9  },
  { label: 'A#/Bb', value: 10 },
  { label: 'B',  value: 11 },
]

export const QUALITY_LABELS = {
  maj: 'maj', min: 'min', dim: 'dim', aug: 'aug',
  maj7: 'maj7', min7: 'min7', dom7: '7', min7b5: 'ø7', dim7: 'dim7', minmaj7: 'mM7',
  dom9: '9', dom11: '11', doms11: '#11', dom13: '13',
  dom7b9: '7b9', dom7s9: '7#9', dom7b9b13: '7b9b13', dom7b9s11: '7b9#11', dom13b9: '13b9',
  maj9: 'maj9', 'maj7s11': 'maj7#11', maj13: 'maj13',
  min9: 'min9', min11: 'min11', min13: 'min13', minmaj9: 'mM9',
}

// Format a chord name for display, e.g. root=0 quality='dom7b9b13' → "C 7b9b13"
export function chordLabel(root, quality) {
  const rootName = ROOTS.find(r => r.value === root)?.label ?? '?'
  return `${rootName} ${QUALITY_LABELS[quality] ?? quality}`
}
