import { useState, useEffect, useRef } from 'react'
import './App.css'
import { supabase } from './supabase'

const CURRENCY = 'Rs.'

const CATEGORIES = [
  { name: 'Mobiles', icon: '📱' },
  { name: 'Laptops', icon: '💻' },
  { name: 'Tablets', icon: '📲' },
  { name: 'Headphones', icon: '🎧' },
  { name: 'Smart Watches', icon: '⌚' },
  { name: 'Cameras', icon: '📷' },
  { name: 'Speakers', icon: '🔊' },
  { name: 'Gaming', icon: '🎮' },
  { name: 'TVs', icon: '📺' },
  { name: 'Home Appliances', icon: '🔌' },
  { name: 'Kitchen', icon: '🍳' },
  { name: 'Furniture', icon: '🛋️' },
  { name: 'Home Decor', icon: '🖼️' },
  { name: 'Bedding', icon: '🛏️' },
  { name: 'Lighting', icon: '💡' },
  { name: 'Men Fashion', icon: '👔' },
  { name: 'Women Fashion', icon: '👗' },
  { name: 'Kids Fashion', icon: '🧒' },
  { name: 'Footwear', icon: '👟' },
  { name: 'Bags', icon: '👜' },
  { name: 'Watches', icon: '🕰️' },
  { name: 'Jewellery', icon: '💍' },
  { name: 'Sunglasses', icon: '🕶️' },
  { name: 'Beauty', icon: '💄' },
  { name: 'Perfumes', icon: '🧴' },
  { name: 'Skin Care', icon: '🧼' },
  { name: 'Hair Care', icon: '💇' },
  { name: 'Health', icon: '💊' },
  { name: 'Fitness', icon: '🏋️' },
  { name: 'Sports', icon: '🏏' },
  { name: 'Outdoor', icon: '🏕️' },
  { name: 'Bicycles', icon: '🚲' },
  { name: 'Car Accessories', icon: '🚗' },
  { name: 'Motorcycle', icon: '🏍️' },
  { name: 'Tools', icon: '🔧' },
  { name: 'Garden', icon: '🌱' },
  { name: 'Pet Supplies', icon: '🐾' },
  { name: 'Baby Products', icon: '🍼' },
  { name: 'Toys', icon: '🧸' },
  { name: 'Books', icon: '📚' },
  { name: 'Stationery', icon: '✏️' },
  { name: 'Office', icon: '🖨️' },
  { name: 'Groceries', icon: '🥫' },
  { name: 'Snacks', icon: '🍫' },
  { name: 'Beverages', icon: '🥤' },
  { name: 'Dry Fruits', icon: '🥜' },
  { name: 'Art & Craft', icon: '🎨' },
  { name: 'Musical Instruments', icon: '🎸' },
  { name: 'Gifts', icon: '🎁' },
  { name: 'Islamic Items', icon: '🕌' },
]

const CAT_NAMES = CATEGORIES.map((c) => c.name)
const catIcon = (name) => CATEGORIES.find((c) => c.name === name)?.icon || '🛍️'

const STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']

const emptyForm = {
  name: '',
  price: '',
  discount: '',
  category: CATEGORIES[0].name,
  stock: '',
  description: '',
}
const emptyCheckout = { name: '', phone: '', address: '', city: '', note: '' }

const salePrice = (p) =>
  Math.round((p.price * (100 - (p.discount || 0))) / 100)

const money = (n) => `${CURRENCY} ${Number(n).toLocaleString('en-US')}`

const readStore = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

const goShop = () =>
  document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })

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

  return <>{prefix}{n.toLocaleString('en-US')}</>
}

