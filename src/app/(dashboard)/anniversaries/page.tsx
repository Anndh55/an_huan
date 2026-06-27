"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useRef } from "react"
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useTransform,
  LayoutGroup,
} from "motion/react"
import { format, differenceInDays } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  Heart,
  Sparkles,
  Pencil,
  Trash2,
  Plus,
  Cake,
  CalendarDays,
  Moon,
  Sun,
} from "lucide-react"
import { getNextLunarSolar, getNextSolarOccurrence, formatLunarDate } from "@/lib/lunar"

interface Anniversary {
  id: string
  userId: string
  title: string
  date: string
  type: "TOGETHER" | "CUSTOM" | "BIRTHDAY"
  isLunar: number
  lunarMonth: number | null
  lunarDay: number | null
  repeated: number
  createdAt: string
  userName: string
}

interface DayInfo {
  text: string
  isFuture: boolean
  days: number
}

function getDayInfo(dateStr: string): DayInfo {
  const date = new Date(dateStr)
  const today = new Date()
  const diff = Math.trunc((date.getTime() - today.getTime()) / 86400000)
  if (diff > 0) return { text: `距离下次还有 ${diff} 天`, isFuture: true, days: diff }
  if (diff < 0) return { text: `已过 ${Math.abs(diff)} 天`, isFuture: false, days: Math.abs(diff) }
  return { text: "就是今天！", isFuture: false, days: 0 }
}

function getBirthdayDayInfo(a: Anniversary): { text: string; days: number; isFuture: boolean; nextDate: Date } {
  const solarDate = getNextSolarOccurrence(a.date)
  const solarDays = Math.trunc((solarDate.getTime() - new Date().getTime()) / 86400000)
  const nextDate = solarDate

  if (a.isLunar && a.lunarMonth && a.lunarDay) {
    const lunarDate = getNextLunarSolar(a.lunarMonth, a.lunarDay)
    const lunarDays = Math.trunc((lunarDate.getTime() - new Date().getTime()) / 86400000)
    return {
      text: lunarDays >= 0 ? `还有 ${lunarDays} 天` : `已过 ${Math.abs(lunarDays)} 天`,
      days: Math.abs(lunarDays),
      isFuture: lunarDays > 0,
      nextDate: lunarDate,
    }
  }

  return {
    text: solarDays > 0 ? `还有 ${solarDays} 天` : solarDays === 0 ? "就是今天！" : `已过 ${Math.abs(solarDays)} 天`,
    days: Math.abs(solarDays),
    isFuture: solarDays > 0,
    nextDate,
  }
}

function AnimatedCounter({ target }: { target: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 1.8,
      ease: [0.25, 0.1, 0.25, 1],
    })
    return controls.stop
  }, [target, count])

  useEffect(() => {
    return rounded.on("change", setDisplayed)
  }, [rounded])

  return <>{displayed}</>
}

/* ── Carousel Card ── */
function UrgentCard({
  title,
  days,
  isFuture,
  icon,
  index,
}: {
  title: string
  days: number
  isFuture: boolean
  icon: React.ReactNode
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="shrink-0 w-[180px] aspect-[2/1] bg-white/30 backdrop-blur-xl border border-white/20 shadow-sm rounded-2xl p-4 flex flex-col justify-between select-none"
    >
      <div className="flex items-center gap-1.5 text-[10px] text-rose-400/70 font-medium tracking-wide">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-amber-400 bg-clip-text text-transparent drop-shadow-sm leading-none">
          <AnimatedCounter target={days} />
        </span>
        <span className="text-[10px] text-rose-400/60 font-medium">
          {isFuture ? "天后" : "天前"}
        </span>
      </div>
    </motion.div>
  )
}

