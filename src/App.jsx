import { useState, useEffect, useRef } from 'react'
import { generatePuzzle } from './puzzleEngine.js'
import { chordLabel, pitchName } from './musicTheory.js'
import { StaffNote, chromaticToPc, B4_INDEX } from './StaffNote.jsx'
import './App.css'

const DIFFICULTIES = ['easy', 'medium', 'hard']

const NOTE_MAP = {
  'c': 0, 'b#': 0,
  'c#': 1, 'db': 1,
  'd': 2,
  'd#': 3, 'eb': 3,
  'e': 4, 'fb': 4,
  'f': 5, 'e#': 5,
  'f#': 6, 'gb': 6,
  'g': 7,
  'g#': 8, 'ab': 8,
  'a': 9,
  'a#': 10, 'bb': 10,
  'b': 11, 'cb': 11,
}

function parseNote(str) {
  return NOTE_MAP[str.trim().toLowerCase().replace(/\s/g, '')] ?? null
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function saveState(date, difficulty, guesses, staffIdxs, checked) {
  localStorage.setItem(`mtdp-${date}-${difficulty}`, JSON.stringify({ guesses, staffIdxs, checked }))
}

function loadState(date, difficulty) {
  try { return JSON.parse(localStorage.getItem(`mtdp-${date}-${difficulty}`)) ?? null }
  catch { return null }
}

export default function App() {
  const [difficulty, setDifficulty] = useState('easy')
  const [puzzle, setPuzzle] = useState(null)
  const [inputMode, setInputMode] = useState('text') // 'text' | 'staff'
  // text mode: guesses[key] = raw string
  // staff mode: guesses[key] = pitch class int (set on first arrow press from B default)
  const [guesses, setGuesses] = useState({})
  // staff chromatic index (linear position) per cell; default B4 = 11
  const [staffIdxs, setStaffIdxs] = useState({})
  // last arrow direction per cell: 'up' | 'down' (controls sharp vs flat spelling)
  const [staffDirections, setStaffDirections] = useState({})
  const [checked, setChecked] = useState(false)
  const [selected, setSelected] = useState(null)
  const textInputRef = useRef(null)
  const staffCellRef = useRef(null)
  const date = todayStr()

  useEffect(() => {
    const p = generatePuzzle(date, difficulty)
    setPuzzle(p)
    const saved = loadState(date, difficulty)
    if (saved) {
      setGuesses(saved.guesses ?? {})
      setStaffIdxs(saved.staffIdxs ?? {})
      setChecked(saved.checked ?? false)
    } else {
      setGuesses({})
      setStaffIdxs({})
      setChecked(false)
    }
    setSelected(null)
  }, [difficulty])

  useEffect(() => {
    if (puzzle) saveState(date, difficulty, guesses, staffIdxs, checked)
  }, [guesses, staffIdxs, checked])

  useEffect(() => {
    if (!selected) return
    if (inputMode === 'text') textInputRef.current?.focus()
    else staffCellRef.current?.focus()
  }, [selected, inputMode])

  if (!puzzle) return <div className="loading">Loading…</div>

  const size = puzzle.rowChords.length

  function isFilled(key) {
    const v = guesses[key]
    if (v === undefined || v === null) return false
    if (inputMode === 'text') return typeof v === 'string' ? !!v.trim() : true
    return true
  }

  const allFilled = puzzle.rowChords.every((_, r) =>
    puzzle.colChords.every((_, c) => isFilled(`${r},${c}`))
  )

  // --- Text mode handlers ---
  function handleTextInput(e) {
    if (!selected) return
    const val = e.target.value
    setGuesses(g => ({ ...g, [selected]: val }))
  }

  function advanceSelected(key, size) {
    const [r, c] = key.split(',').map(Number)
    if (c + 1 < size) setSelected(`${r},${c + 1}`)
    else if (r + 1 < size) setSelected(`${r + 1},0`)
    else setSelected(null)
  }

  function handleTextKeyDown(e) {
    if (!selected) return
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); advanceSelected(selected, size) }
    if (e.key === 'Escape') setSelected(null)
  }

  // --- Staff mode handlers ---
  function handleStaffKeyDown(e) {
    if (!selected || checked) return
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const dir = e.key === 'ArrowUp' ? 'up' : 'down'
      setStaffDirections(sd => ({ ...sd, [selected]: dir }))
      setStaffIdxs(si => {
        const cur = si[selected] ?? B4_INDEX
        const next = dir === 'up' ? cur + 1 : cur - 1
        const newSi = { ...si, [selected]: next }
        setGuesses(g => ({ ...g, [selected]: chromaticToPc(next) }))
        return newSi
      })
    }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); advanceSelected(selected, size) }
    if (e.key === 'Escape') setSelected(null)
  }

  function handleCellClick(key) {
    if (checked) return
    setSelected(key)
    // In staff mode, clicking a cell initialises it to B if not yet set
    if (inputMode === 'staff' && guesses[key] === undefined) {
      setStaffIdxs(si => ({ ...si, [key]: B4_INDEX }))
      setGuesses(g => ({ ...g, [key]: chromaticToPc(B4_INDEX) }))
    }
  }

  // --- Status ---
  function cellStatus(r, c) {
    if (!checked) return null
    const key = `${r},${c}`
    const correct = puzzle.solution[r][c]
    if (inputMode === 'text') {
      const raw = guesses[key]
      if (!raw && raw !== 0) return 'empty'
      if (typeof raw === 'number') return raw === correct ? 'correct' : 'incorrect'
      if (!raw.trim()) return 'empty'
      const pc = parseNote(raw)
      if (pc === null) return 'invalid'
      return pc === correct ? 'correct' : 'incorrect'
    } else {
      const pc = guesses[key]
      if (pc === undefined) return 'empty'
      return pc === correct ? 'correct' : 'incorrect'
    }
  }

  const score = checked
    ? puzzle.rowChords.reduce((acc, _, r) =>
        acc + puzzle.colChords.filter((_, c) => cellStatus(r, c) === 'correct').length, 0)
    : null

  // --- Mode toggle (converts guesses) ---
  function toggleMode() {
    setInputMode(m => {
      const next = m === 'text' ? 'staff' : 'text'
      if (next === 'staff') {
        // Convert text guesses to pc + staff index
        setGuesses(g => {
          const out = {}
          for (const [k, v] of Object.entries(g)) {
            const pc = typeof v === 'string' ? parseNote(v) : v
            if (pc !== null && pc !== undefined) out[k] = pc
          }
          return out
        })
        setStaffIdxs(si => {
          const out = { ...si }
          // For any filled cell without a staffIdx, set default
          setGuesses(g => {
            for (const [k, pc] of Object.entries(g)) {
              if (typeof pc === 'number' && out[k] === undefined) {
                out[k] = pc // use pc as chromatic index in B4's octave
              }
            }
            return g
          })
          return out
        })
      } else {
        // Convert pc guesses to note name strings
        setGuesses(g => {
          const out = {}
          for (const [k, v] of Object.entries(g)) {
            const pc = typeof v === 'number' ? v : parseNote(String(v))
            if (pc !== null && pc !== undefined) out[k] = pitchName(pc)
          }
          return out
        })
      }
      return next
    })
    setSelected(null)
  }

  // --- Build cell grid ---
  const cells = []

  cells.push(<div key="corner" className="header-cell corner" />)
  puzzle.colChords.forEach((col, c) =>
    cells.push(
      <div key={`col-${c}`} className="header-cell col-header">
        {chordLabel(col.root, col.quality)}
      </div>
    )
  )

  puzzle.rowChords.forEach((row, r) => {
    cells.push(
      <div key={`row-${r}`} className="header-cell row-header">
        {chordLabel(row.root, row.quality)}
      </div>
    )
    puzzle.colChords.forEach((_, c) => {
      const key = `${r},${c}`
      const isSelected = selected === key
      const status = cellStatus(r, c)
      const filled = isFilled(key)
      const className = `cell ${status ?? ''} ${isSelected ? 'selected' : ''} ${filled && !status ? 'filled' : ''}`

      if (inputMode === 'text') {
        const value = guesses[key] ?? ''
        cells.push(
          <div key={key} className={className} onClick={() => handleCellClick(key)}>
            {isSelected
              ? <input
                  ref={textInputRef}
                  className="cell-input"
                  value={value}
                  onChange={handleTextInput}
                  onKeyDown={handleTextKeyDown}
                  maxLength={3}
                  autoComplete="off"
                  spellCheck={false}
                />
              : <span className="cell-note">
                  {status === 'incorrect'
                    ? <><s className="wrong-guess">{typeof value === 'string' ? value.trim() : pitchName(value)}</s><span className="reveal-answer">{pitchName(puzzle.solution[r][c])}</span></>
                    : status === 'empty' || status === 'invalid'
                      ? <span className="reveal-answer">{pitchName(puzzle.solution[r][c])}</span>
                      : typeof value === 'string' ? value.trim() : pitchName(value)
                  }
                </span>
            }
          </div>
        )
      } else {
        // Staff mode
        const chrIdx = staffIdxs[key] ?? B4_INDEX
        const displayPc = filled ? (guesses[key] ?? chromaticToPc(chrIdx)) : null
        const isCorrect = status === 'correct'
        const isWrong = status === 'incorrect' || status === 'empty' || status === 'invalid'
        const noteColor = isCorrect ? 'var(--correct)' : isWrong ? '#e05555' : 'currentColor'
        const useFlats = (staffDirections[key] ?? 'up') === 'down'

        cells.push(
          <div
            key={key}
            ref={isSelected ? staffCellRef : null}
            tabIndex={isSelected ? 0 : -1}
            className={`${className} staff-cell`}
            onClick={() => handleCellClick(key)}
            onKeyDown={isSelected ? handleStaffKeyDown : undefined}
          >
            <StaffNote
              chromaticIndex={isSelected ? chrIdx : (displayPc !== null ? displayPc : B4_INDEX)}
              isEmpty={!filled && !isSelected}
              color={noteColor}
              useFlats={useFlats}
            />
            {isWrong && (
              <span className="staff-reveal">{pitchName(puzzle.solution[r][c])}</span>
            )}
          </div>
        )
      }
    })
  })

  return (
    <div className="app">
      <header>
        <h1>Music Theory Daily Puzzle</h1>
        <p className="date">{date}</p>
      </header>

      <div className="top-controls">
        <div className="difficulty-tabs">
          {DIFFICULTIES.map(d => (
            <button key={d} className={`tab ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <button className="mode-toggle" onClick={toggleMode} title="Toggle input mode">
          {inputMode === 'text' ? '𝄞 Staff' : 'Aa Text'}
        </button>
      </div>

      <p className="instructions">
        {inputMode === 'text'
          ? 'Click a cell and type the note. Use # for sharp, b for flat.'
          : 'Click a cell to select it. Use ↑ ↓ to change the note by half step.'}
      </p>

      <div
        className="grid"
        style={{ gridTemplateColumns: `minmax(110px,auto) repeat(${size}, 1fr)` }}
      >
        {cells}
      </div>

      <div className="controls">
        {!checked && (
          <button className="btn-primary" onClick={() => setChecked(true)} disabled={!allFilled}>
            {allFilled ? 'Check Answers' : `Fill all ${size * size} cells to check`}
          </button>
        )}
        {checked && (
          <>
            <p className="score">{score} / {size * size} correct</p>
            <button className="btn-ghost" onClick={() => {
              setChecked(false)
              setGuesses({})
              setStaffIdxs({})
              setStaffDirections({})
              setSelected(null)
            }}>
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
