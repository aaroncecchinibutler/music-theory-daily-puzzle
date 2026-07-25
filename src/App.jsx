import { useState, useEffect, useRef, useCallback } from 'react'
import { generatePuzzle } from './puzzleEngine.js'
import { chordLabel, pitchName } from './musicTheory.js'
import { StaffNote, chromaticToPc, B4_INDEX } from './StaffNote.jsx'
import './App.css'

const DIFFICULTIES = ['easy', 'hard']

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

function ShareButton({ score, total, elapsed, stars, difficulty, date }) {
  const [copied, setCopied] = useState(false)

  function buildShareText() {
    const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars)
    const m = Math.floor(elapsed / 60)
    const s = elapsed % 60
    const timeStr = `${m}:${s.toString().padStart(2, '0')}`
    return [
      `🎵 Music Theory Daily Puzzle`,
      `${date} · ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
      ``,
      `${score}/${total} correct · ${timeStr}`,
      starStr,
      ``,
      `music-theory-daily-puzzle.vercel.app`,
    ].join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button className="btn-share" onClick={handleShare}>
      {copied ? '✓ Copied!' : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6, verticalAlign: 'middle'}}>
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </>
      )}
    </button>
  )
}

export default function App() {
  const [difficulty, setDifficulty] = useState('easy')
  const [lightMode, setLightMode] = useState(false)

  useEffect(() => {
    document.body.setAttribute('data-theme', lightMode ? 'light' : 'dark')
  }, [lightMode])
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
  const [elapsed, setElapsed] = useState(0)
  const [timerStarted, setTimerStarted] = useState(false)
  const startTimeRef = useRef(null)
  const timerRef = useRef(null)
  const textInputRef = useRef(null)
  const staffCellRef = useRef(null)
  const date = todayStr()

  function startTimerIfNeeded() {
    if (startTimeRef.current === null && !checked) {
      startTimeRef.current = Date.now()
      setTimerStarted(true)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    }
  }

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
    setElapsed(0)
    setTimerStarted(false)
    startTimeRef.current = null
    clearInterval(timerRef.current)
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
    startTimerIfNeeded()
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

  function starsForTime(seconds, wrongCount) {
    const adjusted = seconds + wrongCount * 30
    if (adjusted < 60)  return 5
    if (adjusted < 120) return 4
    if (adjusted < 180) return 3
    if (adjusted < 240) return 2
    return 1
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
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
      <label className="theme-toggle" title="Toggle light/dark mode">
        <span className="theme-toggle-icon">☀️</span>
        <span className={`switch-track ${lightMode ? 'on' : ''}`} onClick={() => setLightMode(m => !m)}>
          <span className={`switch-thumb ${lightMode ? 'on' : ''}`} />
        </span>
        <span className="theme-toggle-icon">🌙</span>
      </label>
      <header>
        <h1>Music Theory Daily Puzzle</h1>
        <p className="date">{date}</p>
        {timerStarted && (
          <p className="timer">{formatTime(elapsed)}</p>
        )}
      </header>

      <div className="top-controls">
        <div className="difficulty-tabs">
          {DIFFICULTIES.map(d => (
            <button key={d} className={`tab ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <label className="mode-switch" title="Toggle input mode">
          <span className="mode-switch-label">𝄞 Staff</span>
          <span className={`switch-track ${inputMode === 'staff' ? 'on' : ''}`} onClick={toggleMode}>
            <span className={`switch-thumb ${inputMode === 'staff' ? 'on' : ''}`} />
          </span>
        </label>
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
          <button className="btn-primary" onClick={() => { clearInterval(timerRef.current); setChecked(true) }} disabled={!allFilled}>
            {allFilled ? 'Check Answers' : `Fill all ${size * size} cells to check`}
          </button>
        )}
        {checked && (
          <>
            <p className="score">{score} / {size * size} correct</p>
            <p className="stars">{'★'.repeat(starsForTime(elapsed, size * size - score))}{'☆'.repeat(5 - starsForTime(elapsed, size * size - score))}</p>
            <p className="time-result">{formatTime(elapsed)}</p>
            <ShareButton score={score} total={size * size} elapsed={elapsed} stars={starsForTime(elapsed, size * size - score)} difficulty={difficulty} date={date} />
            <button className="btn-ghost" onClick={() => {
              setChecked(false)
              setGuesses({})
              setStaffIdxs({})
              setStaffDirections({})
              setSelected(null)
              setElapsed(0)
              setTimerStarted(false)
              startTimeRef.current = null
              clearInterval(timerRef.current)
            }}>
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