/* ── Tab Switcher ── */
type TabKey = "upcoming" | "past"

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const tabs: { key: TabKey; label: string; sub: string }[] = [
    { key: "upcoming", label: "期待", sub: "倒计时" },
    { key: "past", label: "镌刻", sub: "岁时记" },
  ]

  return (
    <div className="relative flex bg-white/40 backdrop-blur-sm rounded-xl p-1 border border-white/20 shadow-sm">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="relative z-10 flex-1 py-2 text-sm font-medium transition-colors"
        >
          <span className={active === t.key ? "text-rose-600" : "text-gray-400 hover:text-gray-600"}>
            {t.label}
            <span className="ml-1 text-[10px] opacity-70">{t.sub}</span>
          </span>
          {active === t.key && (
            <motion.div
              layoutId="tab-highlight"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 -z-10 rounded-[10px] bg-white/80 shadow-sm border border-white/30"
            />
          )}
        </button>
      ))}
    </div>
  )
}

/* ── Date Line ── */
function DateLine({ dateStr, a }: { dateStr: string; a: Anniversary }) {
  const d = new Date(dateStr)
  const solar = format(d, "yyyy.MM.dd")

  if (a.type === "BIRTHDAY" && a.isLunar && a.lunarMonth && a.lunarDay) {
    const lunar = formatLunarDate(a.lunarMonth, a.lunarDay)
    return (
      <p className="text-xs text-gray-500 tracking-wide">
        <span className="font-semibold text-gray-600">{solar}</span>
        <span className="text-pink-400/70 text-[10px] ml-1.5">(农历 {lunar})</span>
      </p>
    )
  }

  return (
    <p className="text-xs text-gray-500 tracking-wide">
      <span className="font-semibold text-gray-600">{solar}</span>
      {a.type === "TOGETHER" && (
        <span className="text-rose-400/60 text-[10px] ml-1.5">· 在一起的日子</span>
      )}
    </p>
  )
}

