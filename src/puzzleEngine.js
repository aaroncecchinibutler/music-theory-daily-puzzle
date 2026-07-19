import { chordNotes } from './musicTheory.js'

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function dateToSeed(dateStr) {
  return dateStr.split('-').reduce((acc, n) => acc * 1000 + parseInt(n), 0)
}

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

// Qualities grouped by the number of notes they produce after voicing
const TIERS = {
  easy: {
    gridSize: 3,
    // Triads: root + 3rd + 5th = 3 notes
    qualities: ['maj', 'min'],
  },
  medium: {
    gridSize: 4,
    // 7th chords: root + 3rd + 5th + 7th = 4 notes
    qualities: ['maj7', 'min7', 'dom7', 'min7b5', 'dim7', 'minmaj7'],
  },
  hard: {
    gridSize: 4,
    // Extension chords that produce exactly 4 notes after dropping root/fifth
    qualities: [
      'maj7', 'min7', 'dom7', 'min7b5',
      'dom9',        // drop root only → M3, P5, m7, M9
      'dom11',       // drop root+5th → M3, m7, M9, P11
      'doms11',      // drop root+5th → M3, m7, M9, #11
      'dom13',       // drop root+5th → M3, m7, M9, M13
      'dom7b9b13',   // drop root+5th → M3, m7, b9, b13
      'dom7b9s11',   // drop root+5th → M3, m7, b9, #11
      'dom13b9',     // drop root+5th → M3, m7, b9, M13
      'maj9',        // drop root only → M3, P5, M7, M9
      'maj7s11',     // drop root+5th → M3, M7, M9, #11
      'maj13',       // drop root+5th → M3, M7, M9, M13
      'min9',        // drop root only → m3, P5, m7, M9
      'min11',       // drop root+5th → m3, m7, M9, P11
      'min13',       // drop root+5th → m3, m7, M9, M13
      'minmaj9',     // drop root only → m3, P5, M7, M9
    ],
  },
}

const ALL_ROOTS = Array.from({ length: 12 }, (_, i) => i)

// Precompute: sorted note key → [{root, quality}] for a given quality list
function buildChordLookup(qualities) {
  const lookup = new Map()
  for (const quality of qualities) {
    for (const root of ALL_ROOTS) {
      const notes = [...chordNotes(root, quality)].sort((a, b) => a - b)
      const key = notes.join(',')
      if (!lookup.has(key)) lookup.set(key, [])
      lookup.get(key).push({ root, quality })
    }
  }
  return lookup
}

// Backtracking: assign notes to columns such that each column forms a valid chord.
// rowNoteArrays[i] = array of pitch classes for row chord i (pre-shuffled).
// Returns { colChords, solution } or null.
function findColumnAssignment(rowChords, rowNoteArrays, lookup, rng) {
  const size = rowNoteArrays.length
  const colChords = Array(size).fill(null)
  // solution[i][j] = pitch class integer
  const solution = Array.from({ length: size }, () => Array(size).fill(null))
  const usedInRow = Array.from({ length: size }, () => new Set())

  function* columnCombos(r, current) {
    if (r === size) { yield [...current]; return }
    for (const note of rowNoteArrays[r]) {
      if (!usedInRow[r].has(note)) {
        current.push(note)
        yield* columnCombos(r + 1, current)
        current.pop()
      }
    }
  }

  function backtrack(col) {
    if (col === size) return true

    const combos = [...columnCombos(0, [])]
    shuffle(combos, rng)

    for (const combo of combos) {
      const key = [...combo].sort((a, b) => a - b).join(',')
      const chordOptions = lookup.get(key)
      if (!chordOptions) continue

      const chord = chordOptions[0]
      // Skip if this chord already appears as a row chord or earlier column chord
      const alreadyUsed =
        rowNoteArrays.some((_, ri) => rowChords[ri].root === chord.root && rowChords[ri].quality === chord.quality) ||
        colChords.some(c => c && c.root === chord.root && c.quality === chord.quality)
      if (alreadyUsed) continue

      for (let r = 0; r < size; r++) {
        solution[r][col] = combo[r]
        usedInRow[r].add(combo[r])
      }
      colChords[col] = chord

      if (backtrack(col + 1)) return true

      for (let r = 0; r < size; r++) {
        solution[r][col] = null
        usedInRow[r].delete(combo[r])
      }
      colChords[col] = null
    }

    return false
  }

  return backtrack(0) ? { colChords, solution } : null
}

// Generate a puzzle where:
// - Each row chord's notes fill that row exactly (one per column cell)
// - Each column chord's notes fill that column exactly (one per row cell)
// - Each cell contains the note that belongs to both its row and column chord
export function generatePuzzle(dateStr, difficulty = 'easy') {
  const tier = TIERS[difficulty]
  const rng = mulberry32(dateToSeed(dateStr) ^ (difficulty === 'easy' ? 0 : difficulty === 'medium' ? 0xABCD : 0x1234))
  const size = tier.gridSize
  const lookup = buildChordLookup(tier.qualities)

  for (let attempt = 0; attempt < 500; attempt++) {
    const rowChords = Array.from({ length: size }, () => ({
      root: pickRandom(ALL_ROOTS, rng),
      quality: pickRandom(tier.qualities, rng),
    }))

    const rowNoteArrays = rowChords.map(c => {
      const notes = [...chordNotes(c.root, c.quality)]
      shuffle(notes, rng)
      return notes
    })

    // Skip if any row chord has the wrong number of notes
    if (rowNoteArrays.some(notes => notes.length !== size)) continue

    const result = findColumnAssignment(rowChords, rowNoteArrays, lookup, rng)
    if (result) {
      return { rowChords, colChords: result.colChords, solution: result.solution, difficulty }
    }
  }

  throw new Error(`Could not generate a valid ${difficulty} puzzle for ${dateStr}`)
}
