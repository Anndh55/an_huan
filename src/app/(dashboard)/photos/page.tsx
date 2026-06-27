"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Trash2 } from "lucide-react"

interface Photo {
  id: string
  userId: string
  imageUrl: string
  caption: string | null
  createdAt: string
  userName: string
}

export default function PhotosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [pendingCaption, setPendingCaption] = useState("")

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/photos")
      if (!res.ok) throw new Error("获取失败")
      const data = await res.json()
      setPhotos(data.photos)
    } catch {
      setError("加载照片失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") fetchPhotos()
  }, [status, fetchPhotos])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setPendingFile(file)
    setPendingPreview(previewUrl)
    setPendingCaption("")
  }

  const handleUploadConfirm = async () => {
    if (!pendingFile) return
    setUploading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", pendingFile)
      if (pendingCaption.trim()) formData.append("caption", pendingCaption.trim())
      const res = await fetch("/api/photos", { method: "POST", body: formData })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "上传失败")
      }
      setPendingFile(null)
      if (pendingPreview) URL.revokeObjectURL(pendingPreview)
      setPendingPreview(null)
      setPendingCaption("")
      await fetchPhotos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleUploadCancel = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setPendingCaption("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDelete = async (photo: Photo) => {
    if (!confirm("确定要删除这张照片吗？")) return
    try {
      const res = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "删除失败")
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      setLightboxPhoto(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败")
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-rose-300 text-sm tracking-wide"
        >
          加载中...
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-6"
      >
        <h1 className="text-xl font-bold tracking-tight text-gray-800">照片墙</h1>
        <p className="text-xs text-rose-300/60 mt-1 tracking-wide">记录我们的美好瞬间</p>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200/50 text-red-500 text-xs text-center"
          >
            {error}
            <button onClick={() => setError("")} className="ml-2 underline">关闭</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-rose-100/30 rounded-xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 140, delay: 0.15 }}
            className="text-5xl mb-4 opacity-40"
          >
            🖼️
          </motion.div>
          <p className="text-gray-400 text-sm font-medium">还没有照片</p>
          <p className="text-gray-300 text-xs mt-1 mb-6">上传第一张吧</p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-400 to-rose-500 text-white rounded-full text-xs font-medium shadow-md hover:shadow-lg transition-shadow disabled:opacity-60"
          >
            {uploading ? "上传中..." : "上传第一张照片"}
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-rose-100/40 hover:shadow-md hover:border-rose-200/60 transition-all duration-300 cursor-pointer group"
              onClick={() => setLightboxPhoto(photo)}
            >
              <div className="aspect-square overflow-hidden bg-rose-50/50">
                <img
                  src={photo.imageUrl}
                  alt={photo.caption || "照片"}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                {photo.caption && (
                  <p className="text-xs text-gray-600 line-clamp-1 mb-1.5">{photo.caption}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-300/50" />
                    {photo.userName}
                  </span>
                  <span>{format(new Date(photo.createdAt), "MM/dd HH:mm", { locale: zhCN })}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* FAB */}
      {photos.length > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.4 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-rose-400 to-rose-500 text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow z-40"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </motion.button>
      )}

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />

      {/* Upload Dialog */}
      <AnimatePresence>
        {pendingPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleUploadCancel}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="relative w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-[4/3] bg-rose-50/50 flex items-center justify-center overflow-hidden">
                <img src={pendingPreview} alt="预览" className="w-full h-full object-contain" />
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-rose-400/70 mb-1.5">添加描述（可选）</label>
                  <input
                    type="text"
                    value={pendingCaption}
                    onChange={(e) => setPendingCaption(e.target.value)}
                    placeholder="给这张照片写句话吧..."
                    className="w-full rounded-xl bg-rose-50/60 border border-rose-200/30 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-rose-300 focus:bg-white/80 transition-all"
                    onKeyDown={(e) => { if (e.key === "Enter" && !uploading) handleUploadConfirm() }}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleUploadCancel} disabled={uploading}
                    className="flex-1 py-2.5 rounded-xl border border-rose-200/50 text-gray-500 text-sm hover:bg-rose-50/50 transition-all">
                    取消
                  </button>
                  <button onClick={handleUploadConfirm} disabled={uploading}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-400 to-rose-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        上传中...
                      </span>
                    ) : "上传"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            onClick={() => setLightboxPhoto(null)}
          >
            {/* 半透明毛玻璃遮罩 — 隐约透出下方照片墙 */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="relative flex flex-col sm:flex-row max-w-4xl w-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-white/10 group"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 关闭按钮 */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-3 right-3 z-20 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>

              {/* 左侧：照片 */}
              <div className="flex-1 min-w-0 bg-black/5 flex items-center justify-center">
                <img
                  src={lightboxPhoto.imageUrl}
                  alt={lightboxPhoto.caption || "照片"}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* 右侧：毛玻璃信息面板 */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full sm:w-72 lg:w-80 bg-slate-50/90 backdrop-blur-md flex flex-col relative overflow-hidden"
              >
                {/* 巨型艺术引言符号 */}
                <div
                  className="absolute -top-6 -left-3 text-[120px] leading-none text-rose-200/20 font-serif select-none pointer-events-none"
                  aria-hidden="true"
                >
                  &ldquo;
                </div>

                {/* 面板内容 */}
                <div className="flex-1 flex flex-col p-6">
                  {/* 发布者信息 — 圆形单字头像 + 分级排版 */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.35 }}
                    className="flex items-center gap-3 mb-5"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-200 to-rose-300 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-xs font-medium text-white/90">
                        {lightboxPhoto.userName?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700 leading-tight">
                        {lightboxPhoto.userName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-light mt-0.5">
                        记录于 {format(new Date(lightboxPhoto.createdAt), "yyyy/MM/dd", { locale: zhCN })}
                      </p>
                    </div>
                  </motion.div>

                  {/* 留言描述文字 — 杂志留白排版 */}
                  {lightboxPhoto.caption && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="flex-1"
                    >
                      <p className="text-sm text-slate-600 leading-relaxed tracking-wider font-light whitespace-pre-wrap">
                        {lightboxPhoto.caption}
                      </p>
                    </motion.div>
                  )}

                  {/* 无描述时的弹性占位 */}
                  {!lightboxPhoto.caption && <div className="flex-1" />}

                  {/* 删除按钮 — 低调线性图标，Hover 卡片时才淡入 */}
                  {lightboxPhoto.userId === session?.user?.id && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 self-end">
                      <button
                        onClick={() => handleDelete(lightboxPhoto)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-200/50 hover:bg-red-100/80 text-slate-400 hover:text-red-400 transition-all duration-200"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
