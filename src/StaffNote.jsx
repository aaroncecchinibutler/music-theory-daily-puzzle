// Treble clef staff note renderer.
// chromaticIndex: integer position in a linear chromatic scale where 0=C4, 11=B4, 12=C5, etc.
// Pitch class = ((chromaticIndex % 12) + 12) % 12

// Two spellings — sharps (going up) and flats (going down)
const PC_SHARP = [
  { letter: 'C', acc: null, step: 0 },
  { letter: 'C', acc: '#',  step: 0 },
  { letter: 'D', acc: null, step: 1 },
  { letter: 'D', acc: '#',  step: 1 },
  { letter: 'E', acc: null, step: 2 },
  { letter: 'F', acc: null, step: 3 },
  { letter: 'F', acc: '#',  step: 3 },
  { letter: 'G', acc: null, step: 4 },
  { letter: 'G', acc: '#',  step: 4 },
  { letter: 'A', acc: null, step: 5 },
  { letter: 'A', acc: '#',  step: 5 },
  { letter: 'B', acc: null, step: 6 },
]

const PC_FLAT = [
  { letter: 'C', acc: null, step: 0 },
  { letter: 'D', acc: 'b',  step: 1 },
  { letter: 'D', acc: null, step: 1 },
  { letter: 'E', acc: 'b',  step: 2 },
  { letter: 'E', acc: null, step: 2 },
  { letter: 'F', acc: null, step: 3 },
  { letter: 'G', acc: 'b',  step: 4 },
  { letter: 'G', acc: null, step: 4 },
  { letter: 'A', acc: 'b',  step: 5 },
  { letter: 'A', acc: null, step: 5 },
  { letter: 'B', acc: 'b',  step: 6 },
  { letter: 'B', acc: null, step: 6 },
]

// Diatonic step from C4, given chromatic index and spelling
export function chromaticToDiatonicStep(chromaticIndex, useFlats = false) {
  const octave = Math.floor(chromaticIndex / 12)
  const pc = ((chromaticIndex % 12) + 12) % 12
  const table = useFlats ? PC_FLAT : PC_SHARP
  return octave * 7 + table[pc].step
}

export function chromaticToPc(chromaticIndex) {
  return ((chromaticIndex % 12) + 12) % 12
}

// Starting chromatic index for B4
export const B4_INDEX = 11

// SVG dimensions and layout
const VB_W = 52
const VB_H = 60
const STAFF_X1 = 10
const STAFF_X2 = 50
const NOTE_X = 40
const LEDGER_W = 14

// Staff lines at diatonic steps: E4=2, G4=4, B4=6, D5=8, F5=10
const STAFF_STEPS = [2, 4, 6, 8, 10]

// y position for a given diatonic step from C4
// step 0 (C4) → y=56 (below staff), step 10 (F5) → y=16 (top line)
function stepToY(step) {
  return 56 - step * 4
}

function getLedgerLines(step) {
  const lines = []
  // Below staff: step 0 and below, even steps (staff lines are at even steps)
  if (step <= 0) {
    for (let s = 0; s >= step - (step % 2 === 0 ? 0 : 1); s -= 2) {
      if (s <= 0) lines.push(s)
    }
  }
  // Above staff: step 12 and above, even steps
  if (step >= 12) {
    for (let s = 12; s <= step + (step % 2 === 0 ? 0 : 1); s += 2) {
      lines.push(s)
    }
  }
  return lines
}

export function StaffNote({ chromaticIndex, color = 'currentColor', isEmpty = false, useFlats = false }) {
  const pc = chromaticToPc(chromaticIndex)
  const { acc } = (useFlats ? PC_FLAT : PC_SHARP)[pc]
  const dStep = chromaticToDiatonicStep(chromaticIndex, useFlats)
  const ny = stepToY(dStep)
  const ledgerLines = getLedgerLines(dStep)

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width="100%"
      height="100%"
      style={{ overflow: 'visible' }}
    >
      {/* Staff lines */}
      {STAFF_STEPS.map(s => (
        <line
          key={s}
          x1={STAFF_X1} y1={stepToY(s)}
          x2={STAFF_X2} y2={stepToY(s)}
          stroke={color} strokeWidth="1"
        />
      ))}

      {/* Treble clef */}
      <text
        x="8" y="44"
        fontSize="30"
        fill={color}
        fontFamily="Georgia, 'Times New Roman', serif"
        style={{ userSelect: 'none' }}
      >
        𝄞
      </text>

      {/* Ledger lines */}
      {ledgerLines.map(s => (
        <line
          key={`l${s}`}
          x1={NOTE_X - LEDGER_W / 2} y1={stepToY(s)}
          x2={NOTE_X + LEDGER_W / 2} y2={stepToY(s)}
          stroke={color} strokeWidth="1"
        />
      ))}

      {!isEmpty && (
        <>
          {/* Accidental */}
          {acc && (
            <text
              x={NOTE_X - 9}
              y={ny + 4}
              fontSize="11"
              fill={color}
              textAnchor="middle"
              fontFamily="Georgia, 'Times New Roman', serif"
              style={{ userSelect: 'none' }}
            >
              {acc === 'b' ? '♭' : '♯'}
            </text>
          )}

          {/* Notehead */}
          <ellipse
            cx={NOTE_X}
            cy={ny}
            rx="5.5"
            ry="4"
            fill={color}
            transform={`rotate(-18, ${NOTE_X}, ${ny})`}
          />
        </>
      )}
    </svg>
  )
}