function App() {
  // ----- Shop -----
  const [products, setProducts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [cart, setCart] = useState(() => readStore('elite-cart', []))
  const [fav, setFav] = useState(() => readStore('elite-fav', []))
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('')
  const [showAllCats, setShowAllCats] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [panel, setPanel] = useState(null) // 'cart' | 'fav' | 'orders' | 'form'
  const [toast, setToast] = useState('')
  const [theme, setTheme] = useState(
    localStorage.getItem('elite-theme') || 'dark'
  )

  // ----- Checkout -----
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [co, setCo] = useState(emptyCheckout)
  const [placing, setPlacing] = useState(false)
  const [orderCode, setOrderCode] = useState('')

  // ----- Admin -----
  const [session, setSession] = useState(null)
  const [showLogin, setShowLogin] = useState(window.location.hash === '#admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMsg, setLoginMsg] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [fileKey, setFileKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [orders, setOrders] = useState([])

  const searchRef = useRef(null)
  const isAdmin = !!session

  // ---------- Effects ----------
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('elite-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('elite-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('elite-fav', JSON.stringify(fav))
  }, [fav])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const locked = panel || orderCode || (showLogin && !isAdmin)
    document.body.style.overflow = locked ? 'hidden' : ''
  }, [panel, orderCode, showLogin, isAdmin])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const check = () => {
      if (window.location.hash === '#admin') setShowLogin(true)
    }
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: false })
    if (error) console.error(error)
    else setProducts(data || [])
    setLoaded(true)
  }

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('id', { ascending: false })
    if (error) console.error(error)
    else setOrders(data || [])
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (session) loadOrders()
    else setOrders([])
  }, [session])

  // ---------- Theme ----------
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  // ---------- Favourites ----------
  const toggleFav = (id) => {
    setFav(fav.includes(id) ? fav.filter((f) => f !== id) : [...fav, id])
  }

  // ---------- Cart ----------
  const addToCart = (product) => {
    const max = product.stock ?? 99
    const existing = cart.find((c) => c.id === product.id)
    if (existing && existing.qty >= max) {
      setToast('Itna stock maujood nahi hai')
      return
    }
    if (existing) {
      setCart(cart.map((c) => (c.id === product.id ? { ...c, qty: c.qty + 1 } : c)))
    } else {
      setCart([...cart, { id: product.id, qty: 1 }])
    }
    setToast('Cart mein add ho gaya 🛒')
  }

  const changeQty = (product, delta) => {
    const max = product.stock ?? 99
    setCart(
      cart
        .map((c) => {
          if (c.id !== product.id) return c
          const qty = Math.min(c.qty + delta, max)
          return { ...c, qty }
        })
        .filter((c) => c.qty > 0)
    )
  }

  const removeFromCart = (id) => setCart(cart.filter((c) => c.id !== id))

  const cartItems = cart
    .map((c) => ({ ...c, product: products.find((p) => p.id === c.id) }))
    .filter((c) => c.product)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const cartTotal = cartItems.reduce(
    (s, c) => s + salePrice(c.product) * c.qty,
    0
  )

  // ---------- Panels ----------
  const closePanel = () => {
    setPanel(null)
    setCheckoutOpen(false)
    resetForm()
  }

  const openPanel = (name) => {
    setMenuOpen(false)
    setPanel(name)
  }

  // ---------- Order place ----------
  const placeOrder = async (e) => {
    e.preventDefault()
    if (cartItems.length === 0) return
    setPlacing(true)
    const { data, error } = await supabase.rpc('place_order', {
      p_name: co.name,
      p_phone: co.phone,
      p_address: co.address,
      p_city: co.city,
      p_note: co.note,
      p_items: cartItems.map((c) => ({ id: c.id, qty: c.qty })),
    })
    setPlacing(false)
    if (error) {
      setToast(error.message)
      return
    }
    setCart([])
    setCo(emptyCheckout)
    closePanel()
    setOrderCode(data)
    loadProducts()
  }

  // ---------- Category / Search ----------
  const pickCategory = (name) => {
    setActiveCat(activeCat === name ? '' : name)
    goShop()
  }

  const q = search.trim().toLowerCase()
  const matches = (p) =>
    p.name.toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q)

  const suggestions = q ? products.filter(matches).slice(0, 5) : []

  const visible = products.filter(
    (p) => (!q || matches(p)) && (!activeCat || p.category === activeCat)
  )

  // ---------- Login / Logout ----------
  const closeLogin = () => {
    setShowLogin(false)
    setLoginMsg('')
    if (window.location.hash === '#admin') window.location.hash = ''
  }

  const login = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoginMsg(error.message)
    } else {
      setPassword('')
      closeLogin()
      setToast('Admin mode on ✅')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setShowLogin(false)
    closePanel()
    setToast('Logout ho gaye')
  }

  // ---------- Product form ----------
  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFile(null)
    setPreview('')
    setFileKey((k) => k + 1)
  }

  const openAdd = () => {
    resetForm()
    setPanel('form')
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      price: p.price ?? '',
      discount: p.discount || '',
      category: p.category || CATEGORIES[0].name,
      stock: p.stock ?? 0,
      description: p.description || '',
    })
    setFile(null)
    setPreview(p.image || '')
    setFileKey((k) => k + 1)
    setPanel('form')
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setToast('Sirf image file chuno')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setToast('Image 5MB se choti honi chahiye')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
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

  const saveProduct = async (e) => {
    e.preventDefault()
    if (!editingId && !file) {
      setToast('Pehle product ki image chuno')
      return
    }
    setSaving(true)
    try {
      let imageUrl = null
      if (file) imageUrl = await uploadImage(file)

      const payload = {
        name: form.name,
        price: Number(form.price),
        discount: Math.min(Number(form.discount) || 0, 90),
        category: form.category,
        stock: Number(form.stock),
        description: form.description,
      }
      if (imageUrl) payload.image = imageUrl

      const { error } = editingId
        ? await supabase.from('products').update(payload).eq('id', editingId)
        : await supabase.from('products').insert(payload)
      if (error) throw error

      setToast(editingId ? 'Product update ho gaya ✅' : 'Product add ho gaya ✅')
      closePanel()
      loadProducts()
    } catch (err) {
      setToast(err.message)
    }
    setSaving(false)
  }

  const deleteProduct = async (id) => {
    if (!confirm('Is product ko delete karna hai?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      setToast(error.message)
      return
    }
    setRemovingId(id)
    setTimeout(() => {
      setRemovingId(null)
      setToast('Product delete ho gaya 🗑️')
      loadProducts()
    }, 350)
  }

  // ---------- Orders (admin) ----------
  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) setToast(error.message)
    else loadOrders()
  }

  const deleteOrder = async (id) => {
    if (!confirm('Ye order delete karna hai?')) return
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) setToast(error.message)
    else loadOrders()
  }

  // ---------- Stats ----------
  const totalProducts = products.length
  const stockValue = products.reduce(
    (s, p) => s + salePrice(p) * (p.stock || 0),
    0
  )
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length
  const outOfStock = products.filter((p) => p.stock === 0).length
  const pendingOrders = orders.filter((o) => o.status === 'Pending').length

  const categoryOptions = CAT_NAMES.includes(form.category)
    ? CAT_NAMES
    : [form.category, ...CAT_NAMES]

  const favProducts = products.filter((p) => fav.includes(p.id))

  // ======================= UI =======================
  return (
    <>
      <nav className="navbar">
        <div className="logo">ELITE<span>MART.</span></div>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {[
            ['Home', '#'],
            ['Shop', '#shop'],
            ['Categories', '#categories'],
            ['About', '#about'],
          ].map(([label, href], i) => (
            <a
              key={label}
              href={href}
              style={{ '--n': i }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="nav-icons">
          <button
            className="icon-btn"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search"
          >
            {searchOpen ? '✕' : '⌕'}
          </button>
          <button
            className="icon-btn"
            onClick={() => openPanel('fav')}
            aria-label="Favourites"
          >
            ♡
            {fav.length > 0 && (
              <span className="badge" key={fav.length}>{fav.length}</span>
            )}
          </button>
          <button
            className="icon-btn theme-btn"
            onClick={toggleTheme}
            aria-label="Theme badlo"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            className="icon-btn"
            onClick={() => openPanel('cart')}
            aria-label="Cart"
          >
            🛒
            {cartCount > 0 && (
              <span className="badge" key={cartCount}>{cartCount}</span>
            )}
          </button>
          {isAdmin && (
            <button className="admin-chip" onClick={logout}>⚙️ Logout</button>
          )}
          <button
            className="icon-btn menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* ---------- Search bar ---------- */}
      {searchOpen && (
        <div className="searchbar">
          <form
            className="searchbar-inner"
            onSubmit={(e) => {
              e.preventDefault()
              goShop()
              setSearchOpen(false)
            }}
          >
            <input
              ref={searchRef}
              placeholder="Product ya category search karo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="clear-btn" onClick={() => setSearch('')}>
                ✕
              </button>
            )}
            <button type="submit" className="adm-btn search-go">Search</button>
          </form>

          {q && (
            <div className="suggest">
              {suggestions.length > 0 ? (
                suggestions.map((p) => (
                  <button
                    key={p.id}
                    className="suggest-item"
                    onClick={() => {
                      setSearch(p.name)
                      goShop()
                      setSearchOpen(false)
                    }}
                  >
                    <img src={p.image} alt="" />
                    <span>{p.name}</span>
                    <b>{money(salePrice(p))}</b>
                  </button>
                ))
              ) : (
                <p className="suggest-empty">Kuch nahi mila 😕</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------- Admin dashboard ---------- */}
      {isAdmin && (
        <section className="adm-dash">
          <div className="adm-dash-top">
            <h3>👑 Admin Mode</h3>
            <div className="adm-dash-btns">
              <button className="adm-btn adm-add" onClick={openAdd}>
                ➕ Naya Product
              </button>
              <button className="adm-btn adm-add adm-alt" onClick={() => openPanel('orders')}>
                🧾 Orders ({orders.length})
              </button>
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
              <h3><CountUp value={stockValue} prefix={`${CURRENCY} `} /></h3>
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
            <div className="adm-stat" style={{ '--i': 4 }}>
              <span>🧾</span>
              <h3><CountUp value={pendingOrders} /></h3>
              <p>Pending Orders</p>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero-content">
          <span className="tag">NEW COLLECTION 2026</span>
          <h1>
            ELEVATE YOUR
            <br />
            <span>EVERYDAY.</span>
          </h1>
          <p>
            Discover premium products designed for
            those who appreciate quality and style.
          </p>
          <div className="hero-btns">
            <a href="#shop" className="shop-btn">SHOP NOW →</a>
            <a href="#categories" className="ghost-btn">CATEGORIES</a>
          </div>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      <section className="categories" id="categories">
        <p>EXPLORE OUR COLLECTION</p>
        <h2>SHOP BY CATEGORY</h2>

        <div className="category-grid">
          {(showAllCats ? CATEGORIES : CATEGORIES.slice(0, 16)).map((c, i) => (
            <button
              key={c.name}
              className={`cat-tile ${activeCat === c.name ? 'active' : ''}`}
              style={{ '--i': i % 16 }}
              onClick={() => pickCategory(c.name)}
            >
              <span>{c.icon}</span>
              <small>{c.name}</small>
            </button>
          ))}
        </div>

        <button className="more-btn" onClick={() => setShowAllCats(!showAllCats)}>
          {showAllCats
            ? 'Kam dikhao ▲'
            : `Sab ${CATEGORIES.length} categories dekho ▼`}
        </button>
      </section>

      {/* ---------- Products ---------- */}
      <section className="products" id="shop">
        <p>HANDPICKED FOR YOU</p>
        <h2>FEATURED PRODUCTS</h2>

        {(q || activeCat) && (
          <div className="filter-chips">
            {activeCat && (
              <button className="chip" onClick={() => setActiveCat('')}>
                {catIcon(activeCat)} {activeCat} ✕
              </button>
            )}
            {q && (
              <button className="chip" onClick={() => setSearch('')}>
                🔍 "{search}" ✕
              </button>
            )}
          </div>
        )}

        <div className="product-grid">
          {!loaded &&
            [...Array(8)].map((_, i) => <div className="skeleton" key={i} />)}

          {visible.map((product, i) => {
            const price = salePrice(product)
            const isFav = fav.includes(product.id)
            const out = product.stock === 0
            return (
              <div
                className={`product-card ${removingId === product.id ? 'adm-removing' : ''}`}
                key={product.id}
                style={{ '--i': Math.min(i, 10) }}
              >
                <div className="pc-img">
                  <img src={product.image} alt={product.name} loading="lazy" />
                  {product.discount > 0 && (
                    <span className="pc-off">-{product.discount}%</span>
                  )}
                  <button
                    className={`heart ${isFav ? 'on' : ''}`}
                    onClick={() => toggleFav(product.id)}
                    aria-label="Favourite"
                  >
                    {isFav ? '♥' : '♡'}
                  </button>
                </div>

                <div className="pc-body">
                  {product.category && (
                    <span className="product-cat">
                      {catIcon(product.category)} {product.category}
                    </span>
                  )}
                  <h3 title={product.description || product.name}>{product.name}</h3>

                  <div className="pc-price">
                    <strong>{money(price)}</strong>
                    {product.discount > 0 && <del>{money(product.price)}</del>}
                  </div>

                  {isAdmin ? (
                    <small
                      className={`stock-note ${out ? 'out' : product.stock <= 5 ? 'low' : ''}`}
                    >
                      Stock: {product.stock}
                    </small>
                  ) : (
                    product.stock > 0 &&
                    product.stock <= 5 && (
                      <small className="stock-note low">🔥 Sirf {product.stock} bache hain</small>
                    )
                  )}

                  <button
                    className="pc-add"
                    disabled={out}
                    onClick={() => addToCart(product)}
                  >
                    {out ? 'Out of Stock' : 'Add to Cart'}
                  </button>

                  {isAdmin && (
                    <div className="card-admin">
                      <button onClick={() => startEdit(product)}>✏️ Edit</button>
                      <button className="del" onClick={() => deleteProduct(product.id)}>
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {loaded && visible.length === 0 && (
          <p className="adm-empty">
            {products.length === 0
              ? 'Abhi koi product nahi hai.'
              : 'Is search ya category mein koi product nahi mila.'}
          </p>
        )}
      </section>

      <footer id="about">
        <h2>ELITE MART.</h2>
        <p>Your Premium Shopping Destination.</p>
        <p>© 2026 ELITE MART. All rights reserved.</p>
        {!isAdmin && (
          <a href="#admin" className="footer-admin">🔐 Admin</a>
        )}
      </footer>

      {/* ---------- Cart drawer ---------- */}
      {panel === 'cart' && (
        <div className="drawer-overlay" onClick={closePanel}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h3>🛒 Aap ka Cart ({cartCount})</h3>
              <button className="drawer-close" onClick={closePanel}>✕</button>
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-state">
                <span>🛒</span>
                <p>Cart khali hai</p>
                <button className="adm-btn" onClick={() => { closePanel(); goShop() }}>
                  Shopping shuru karo
                </button>
              </div>
            ) : !checkoutOpen ? (
              <>
                <div className="drawer-list">
                  {cartItems.map(({ product, qty }) => (
                    <div className="cart-item" key={product.id}>
                      <img src={product.image} alt={product.name} />
                      <div className="ci-info">
                        <strong>{product.name}</strong>
                        <span>{money(salePrice(product))}</span>
                        <div className="qty">
                          <button onClick={() => changeQty(product, -1)}>−</button>
                          <b>{qty}</b>
                          <button onClick={() => changeQty(product, 1)}>+</button>
                        </div>
                      </div>
                      <div className="ci-right">
                        <button className="ci-remove" onClick={() => removeFromCart(product.id)}>
                          🗑️
                        </button>
                        <strong>{money(salePrice(product) * qty)}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="drawer-foot">
                  <div className="total-row">
                    <span>Total</span>
                    <strong>{money(cartTotal)}</strong>
                  </div>
                  <button className="adm-btn" onClick={() => setCheckoutOpen(true)}>
                    Order Place Karo →
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={placeOrder} className="adm-form">
                <button type="button" className="adm-link back-link" onClick={() => setCheckoutOpen(false)}>
                  ← Cart par wapas
                </button>

                <div className="total-row">
                  <span>Order Total</span>
                  <strong>{money(cartTotal)}</strong>
                </div>

                <input
                  placeholder="Aap ka poora naam"
                  value={co.name}
                  onChange={(e) => setCo({ ...co, name: e.target.value })}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone number (03xx xxxxxxx)"
                  pattern="[0-9+ \-]{7,15}"
                  value={co.phone}
                  onChange={(e) => setCo({ ...co, phone: e.target.value })}
                  required
                />
                <input
                  placeholder="City"
                  value={co.city}
                  onChange={(e) => setCo({ ...co, city: e.target.value })}
                  required
                />
                <textarea
                  rows="3"
                  placeholder="Poora address"
                  value={co.address}
                  onChange={(e) => setCo({ ...co, address: e.target.value })}
                  required
                />
                <textarea
                  rows="2"
                  placeholder="Koi note (optional)"
                  value={co.note}
                  onChange={(e) => setCo({ ...co, note: e.target.value })}
                />

                <button type="submit" className="adm-btn" disabled={placing}>
                  {placing ? <span className="adm-spinner" /> : '✅ Order Place Karo'}
                </button>
              </form>
            )}
          </aside>
        </div>
      )}

      {/* ---------- Favourites drawer ---------- */}
      {panel === 'fav' && (
        <div className="drawer-overlay" onClick={closePanel}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h3>♥ Pasandida Products ({favProducts.length})</h3>
              <button className="drawer-close" onClick={closePanel}>✕</button>
            </div>

            {favProducts.length === 0 ? (
              <div className="empty-state">
                <span>♡</span>
                <p>Abhi koi favourite nahi hai.</p>
                <small>Kisi product ke dil ❤️ par click karo.</small>
              </div>
            ) : (
              <div className="drawer-list">
                {favProducts.map((p) => (
                  <div className="cart-item" key={p.id}>
                    <img src={p.image} alt={p.name} />
                    <div className="ci-info">
                      <strong>{p.name}</strong>
                      <span>{money(salePrice(p))}</span>
                      <button
                        className="mini-add"
                        disabled={p.stock === 0}
                        onClick={() => addToCart(p)}
                      >
                        {p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                    <div className="ci-right">
                      <button className="ci-remove" onClick={() => toggleFav(p.id)}>♥</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ---------- Orders drawer (admin) ---------- */}
      {isAdmin && panel === 'orders' && (
        <div className="drawer-overlay" onClick={closePanel}>
          <aside className="drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h3>🧾 Orders ({orders.length})</h3>
              <button className="drawer-close" onClick={closePanel}>✕</button>
            </div>

            {orders.length === 0 && (
              <div className="empty-state">
                <span>🧾</span>
                <p>Abhi koi order nahi aaya.</p>
              </div>
            )}

            <div className="drawer-list">
              {orders.map((o) => (
                <div className="order-card" key={o.id}>
                  <div className="order-top">
                    <strong>{o.code}</strong>
                    <select
                      className={`status st-${o.status}`}
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <small>{new Date(o.created_at).toLocaleString()}</small>
                  <p>👤 {o.customer_name} • 📞 <a href={`tel:${o.phone}`}>{o.phone}</a></p>
                  <p>📍 {o.address}{o.city ? `, ${o.city}` : ''}</p>
                  {o.note && <p>📝 {o.note}</p>}
                  <ul>
                    {o.items.map((it, i) => (
                      <li key={i}>
                        {it.name} × {it.qty} — {money(it.price * it.qty)}
                      </li>
                    ))}
                  </ul>
                  <div className="order-bottom">
                    <strong>Total: {money(o.total)}</strong>
                    <button className="ci-remove" onClick={() => deleteOrder(o.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* ---------- Product add/edit drawer (admin) ---------- */}
      {isAdmin && panel === 'form' && (
        <div className="drawer-overlay" onClick={closePanel}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h3>{editingId ? '✏️ Product Edit Karo' : '➕ Naya Product'}</h3>
              <button className="drawer-close" onClick={closePanel}>✕</button>
            </div>

            <form onSubmit={saveProduct} className="adm-form">
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
                  placeholder={`Price (${CURRENCY})`}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
                <input
                  type="number"
                  min="0"
                  max="90"
                  placeholder="Discount % (optional)"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                />
              </div>

              <div className="adm-row">
                <input
                  type="number"
                  min="0"
                  placeholder="Stock"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  required
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{catIcon(c)} {c}</option>
                  ))}
                </select>
              </div>

              <textarea
                rows="3"
                placeholder="Product ki detail (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <div className="adm-row">
                <button type="submit" className="adm-btn" disabled={saving}>
                  {saving ? (
                    <span className="adm-spinner" />
                  ) : editingId ? (
                    'Update Product'
                  ) : (
                    'Add Product'
                  )}
                </button>
                <button type="button" className="adm-btn adm-cancel" onClick={closePanel}>
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* ---------- Admin login ---------- */}
      {showLogin && !isAdmin && (
        <div className="modal-overlay" onClick={closeLogin}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h2>ADMIN LOGIN</h2>
              <button className="drawer-close" onClick={closeLogin}>✕</button>
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
            {loginMsg && <p className="adm-msg" key={loginMsg}>{loginMsg}</p>}
          </div>
        </div>
      )}

      {/* ---------- Order done ---------- */}
      {orderCode && (
        <div className="modal-overlay" onClick={() => setOrderCode('')}>
          <div className="modal done" onClick={(e) => e.stopPropagation()}>
            <div className="done-icon">✅</div>
            <h2>Order Place Ho Gaya!</h2>
            <p>Aap ka order code:</p>
            <div className="code-box">{orderCode}</div>
            <small>Ye code sambhaal kar rakho.</small>
            <button className="adm-btn" onClick={() => setOrderCode('')}>
              Theek hai
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast" key={toast}>{toast}</div>}
    </>
  )
}

export default App