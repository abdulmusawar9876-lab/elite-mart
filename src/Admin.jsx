import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const CATEGORIES = ['Accessories', 'Fashion', 'Footwear', 'Electronics', 'General']
const emptyForm = { name: '', price: '', category: 'General', stock: '', description: '' }

function CountUp({ value, prefix = '' }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 800
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      setN(Math.round(value * p))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <>{prefix}{n}</>
}

function Admin({ theme, toggleTheme }) {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [fileKey, setFileKey] = useState(0)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: false })
    if (error) setMsg(error.message)
    else setProducts(data || [])
  }

  useEffect(() => {
    if (session) loadProducts()
  }, [session])

  const login = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMsg(error ? error.message : '')
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const goHome = () => {
    window.location.hash = ''
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setMsg('Sirf image file chuno')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setMsg('Image 5MB se choti honi chahiye')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setMsg('')
  }

  const uploadImage = async (f) => {
    const ext = f.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, f)
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFile(null)
    setPreview('')
    setFileKey((k) => k + 1)
  }

  const saveProduct = async (e) => {
    e.preventDefault()
    if (!editingId && !file) {
      setMsg('Pehle product ki image chuno')
      return
    }
    setLoading(true)
    try {
      let imageUrl = null
      if (file) imageUrl = await uploadImage(file)

      const payload = {
        name: form.name,
        price: Number(form.price),
        category: form.category,
        stock: Number(form.stock),
        description: form.description,
      }
      if (imageUrl) payload.image = imageUrl

      const { error } = editingId
        ? await supabase.from('products').update(payload).eq('id', editingId)
        : await supabase.from('products').insert(payload)
      if (error) throw error

      setMsg(editingId ? 'Product update ho gaya ✅' : 'Product add ho gaya ✅')
      resetForm()
      loadProducts()
    } catch (err) {
      setMsg(err.message)
    }
    setLoading(false)
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      price: p.price ?? '',
      category: p.category || 'General',
      stock: p.stock ?? 0,
      description: p.description || '',
    })
    setFile(null)
    setPreview(p.image || '')
    setFileKey((k) => k + 1)
    setMsg('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteProduct = async (id) => {
    if (!confirm('Is product ko delete karna hai?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      setMsg(error.message)
      return
    }
    setRemovingId(id)
    setTimeout(() => {
      setRemovingId(null)
      setMsg('Product delete ho gaya 🗑️')
      loadProducts()
    }, 350)
  }

  const totalProducts = products.length
  const stockValue = products.reduce((s, p) => s + p.price * (p.stock || 0), 0)
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length
  const outOfStock = products.filter((p) => p.stock === 0).length

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const themeIcon = theme === 'dark' ? '☀️' : '🌙'

  if (!session) {
    return (
      <div className="adm">
        <div className="adm-login">
          <div className="adm-login-top">
            <h2>ADMIN LOGIN</h2>
            <button className="adm-theme" onClick={toggleTheme} aria-label="Theme badlo">
              {themeIcon}
            </button>
          </div>
          <form onSubmit={login} className="adm-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="adm-btn">Login</button>
          </form>
          {msg && <p className="adm-msg" key={msg}>{msg}</p>}
          <button className="adm-link adm-back" onClick={goHome}>← Back to shop</button>
        </div>
      </div>
    )
  }

  return (
    <div className="adm">
      <div className="adm-header">
        <h2>ELITE MART • ADMIN</h2>
        <div className="adm-header-right">
          <button className="adm-theme" onClick={toggleTheme} aria-label="Theme badlo">
            {themeIcon}
          </button>
          <button className="adm-link" onClick={goHome}>← Shop</button>
          <button className="adm-link" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-stat" style={{ '--i': 0 }}>
          <span>📦</span>
          <h3><CountUp value={totalProducts} /></h3>
          <p>Total Products</p>
        </div>
        <div className="adm-stat" style={{ '--i': 1 }}>
          <span>💰</span>
          <h3><CountUp value={stockValue} prefix="$" /></h3>
          <p>Stock Value</p>
        </div>
        <div className="adm-stat" style={{ '--i': 2 }}>
          <span>⚠️</span>
          <h3><CountUp value={lowStock} /></h3>
          <p>Low Stock</p>
        </div>
        <div className="adm-stat" style={{ '--i': 3 }}>
          <span>🚫</span>
          <h3><CountUp value={outOfStock} /></h3>
          <p>Out of Stock</p>
        </div>
      </div>

      <form onSubmit={saveProduct} className="adm-card adm-form" style={{ '--i': 4 }}>
        <h3>{editingId ? '✏️ Product Edit Karo' : '➕ Naya Product Add Karo'}</h3>

        <label className="adm-upload">
          {preview ? (
            <img src={preview} alt="preview" key={preview} />
          ) : (
            <div>
              <span>📷</span>
              <p>Gallery se image chuno</p>
            </div>
          )}
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={handleFile}
            hidden
          />
        </label>

        <input
          placeholder="Product ka naam"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <div className="adm-row">
          <input
            type="number"
            min="0"
            placeholder="Price ($)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <input
            type="number"
            min="0"
            placeholder="Stock (kitne hain)"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            required
          />
        </div>

        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <textarea
          rows="3"
          placeholder="Product ki detail (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div className="adm-row">
          <button type="submit" className="adm-btn" disabled={loading}>
            {loading ? (
              <span className="adm-spinner" />
            ) : editingId ? (
              'Update Product'
            ) : (
              'Add Product'
            )}
          </button>
          {editingId && (
            <button type="button" className="adm-btn adm-cancel" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {msg && <p className="adm-msg" key={msg}>{msg}</p>}

      <div className="adm-card" style={{ '--i': 5 }}>
        <div className="adm-list-top">
          <h3>Maujooda Products ({filtered.length})</h3>
          <input
            className="adm-search"
            placeholder="🔍 Naam ya category search karo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.map((p, i) => (
          <div
            className={`adm-item ${removingId === p.id ? 'adm-removing' : ''}`}
            key={p.id}
            style={{ '--i': Math.min(i, 10) }}
          >
            <img src={p.image} alt={p.name} />
            <div className="adm-info">
              <strong>{p.name}</strong>
              <small>{p.category} • ${p.price}</small>
              <small className={p.stock === 0 ? 'adm-out' : p.stock <= 5 ? 'adm-low' : ''}>
                Stock: {p.stock}
              </small>
            </div>
            <div className="adm-actions">
              <button onClick={() => startEdit(p)}>Edit</button>
              <button className="adm-del" onClick={() => deleteProduct(p.id)}>Delete</button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && <p className="adm-empty">Koi product nahi mila.</p>}
      </div>
    </div>
  )
}

export default Admin