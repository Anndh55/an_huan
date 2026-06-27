"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform, AnimatePresence } from "motion/react";

// ── Relationship start ────────────────────────────────────────
const START_DATE = new Date("2026-05-25T00:00:00+08:00");

// ── Inspirational quotes ──────────────────────────────────────
const QUOTES = [
  "每一天都是我们故事的新篇章",
  "和你在一起的时光，都是好时光",
  "世界很大，但我们的爱更大",
  "遇见你，是我最好的运气",
  "你的笑容，是我一天的动力",
  "想牵着你的手，走过春夏秋冬",
  "有你在身边，每天都是纪念日",
];

// ── Greeting helper ───────────────────────────────────────────
function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 6) return `夜深了，${name}，去给TA留个言吧`;
  if (h < 9) return `早安，${name}，今天也是想TA的一天`;
  if (h < 12) return `上午好，${name}，TA一定也在想你`;
  if (h < 14) return `中午好，${name}，记得吃午饭哦`;
  if (h < 18) return `下午好，${name}，今天有拍照片吗`;
  if (h < 21) return `傍晚好，${name}，给TA发个消息吧`;
  return `夜深了，${name}，明天也要继续爱TA`;
}

// ═════════════════════════════════════════════════════════════
//  Animated day counter with spring physics
// ═════════════════════════════════════════════════════════════
function AnimatedCounter({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 16 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (inView) mv.set(target);
  }, [inView, target, mv]);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplayed(v));
    return unsub;
  }, [rounded]);

  return <span ref={ref}>{displayed}</span>;
}

