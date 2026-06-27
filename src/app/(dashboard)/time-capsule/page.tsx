"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Trash2, PencilLine } from "lucide-react"

interface CapsuleListItem {
  id: string
  title: string
  fromUserId: string
  toUserId: string
  fromUserName: string
  toUserName: string
  unlockAt: string
  createdAt: string
  isLocked: boolean
  isSender: boolean
}

interface UserInfo {
  id: string
  name: string
}

export default function TimeCapsulePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [capsules, setCapsules] = useState<CapsuleListItem[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedContent, setExpandedContent] = useState<string | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [editingCapsuleId, setEditingCapsuleId] = useState<string | null>(null)

  const [formTitle, setFormTitle] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formToUser, setFormToUser] = useState("")
  const [formUnlockAt, setFormUnlockAt] = useState("")

  const fetchCapsules = useCallback(async () => {
    try {
      const res = await fetch("/api/time-capsules")
      if (!res.ok) throw new Error("获取失败")
      const data = await res.json()
      setCapsules(data.capsules)
    } catch {
      setError("加载时光胶囊失败")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (!res.ok) return
      const data = await res.json()
      setUsers(data.users)
      const other = data.users.find((u: UserInfo) => u.id !== session?.user?.id)
      if (other) setFormToUser(other.id)
    } catch {}
  }, [session?.user?.id])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetchCapsules()
      fetchUsers()
    }
  }, [status, fetchCapsules, fetchUsers])

  const handleExpand = async (capsule: CapsuleListItem) => {
    if (expandedId === capsule.id) {
      setExpandedId(null)
      setExpandedContent(null)
      return
    }
    if (capsule.isLocked && !capsule.isSender) return

    setExpandedId(capsule.id)
    setExpandedContent(null)
    setLoadingContent(true)

    try {
      const res = await fetch(`/api/time-capsules/${capsule.id}`)
      if (!res.ok) throw new Error("获取详情失败")
      const data = await res.json()
      setExpandedContent(data.capsule.content)
    } catch {
      setExpandedContent("（加载失败）")
    } finally {
      setLoadingContent(false)
    }
  }

  const handleEdit = async (capsule: CapsuleListItem) => {
    try {
      const res = await fetch(`/api/time-capsules/${capsule.id}`)
      if (!res.ok) throw new Error("获取详情失败")
      const data = await res.json()
      const c = data.capsule
      setFormTitle(c.title)
      setFormContent(c.content || "")
      setFormToUser(c.toUserId)
      const d = new Date(c.unlockAt)
      const pad = (n: number) => n.toString().padStart(2, "0")
      setFormUnlockAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
      setEditingCapsuleId(capsule.id)
      setShowForm(true)
      setExpandedId(null)
      setExpandedContent(null)
    } catch {
      setError("加载情书失败")
    }
  }

  const handleDelete = async (capsule: CapsuleListItem) => {
    if (!confirm("确定要删除这封情书吗？删除后无法恢复。")) return
    try {
      const res = await fetch(`/api/time-capsules/${capsule.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "删除失败")
      }
      setCapsules((prev) => prev.filter((c) => c.id !== capsule.id))
      if (expandedId === capsule.id) {
        setExpandedId(null)
        setExpandedContent(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败")
    }
  }

  const resetForm = () => {
    setFormTitle("")
    setFormContent("")
    setFormUnlockAt("")
    setEditingCapsuleId(null)
    setShowForm(false)
  }

  const handleSend = async () => {
    if (!formTitle.trim() || !formContent.trim() || !formToUser || !formUnlockAt || sending) return
    setSending(true)
    setError("")

    try {
      const isEditing = !!editingCapsuleId
      const url = isEditing ? `/api/time-capsules/${editingCapsuleId}` : "/api/time-capsules"
      const method = isEditing ? "PUT" : "POST"

      const body: Record<string, string> = {
        title: formTitle.trim(),
        content: formContent.trim(),
      }
      body.unlockAt = formUnlockAt
      if (!isEditing) body.toUserId = formToUser

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "操作失败")
      }

      resetForm()
      await fetchCapsules()
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败")
    } finally {
      setSending(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-rose-300 font-[425] tracking-wide text-sm"
        >
          加载中...
        </motion.div>
      </div>
    )
  }

  const now = new Date()
  const minUnlock = new Date(now.getTime() + 60 * 60 * 1000)
  const minUnlockStr = minUnlock.toISOString().slice(0, 16)

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-[calc(100dvh-4.5rem)] px-4">
      {/* Header */}
      <div className="pt-8 pb-4 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h1 className="text-xl font-bold tracking-tight text-gray-800">时光胶囊</h1>
          <p className="text-xs text-rose-300/60 mt-1 tracking-wide font-[425]">写给未来的情书</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-4 flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { if (showForm) resetForm(); else { resetForm(); setShowForm(true) } }}
            className={`px-5 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
              showForm
                ? "bg-gray-100 text-gray-500"
                : "bg-gradient-to-r from-rose-400 to-amber-500 text-white shadow-md shadow-rose-200/30"
            }`}
          >
            {showForm ? "收起" : "💌 写情书"}
          </motion.button>
        </motion.div>
      </div>

      {/* Write Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-rose-50/80 to-amber-50/80 rounded-xl p-4 mb-4 border border-rose-200/30 shadow-sm">
              {editingCapsuleId && (
                <p className="text-xs text-amber-600 font-medium text-center mb-3">✏️ 正在编辑情书</p>
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="给这封情书取个名字..."
                  className="w-full rounded-lg bg-white/60 border border-rose-200/30 px-3.5 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-rose-300 focus:bg-white/80 transition-all duration-200"
                  maxLength={100}
                />

                {!editingCapsuleId && (
                  <div className="flex gap-2">
                    {users.filter((u) => u.id !== session?.user?.id).map((user) => (
                      <label
                        key={user.id}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          formToUser === user.id
                            ? "bg-rose-200/70 border border-rose-300/50 text-rose-700 font-medium shadow-sm"
                            : "bg-white/50 border border-rose-100/30 text-gray-500 hover:bg-rose-50"
                        }`}
                      >
                        <input type="radio" name="toUser" value={user.id} checked={formToUser === user.id}
                          onChange={(e) => setFormToUser(e.target.value)} className="sr-only" />
                        <span className="text-xs">💌 给 {user.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="写下你想对 TA 说的话..."
                  rows={5}
                  className="w-full resize-none rounded-lg bg-white/60 border border-rose-200/30 px-3.5 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-rose-300 focus:bg-white/80 transition-all duration-200"
                  maxLength={5000}
                />

                <div>
                  <label className="block text-[11px] text-amber-600/70 mb-1 ml-1 font-medium">📅 解锁时间</label>
                  <input
                    type="datetime-local"
                    value={formUnlockAt}
                    min={minUnlockStr}
                    onChange={(e) => setFormUnlockAt(e.target.value)}
                    className="w-full rounded-lg bg-white/60 border border-rose-200/30 px-3.5 py-2 text-sm text-gray-700 focus:outline-none focus:border-rose-300 focus:bg-white/80 transition-all duration-200"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!formTitle.trim() || !formContent.trim() || !formToUser || !formUnlockAt || sending}
                    className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      formTitle.trim() && formContent.trim() && formToUser && formUnlockAt && !sending
                        ? "bg-gradient-to-r from-rose-400 to-amber-500 text-white shadow-md shadow-rose-200/30"
                        : "bg-gray-100 text-gray-300"
                    }`}
                  >
                    {sending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {editingCapsuleId ? "保存中..." : "发送中..."}
                      </span>
                    ) : (
                      editingCapsuleId ? "💾 保存修改" : "💝 寄出"
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capsule List */}
      <div className="flex-1 overflow-y-auto pb-4 space-y-3 scrollbar-thin">
        {loading ? (
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-rose-100/30 animate-pulse" />
            ))}
          </div>
        ) : capsules.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 140, delay: 0.15 }}
              className="text-5xl mb-4 opacity-40"
            >
              💌
            </motion.div>
            <p className="text-gray-400 text-sm font-medium">还没有时光胶囊</p>
            <p className="text-gray-300 text-xs mt-1">写一封给未来的我们吧 💝</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {capsules.map((capsule) => {
              const isExpanded = expandedId === capsule.id
              return (
                <motion.div
                  key={capsule.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  layout
                  className={`relative group rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 ${
                    capsule.isLocked
                      ? "bg-gray-50/60 border-gray-200/40 hover:border-gray-300/50"
                      : "bg-gradient-to-br from-rose-50/80 to-amber-50/80 border-amber-200/30 hover:shadow-sm hover:shadow-amber-200/10"
                  }`}
                  onClick={() => handleExpand(capsule)}
                >
                  {/* Envelope seal (locked) or opened letter (unlocked) */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Icon: envelope or opened letter */}
                        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                          capsule.isLocked
                            ? "bg-gray-100 text-gray-400"
                            : "bg-amber-100/70 text-amber-500"
                        }`}>
                          {capsule.isLocked ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 3l-9 7-9-7m0 0v12a2 2 0 002 2h14a2 2 0 002-2V3m-4 6h-8m8 4H8" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className={`text-sm font-semibold truncate ${
                            capsule.isLocked ? "text-gray-500" : "text-gray-800"
                          }`}>
                            {capsule.title}
                          </h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {capsule.fromUserName} → {capsule.toUserName}
                          </p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {capsule.isLocked ? (
                          <span className="text-[10px] text-gray-400 bg-gray-100/60 px-2.5 py-1 rounded-full">未解锁</span>
                        ) : (
                          <span className="text-[10px] text-amber-600 bg-amber-100/70 px-2.5 py-1 rounded-full">
                            {capsule.isSender ? "已发送" : "已解锁"}
                          </span>
                        )}
                        {capsule.isSender && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleEdit(capsule)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-white/70 hover:bg-amber-100/80 text-amber-400 hover:text-amber-600 shadow-sm border border-amber-200/30 transition-all duration-200"
                              title="编辑">
                              <PencilLine className="w-3 h-3" strokeWidth={1.8} />
                            </button>
                            <button onClick={() => handleDelete(capsule)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-white/70 hover:bg-red-100/80 text-red-300 hover:text-red-500 shadow-sm border border-red-200/30 transition-all duration-200"
                              title="删除">
                              <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className={`text-[11px] mt-2 ${
                      capsule.isLocked ? "text-gray-400" : "text-amber-500/70"
                    }`}>
                      {capsule.isLocked
                        ? `🔒 ${format(new Date(capsule.unlockAt), "yyyy年M月d日 HH:mm", { locale: zhCN })} 解锁`
                        : `📬 ${format(new Date(capsule.unlockAt), "yyyy年M月d日", { locale: zhCN })} 已解锁`
                      }
                    </p>
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className={`px-4 pb-4 pt-2 border-t ${
                          capsule.isLocked ? "border-gray-200/30" : "border-amber-200/20"
                        }`}>
                          {loadingContent ? (
                            <div className="space-y-2 py-2">
                              <div className="h-2.5 bg-rose-100/60 animate-pulse rounded-full w-3/4" />
                              <div className="h-2.5 bg-rose-100/40 animate-pulse rounded-full w-1/2" />
                            </div>
                          ) : expandedContent !== null ? (
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                              {expandedContent}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">（内容加载中...）</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-20 left-4 right-4 max-w-lg mx-auto z-50 p-3 rounded-xl bg-red-50/90 backdrop-blur-sm border border-red-200/50 text-red-500 text-xs text-center shadow-lg"
          >
            {error}
            <button onClick={() => setError("")} className="ml-2 underline hover:no-underline">关闭</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}