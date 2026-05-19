import { useState, useEffect } from 'react'
import './App.css'

export default function App() {
  const [items, setItems] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/items')
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setError('Could not reach backend'))
      .finally(() => setLoading(false))
  }, [])

  async function addItem(e) {
    e.preventDefault()
    if (!input.trim()) return
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.trim() }),
    })
    const item = await res.json()
    setItems((prev) => [...prev, item])
    setInput('')
  }

  async function deleteItem(id) {
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="app">
      <h1>Full Stack App</h1>
      <p className="subtitle">FastAPI · React · PostgreSQL</p>

      <form className="form" onSubmit={addItem}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="New item..."
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      <ul className="list">
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <button className="delete" onClick={() => deleteItem(item.id)}>✕</button>
          </li>
        ))}
        {!loading && items.length === 0 && (
          <li className="empty">No items yet — add one above.</li>
        )}
      </ul>
    </div>
  )
}