/* ── Card ── */
function AnniversaryCard({
  a,
  dayInfo,
  isFuture,
  onEdit,
  onDelete,
}: {
  a: Anniversary
  dayInfo: DayInfo
  isFuture: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <motion.div
      layout
      className="group relative bg-white/50 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {a.type === "BIRTHDAY" ? (
            <Cake className="w-4 h-4 text-rose-300 shrink-0" />
          ) : a.type === "TOGETHER" ? (
            <Heart className="w-4 h-4 text-rose-300 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          )}
          <h4 className="text-sm font-semibold text-gray-700 truncate leading-snug">{a.title}</h4>
        </div>
        <span
          className={`shrink-0 rounded-full text-xs font-medium px-2.5 py-1 ${
            isFuture ? "bg-amber-50 text-amber-600" : "bg-pink-50 text-pink-600"
          }`}
        >
          {dayInfo.text}
        </span>
      </div>

      <DateLine dateStr={a.date} a={a} />

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-full bg-white/70 backdrop-blur-sm border border-white/30 flex items-center justify-center text-rose-400 hover:text-rose-500 hover:bg-white/90 transition-all shadow-sm"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-full bg-white/70 backdrop-blur-sm border border-white/30 flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-white/90 transition-all shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

/* ── Empty State ── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.3 }}
      >
        <Heart className="w-10 h-10 text-rose-200 fill-rose-200/30" />
      </motion.div>
      <p className="text-gray-400 text-sm font-medium mt-4">还没有纪念日</p>
      <p className="text-gray-300 text-xs mt-1 mb-5">添加属于你们的特别日子吧</p>
      <button
        onClick={onAdd}
        className="px-5 py-2 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-full text-xs font-medium shadow-md shadow-rose-200/30 hover:shadow-lg hover:shadow-rose-300/30 transition-shadow"
      >
        添加纪念日
      </button>
    </motion.div>
  )
}

/* ── Loading ── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3 overflow-hidden">
        {[1, 2].map((i) => (
          <div key={i} className="shrink-0 w-[180px] aspect-[2/1] rounded-2xl bg-white/30 backdrop-blur-xl border border-white/20 p-4">
            <div className="h-2.5 w-16 bg-rose-200/40 rounded-full animate-pulse mb-3" />
            <div className="h-8 w-20 bg-rose-200/30 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-10 rounded-xl bg-white/30 animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-white/40 p-5 border border-white/20">
          <div className="flex justify-between mb-2">
            <div className="h-3 w-24 bg-rose-200/40 rounded-full animate-pulse" />
            <div className="h-5 w-16 bg-rose-200/30 rounded-full animate-pulse" />
          </div>
          <div className="h-2.5 w-36 bg-rose-200/25 rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  )
}

const LUNAR_MONTH_NAMES = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"]
const LUNAR_DAY_NAMES = [
  "初一","初二","初三","初四","初五","初六","初七","初八","初九","初十",
  "十一","十二","十三","十四","十五","十六","十七","十八","十九","二十",
  "廿一","廿二","廿三","廿四","廿五","廿六","廿七","廿八","廿九","三十",
]

export default function AnniversariesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming")

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAnniversary, setEditingAnniversary] = useState<Anniversary | null>(null)
  const [formTitle, setFormTitle] = useState("")
  const [formDate, setFormDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [formType, setFormType] = useState<"CUSTOM" | "BIRTHDAY">("CUSTOM")
  const [calendarMode, setCalendarMode] = useState<"solar" | "lunar">("solar")
  const [formLunarMonth, setFormLunarMonth] = useState("")
  const [formLunarDay, setFormLunarDay] = useState("")

  const fetchAnniversaries = useCallback(async () => {
    try {
      const res = await fetch("/api/anniversaries", { cache: "no-store" })
      if (!res.ok) throw new Error("获取失败")
      const data = await res.json()
      setAnniversaries(data.anniversaries)
    } catch {
      setError("加载纪念日失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") fetchAnniversaries()
  }, [status, fetchAnniversaries])

  /* ── Derived Data ── */
  const allWithInfo = anniversaries.map((a) => {
    let info: DayInfo
    if (a.type === "BIRTHDAY") {
      const bd = getBirthdayDayInfo(a)
      info = { text: bd.text, isFuture: bd.isFuture, days: bd.days }
    } else {
      info = getDayInfo(a.date)
    }
    return { item: a, info }
  })

  const urgentItems = allWithInfo
    .filter((x) => x.info.isFuture)
    .sort((a, b) => a.info.days - b.info.days)
    .slice(0, 3)

  const upcomingItems = allWithInfo.filter((x) => x.info.isFuture)
  const pastItems = allWithInfo.filter((x) => !x.info.isFuture)
  const displayedItems = activeTab === "upcoming" ? upcomingItems : pastItems

  /* ── Modal Actions ── */
  const openAddModal = (type?: "CUSTOM" | "BIRTHDAY") => {
    setFormTitle("")
    setFormDate("")
    setFormType(type || "CUSTOM")
    setCalendarMode("solar")
    setFormLunarMonth("")
    setFormLunarDay("")
    setEditingAnniversary(null)
    setShowAddModal(true)
  }

  const openEditModal = (a: Anniversary) => {
    setEditingAnniversary(a)
    setFormTitle(a.title)
    setFormDate(a.date.split("T")[0])
    setFormType(a.type === "BIRTHDAY" ? "BIRTHDAY" : "CUSTOM")
    setCalendarMode(a.isLunar ? "lunar" : "solar")
    setFormLunarMonth(a.lunarMonth ? String(a.lunarMonth) : "")
    setFormLunarDay(a.lunarDay ? String(a.lunarDay) : "")
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formDate) return
    if (calendarMode === "lunar" && (!formLunarMonth || !formLunarDay)) return
    setSaving(true)
    setError("")

    const body: Record<string, unknown> = {
      title: formTitle.trim(),
      date: formDate,
      type: formType,
    }
    if (calendarMode === "lunar") {
      body.isLunar = 1
      body.lunarMonth = Number(formLunarMonth)
      body.lunarDay = Number(formLunarDay)
    } else {
      body.isLunar = 0
    }

    try {
      if (editingAnniversary) {
        const res = await fetch(`/api/anniversaries/${editingAnniversary.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "更新失败")
        }
      } else {
        const res = await fetch("/api/anniversaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "创建失败")
        }
      }

      setShowAddModal(false)
      setEditingAnniversary(null)
      await fetchAnniversaries()
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (a: Anniversary) => {
    if (!confirm(`确定要删除「${a.title}」吗？`)) return
    try {
      const res = await fetch(`/api/anniversaries/${a.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "删除失败")
      }
      setAnniversaries((prev) => prev.filter((item) => item.id !== a.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败")
    }
  }

  /* ── Loading Screen ── */
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-4">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-5"
      >
        <h1 className="text-xl font-bold tracking-tight text-gray-800">岁时记</h1>
        <p className="text-xs text-rose-300/60 mt-1 tracking-wide font-[425]">记录我们每一个特别的日子</p>
      </motion.div>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-3 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-500 text-xs text-center"
          >
            {error}
            <button onClick={() => setError("")} className="ml-2 underline hover:no-underline">关闭</button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* ════════════════════════════════════════
              CAROUSEL — 灵动岁时看板
          ════════════════════════════════════════ */}
          {urgentItems.length > 0 && (
            <div className="mb-6">
              <div
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory -mx-1 px-1"
                style={{ scrollbarWidth: "thin" }}
              >
                {urgentItems.map((x, i) => {
                  const isBirthday = x.item.type === "BIRTHDAY"
                  return (
                    <div key={x.item.id} className="snap-start">
                      <UrgentCard
                        title={x.item.title}
                        days={x.info.days}
                        isFuture={x.info.isFuture}
                        index={i}
                        icon={isBirthday ? <Cake className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              TAB BAR — 期待 · 镌刻
          ════════════════════════════════════════ */}
          <TabBar active={activeTab} onChange={setActiveTab} />

          {/* ════════════════════════════════════════
              CARD LIST — Stagger with AnimatePresence
          ════════════════════════════════════════ */}
          <div className="mt-4">
            {displayedItems.length === 0 ? (
              <EmptyState onAdd={() => openAddModal()} />
            ) : (
              <LayoutGroup>
                <motion.div
                  key={activeTab}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
                    exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
                  }}
                  className="space-y-3"
                >
                  <AnimatePresence mode="popLayout">
                    {displayedItems.map(({ item: a, info }) => (
                      <motion.div
                        key={a.id}
                        layout
                        variants={{
                          hidden: { opacity: 0, y: 24 },
                          visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
                          exit: { opacity: 0, y: -16, scale: 0.96, transition: { duration: 0.25 } },
                        }}
                      >
                        <AnniversaryCard
                          a={a}
                          dayInfo={info}
                          isFuture={info.isFuture}
                          onEdit={() => openEditModal(a)}
                          onDelete={() => handleDelete(a)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            )}
          </div>
        </>
      )}

      {/* ── FAB ── */}
      {!loading && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.5 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => openAddModal()}
          className="fixed bottom-24 right-6 w-12 h-12 bg-gradient-to-br from-rose-400 to-pink-500 text-white rounded-full shadow-lg shadow-rose-300/30 flex items-center justify-center transition-shadow hover:shadow-xl hover:shadow-rose-300/40 active:shadow-md z-40"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* ════════════════════════════════════════
          MODAL — 添加 / 编辑
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/25 flex items-end sm:items-center justify-center backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:hidden w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

              {/* ── Modal Header ── */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-gray-700 tracking-wide">
                  {editingAnniversary ? "编辑纪念日" : "添加纪念日"}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-7 h-7 bg-rose-50 rounded-full flex items-center justify-center hover:bg-rose-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* ── Solar / Lunar Segmented Control ── */}
              <div className="relative flex bg-rose-50/60 rounded-lg p-0.5 border border-rose-200/30 mb-4">
                {(["solar", "lunar"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCalendarMode(mode)}
                    className="relative z-10 flex-1 py-2 text-xs font-medium transition-colors"
                  >
                    <span className={calendarMode === mode ? "text-rose-700" : "text-gray-400"}>
                      {mode === "solar" ? (
                        <><Sun className="w-3 h-3 inline mr-1 -mt-0.5" />公历（阳历）</>
                      ) : (
                        <><Moon className="w-3 h-3 inline mr-1 -mt-0.5" />农历（阴历）</>
                      )}
                    </span>
                    {calendarMode === mode && (
                      <motion.div
                        layoutId="calendar-seg"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute inset-0 -z-10 rounded-[7px] bg-white shadow-sm border border-white/30"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* ── Form Fields ── */}
              <motion.div layout className="space-y-4">
                <div>
                  <label className="block text-[11px] text-gray-500 font-medium mb-1 tracking-wide">纪念日名称</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="例如：第一次约会"
                    className="w-full rounded-lg bg-rose-50/60 border border-rose-200/30 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-rose-300 focus:bg-rose-50/80 transition-all duration-200"
                    autoFocus
                  />
                </div>

                <AnimatePresence mode="wait">
                  {calendarMode === "solar" ? (
                    <motion.div
                      key="solar"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label className="block text-[11px] text-gray-500 font-medium mb-1 tracking-wide">日期</label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full rounded-lg bg-rose-50/60 border border-rose-200/30 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-rose-300 focus:bg-rose-50/80 transition-all duration-200"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="lunar"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <label className="block text-[11px] text-gray-500 font-medium mb-1 tracking-wide">农历日期</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <select
                            value={formLunarMonth}
                            onChange={(e) => {
                              setFormLunarMonth(e.target.value)
                              if (e.target.value && formLunarDay) {
                                try {
                                  const next = getNextLunarSolar(Number(e.target.value), Number(formLunarDay))
                                  setFormDate(format(next, "yyyy-MM-dd"))
                                } catch { /* ignore */ }
                              }
                            }}
                            className="w-full rounded-lg bg-white/60 border border-rose-200/30 px-3 py-2.5 text-xs text-gray-700 focus:outline-none focus:border-rose-300 transition-all appearance-none"
                          >
                            <option value="">月份</option>
                            {LUNAR_MONTH_NAMES.map((name, i) => (
                              <option key={i + 1} value={i + 1}>{name}月</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <select
                            value={formLunarDay}
                            onChange={(e) => {
                              setFormLunarDay(e.target.value)
                              if (formLunarMonth && e.target.value) {
                                try {
                                  const next = getNextLunarSolar(Number(formLunarMonth), Number(e.target.value))
                                  setFormDate(format(next, "yyyy-MM-dd"))
                                } catch { /* ignore */ }
                              }
                            }}
                            className="w-full rounded-lg bg-white/60 border border-rose-200/30 px-3 py-2.5 text-xs text-gray-700 focus:outline-none focus:border-rose-300 transition-all appearance-none"
                          >
                            <option value="">日期</option>
                            {LUNAR_DAY_NAMES.map((name, i) => (
                              <option key={i + 1} value={i + 1}>{name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {formDate && (
                        <p className="text-[10px] text-rose-400/60 text-center">
                          对应公历：{format(new Date(formDate), "yyyy年M月d日", { locale: zhCN })}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* ── Actions ── */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-rose-200/50 text-gray-500 text-sm font-medium hover:bg-rose-50/50 transition-all duration-200"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formTitle.trim() || !formDate || saving || (calendarMode === "lunar" && (!formLunarMonth || !formLunarDay))}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-rose-400 to-pink-500 text-white text-sm font-medium shadow-md shadow-rose-200/30 hover:shadow-lg hover:shadow-rose-300/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      保存中...
                    </span>
                  ) : editingAnniversary ? "保存修改" : "添加"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

