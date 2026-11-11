import { useCallback, useEffect, useRef, useState } from 'react'
import { displayName } from '../lib/auth.js'
import { BODY_MAX, KINDS, addPost, deletePost, fetchBoard, kindLabel, reportPost, timeAgo, validateBody } from '../lib/board.js'
import { getSupabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/useAuth.jsx'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice } from './controls.jsx'
import { PageHeader } from './layout.jsx'
import Menu from './Menu.jsx'
import './Community.css'

const FILTERS = [{ value: 'all', label: 'All' }, ...KINDS]

// #community: what everyone is working on or stuck on, newest first. Anyone can read; log in to post and reply.
export default function CommunityPage() {
  const auth = useAuth()
  const [filter, setFilter] = usePersistentState('music.board.filter', 'all')
  const kind = FILTERS.some((f) => f.value === filter) ? filter : 'all'
  const [board, setBoard] = useState({ status: 'loading', posts: [], more: false, error: '' })
  const [notice, setNotice] = useState('')
  const loadId = useRef(0)

  const signedIn = auth.status === 'signedIn'
  const me = signedIn ? auth.user.id : null

  const load = useCallback(
    async (before = null) => {
      const id = ++loadId.current
      setBoard((b) => ({ ...b, status: before ? 'more' : 'loading', error: '' }))
      try {
        const supabase = await getSupabase()
        const page = await fetchBoard(supabase, { kind, before })
        if (id !== loadId.current) return
        setBoard((b) => ({ status: 'ready', posts: before ? [...b.posts, ...page.posts] : page.posts, more: page.more, error: '' }))
      } catch (err) {
        if (id === loadId.current) setBoard((b) => ({ ...b, status: 'ready', error: err.message }))
      }
    },
    [kind],
  )

  useEffect(() => {
    if (auth.status !== 'off') load()
  }, [auth.status, load])

  if (auth.status === 'off') {
    return (
      <div className="page community-page">
        <PageHeader title="Community" summary="The community board isn't switched on for this copy of the site." />
      </div>
    )
  }

  const withSupabase = async (fn) => fn(await getSupabase())

  const posted = (post) => {
    setFilter(kind === 'all' || kind === post.kind ? kind : 'all')
    setBoard((b) => ({ ...b, posts: [{ ...post, replies: [] }, ...b.posts] }))
  }
  const replied = (reply) =>
    setBoard((b) => ({ ...b, posts: b.posts.map((p) => (p.id === reply.parent_id ? { ...p, replies: [...p.replies, reply] } : p)) }))
  const removeLocal = (id) =>
    setBoard((b) => ({
      ...b,
      posts: b.posts.filter((p) => p.id !== id).map((p) => ({ ...p, replies: p.replies.filter((r) => r.id !== id) })),
    }))

  const remove = async (item) => {
    if (!window.confirm(item.parent_id ? 'Delete your reply?' : 'Delete your post and its replies?')) return
    try {
      await withSupabase((sb) => deletePost(sb, item.id))
      removeLocal(item.id)
    } catch (err) {
      setNotice(err.message)
    }
  }
  const report = async (item) => {
    try {
      await withSupabase((sb) => reportPost(sb, item.id))
      removeLocal(item.id)
      setNotice('Thanks. It’s hidden for you, and we’ll take a look.')
    } catch (err) {
      setNotice(err.message)
    }
  }

  const empty = board.status === 'ready' && !board.error && board.posts.length === 0

  return (
    <div className="page community-page">
      <PageHeader title="Community" summary="Share what you’re practising or stuck on, and help each other out." />

      {signedIn ? <Composer name={displayName(auth.user, auth.profile)} onPosted={posted} withSupabase={withSupabase} /> : <LogInPrompt loading={auth.status === 'loading'} />}

      <Choice label="Show" hideLabel options={FILTERS} value={kind} onChange={setFilter} />

      {notice && (
        <p className="notice" role="status">
          {notice}{' '}
          <button type="button" className="link-button" onClick={() => setNotice('')}>
            OK
          </button>
        </p>
      )}

      {board.error && (
        <p className="error" role="alert">
          {board.error}{' '}
          <button type="button" className="link-button" onClick={() => load()}>
            Try again
          </button>
        </p>
      )}

      {board.status === 'loading' ? (
        <p className="hint" role="status">
          Loading posts…
        </p>
      ) : empty ? (
        <div className="empty">
          <p>{kind === 'all' ? 'No posts yet.' : `No “${kindLabel(kind)}” posts yet.`}</p>
          <p className="hint">{signedIn ? 'Be the first: say what you’re working on.' : 'Log in and be the first to post.'}</p>
        </div>
      ) : (
        <ul className="board-list">
          {board.posts.map((post) => (
            <PostCard key={post.id} post={post} me={me} signedIn={signedIn} onReplied={replied} onRemove={remove} onReport={report} withSupabase={withSupabase} />
          ))}
        </ul>
      )}

      {board.more && (
        <button type="button" className="board-more" onClick={() => load(board.posts.at(-1)?.created_at)} disabled={board.status === 'more'}>
          {board.status === 'more' ? 'Loading…' : 'Older posts'}
        </button>
      )}

      <p className="page-hint">Be kind. Posts and your name are visible to everyone; ⋯ reports anything that doesn’t belong.</p>
    </div>
  )
}

function LogInPrompt({ loading }) {
  return (
    <div className="board-login">
      <p>Log in with Google to post and reply.</p>
      <a className="board-login-link" href="#account" aria-disabled={loading || undefined}>
        Log in
      </a>
    </div>
  )
}

/** A text box with a Post / Reply button. Calls `send(body)`; clears itself when that works. */
function useWriter(send) {
  const [text, setText] = useState('')
  const [state, setState] = useState({ busy: false, error: '' })
  const submit = async (e) => {
    e.preventDefault()
    const { body, error } = validateBody(text)
    if (error) return setState({ busy: false, error })
    setState({ busy: true, error: '' })
    try {
      await send(body)
      setText('')
      setState({ busy: false, error: '' })
    } catch (err) {
      setState({ busy: false, error: err.message })
    }
  }
  return { text, setText, state, submit }
}

function Composer({ name, onPosted, withSupabase }) {
  const [kind, setKind] = usePersistentState('music.board.kind', 'working')
  const safeKind = KINDS.some((k) => k.value === kind) ? kind : 'working'
  const w = useWriter(async (body) => onPosted(await withSupabase((sb) => addPost(sb, { kind: safeKind, body }))))
  const placeholder = safeKind === 'help' ? 'What are you stuck on? A chord change, a strumming pattern, a song…' : 'What are you practising this week?'

  return (
    <form className="board-composer" onSubmit={w.submit} noValidate>
      <Choice label="Post type" hideLabel options={KINDS} value={safeKind} onChange={setKind} size="small" />
      <textarea value={w.text} onChange={(e) => w.setText(e.target.value)} placeholder={placeholder} rows={3} maxLength={BODY_MAX} aria-label="Your post" />
      <div className="board-composer-foot">
        <span className="hint">
          Posting as <strong>{name}</strong> · <a href="#account">change</a>
        </span>
        <button type="submit" className="primary" disabled={w.state.busy || !w.text.trim()}>
          {w.state.busy ? 'Posting…' : 'Post'}
        </button>
      </div>
      {w.state.error && (
        <p className="error" role="alert">
          {w.state.error}
        </p>
      )}
    </form>
  )
}

function Byline({ item, mine, onRemove, onReport, signedIn }) {
  const items = [
    mine && { label: item.parent_id ? 'Delete reply' : 'Delete post', destructive: true, onSelect: () => onRemove(item) },
    !mine && signedIn && { label: 'Report', onSelect: () => onReport(item) },
  ]
  return (
    <div className="board-byline">
      <span className="board-author">{mine ? 'You' : item.author_name}</span>
      {item.kind && <span className={`board-kind ${item.kind}`}>{kindLabel(item.kind)}</span>}
      <time className="board-time" dateTime={item.created_at} title={new Date(item.created_at).toLocaleString()}>
        {timeAgo(item.created_at)}
      </time>
      {items.some(Boolean) && <Menu label={`More for ${item.author_name}’s ${item.parent_id ? 'reply' : 'post'}`} buttonClassName="icon-button board-menu" items={items} />}
    </div>
  )
}

function PostCard({ post, me, signedIn, onReplied, onRemove, onReport, withSupabase }) {
  const [replying, setReplying] = useState(false)
  const box = useRef(null)
  const w = useWriter(async (body) => {
    onReplied(await withSupabase((sb) => addPost(sb, { parentId: post.id, body })))
    setReplying(false)
  })

  useEffect(() => {
    if (replying) box.current?.focus()
  }, [replying])

  const count = post.replies.length
  return (
    <li className={`board-post${post.kind === 'help' ? ' help' : ''}`}>
      <Byline item={post} mine={post.author === me} signedIn={signedIn} onRemove={onRemove} onReport={onReport} />
      <p className="board-body">{post.body}</p>

      {count > 0 && (
        <ul className="board-replies" aria-label={`${count} ${count === 1 ? 'reply' : 'replies'}`}>
          {post.replies.map((r) => (
            <li key={r.id} className="board-reply">
              <Byline item={r} mine={r.author === me} signedIn={signedIn} onRemove={onRemove} onReport={onReport} />
              <p className="board-body">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      {replying ? (
        <form className="board-reply-form" onSubmit={w.submit} noValidate>
          <textarea ref={box} value={w.text} onChange={(e) => w.setText(e.target.value)} rows={2} maxLength={BODY_MAX} placeholder={post.kind === 'help' ? 'Share what helped you…' : 'Say something encouraging…'} aria-label="Your reply" />
          <div className="board-reply-actions">
            <button type="button" onClick={() => setReplying(false)} disabled={w.state.busy}>
              Cancel
            </button>
            <button type="submit" disabled={w.state.busy || !w.text.trim()}>
              {w.state.busy ? 'Replying…' : 'Reply'}
            </button>
          </div>
          {w.state.error && (
            <p className="error" role="alert">
              {w.state.error}
            </p>
          )}
        </form>
      ) : signedIn ? (
        <button type="button" className="link-button board-reply-button" onClick={() => setReplying(true)}>
          Reply
        </button>
      ) : null}
    </li>
  )
}