// ── Sparkle particles around the counter ──────────────────────
function CounterSparkles() {
  const [sparkles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * 360,
      radius: 60 + Math.random() * 40,
      size: 1.5 + Math.random() * 2,
    }))
  );

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {sparkles.map((s) => {
        const rad = (s.angle * Math.PI) / 180;
        return (
          <motion.div
            key={s.id}
            className="absolute left-1/2 top-1/2 rounded-full bg-rose-300/30"
            style={{ width: s.size, height: s.size, x: "-50%", y: "-50%" }}
            animate={{
              x: ["-50%", `calc(-50% + ${Math.cos(rad) * s.radius}px)`, "-50%"],
              y: ["-50%", `calc(-50% + ${Math.sin(rad) * s.radius}px)`, "-50%"],
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0],
            }}
            transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 4, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}

// ── Golden ring with slow rotation ────────────────────────────
function GlowRing() {
  return (
    <motion.div
      className="absolute -inset-12 bg-gradient-to-b from-rose-200/10 via-amber-100/5 to-transparent blur-3xl rounded-full pointer-events-none"
      aria-hidden
      animate={{ rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
    />
  );
}

// ═════════════════════════════════════════════════════════════
//  Reusable Bento Card with hover shimmer + scale
// ═════════════════════════════════════════════════════════════
function BentoCard({
  href,
  className = "",
  children,
  onClick,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const Tag = href ? motion.a : onClick ? motion.button : motion.div;
  const props = href ? { href } : onClick ? { onClick } : {};

  return (
    <Tag
      {...props}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(244,143,177,0.15)" }}
      whileTap={{ scale: 0.97 }}
      className={
        "group relative overflow-hidden rounded-2xl bg-white/40 backdrop-blur-md border border-white/30 shadow-sm transition-all duration-500 cursor-pointer " +
        className
      }
    >
      {children}
      {/* Hover shimmer sweep */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </Tag>
  );
}

// ═════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [days, setDays] = useState(0);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [quoteKey, setQuoteKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [latestPhoto, setLatestPhoto] = useState<string | null>(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);

  // ── Redirect if unauthenticated ────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ── Calculate days from START_DATE ─────────────────────────
  useEffect(() => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24));
    setDays(Math.max(0, diff));
  }, []);

  // ── Quote rotation ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIdx((p) => (p + 1) % QUOTES.length);
      setQuoteKey((k) => k + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // ── Fetch latest photo ─────────────────────────────────────
  useEffect(() => {
    async function loadPhoto() {
      try {
        const res = await fetch("/api/photos");
        if (!res.ok) return;
        const data = await res.json();
        if (data.photos?.length > 0) {
          setLatestPhoto(data.photos[0].imageUrl);
        }
      } catch {
        // silent fallback
      } finally {
        setPhotoLoaded(true);
      }
    }
    if (status === "authenticated") loadPhoto();
  }, [status]);

  // ── Close menu on outside click ────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const name = session?.user?.name || "宝贝";
  const greeting = getGreeting(name);
  const initial = name.charAt(0);
  const hasPhoto = latestPhoto && photoLoaded;

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
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28 relative">
      {/* ═══════ Top-right: Logout menu ═══════ */}
      <div className="absolute top-2 right-4 z-20" ref={menuRef}>
        <motion.button
          onClick={() => setMenuOpen(!menuOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.93 }}
          className="relative w-7 h-7 flex items-center justify-center rounded-full bg-white/30 backdrop-blur-sm border border-white/20 text-rose-300/60 hover:text-rose-400/80 transition-colors duration-300"
          aria-label="菜单"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </motion.button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-1.5 min-w-[120px] rounded-xl bg-white/70 backdrop-blur-2xl border border-white/30 shadow-lg overflow-hidden"
            >
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full px-4 py-2.5 text-xs text-rose-300/70 tracking-wider hover:text-rose-400 hover:bg-rose-50/30 transition-colors duration-200 text-left flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出登录
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════ Hero: Days Counter ═══════ */}
      <div className="text-center mb-8 relative z-10 pt-2">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-[10px] text-rose-300/50 tracking-[0.25em] font-[425] mb-3"
        >
          我们在一起
        </motion.p>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 80, damping: 16, delay: 0.05 }}
          className="relative inline-block"
        >
          <h1 className="text-[7rem] md:text-[8rem] font-extralight leading-[0.8] tracking-tighter select-none">
            <span className="bg-gradient-to-b from-rose-400 via-rose-300 to-amber-200/70 bg-clip-text text-transparent drop-shadow-sm">
              <AnimatedCounter target={days} />
            </span>
          </h1>
          <CounterSparkles />
          <GlowRing />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-rose-300/50 text-base tracking-wide mt-[-0.3rem]"
        >
          天
        </motion.p>

        <div className="h-5 mt-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={quoteKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="text-[11px] text-rose-300/45 italic tracking-wider font-[350]"
            >
              &ldquo;{QUOTES[quoteIdx]}&rdquo;
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* ═══════ Bento Grid ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
        {/* ── Photos (large, with image background) ── */}
        <BentoCard href="/photos" className="md:col-span-1 aspect-[4/3] md:aspect-[3/2] p-5 flex flex-col justify-end relative overflow-hidden">
          {/* Photo background */}
          {hasPhoto ? (
            <>
              <img
                src={latestPhoto!}
                alt=""
                className="absolute inset-0 w-full h-full object-cover rounded-2xl"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(145deg, rgba(245,168,160,0.18) 0%, rgba(212,165,116,0.12) 40%, rgba(245,168,160,0.1) 100%)",
              }}
            />
          )}
          {/* Subtle dot pattern (only when no photo) */}
          {!hasPhoto && (
            <div
              className="absolute inset-0 rounded-2xl opacity-[0.04]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, #d4a574 1px, transparent 0)`,
                backgroundSize: "20px 20px",
              }}
            />
          )}
          {/* Content */}
          <div className="relative z-10">
            <motion.div
              className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-3"
              whileHover={{ rotate: -5, scale: 1.05 }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </motion.div>
            <p className="text-sm font-[425] text-white tracking-wide drop-shadow-sm">最新照片</p>
            <p className="text-[11px] text-white/70 mt-0.5 tracking-wider drop-shadow-sm">记录我们的美好瞬间</p>
          </div>
        </BentoCard>

        {/* ── Welcome / Greeting ── */}
        <BentoCard className="md:col-span-1 p-5 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 14 }}
                className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-300 to-rose-500 flex items-center justify-center text-white text-sm font-medium shadow-md"
              >
                {initial}
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-[2px] border-white rounded-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-[13px] font-medium text-gray-700 tracking-wide truncate"
              >
                {name}
              </motion.p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={greeting}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="text-[11px] text-rose-300/60 mt-0.5 tracking-wider truncate"
                >
                  {greeting}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </BentoCard>

        {/* ── Messages ── */}
        <BentoCard href="/messages" className="md:col-span-1 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <motion.div
              className="w-9 h-9 rounded-xl bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center"
              whileHover={{ rotate: -8 }}
            >
              <svg className="w-4.5 h-4.5 text-rose-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </motion.div>
            <div>
              <p className="text-sm font-[425] text-gray-600 tracking-wide">留言板</p>
              <p className="text-[10px] text-rose-300/50 tracking-wider">写下想对 TA 说的话</p>
            </div>
          </div>
          <motion.div
            className="relative bg-white/40 backdrop-blur-sm border border-white/20 rounded-2xl rounded-tl-sm px-4 py-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[11px] text-gray-500/70 leading-relaxed italic tracking-wider">
              &ldquo;今天天气很好，想和你一起散步&rdquo;
            </p>
            <div className="absolute -left-1 top-3 w-2 h-2 bg-white/40 border-l border-b border-white/20 -rotate-45" />
          </motion.div>
        </BentoCard>

        {/* ── Anniversaries ── */}
        <BentoCard href="/anniversaries" className="p-5 flex flex-col items-start justify-center">
          <motion.div
            className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-2.5"
            whileHover={{ rotate: 5 }}
          >
            <svg className="w-5 h-5 text-rose-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-1.5.454M19 6v2a3 3 0 01-3 3H5a3 3 0 01-3-3V6a3 3 0 013-3h11a3 3 0 013 3zM7 12h.01M17 12h.01m-6 0h.01" />
            </svg>
          </motion.div>
          <p className="text-sm font-[425] text-gray-600 tracking-wide">纪念日</p>
          <p className="text-[10px] text-rose-300/50 mt-0.5 tracking-wider">记录特别的日子</p>
        </BentoCard>

        {/* ── Time Capsule / Letters (col-span-2 to balance grid) ── */}
        <BentoCard href="/time-capsule" className="md:col-span-2 p-5 flex flex-row items-center gap-4">
          <motion.div
            className="w-11 h-11 rounded-xl bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0"
            whileHover={{ rotate: -5 }}
          >
            <svg className="w-5.5 h-5.5 text-rose-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </motion.div>
          <div>
            <p className="text-sm font-[425] text-gray-600 tracking-wide">情书</p>
            <p className="text-[10px] text-rose-300/50 mt-0.5 tracking-wider">写给未来的我们</p>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
