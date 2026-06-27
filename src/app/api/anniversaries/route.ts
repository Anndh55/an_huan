 import { auth } from "@/lib/auth"
 import { createAnniversary, getAnniversaries } from "@/lib/db"
 import { NextResponse } from "next/server"
 
 export async function GET() {
   try {
     const session = await auth()
     if (!session?.user?.id) {
       return NextResponse.json({ error: "未登录" }, { status: 401 })
     }
 
     const anniversaries = await getAnniversaries()
     return NextResponse.json({ anniversaries })
   } catch (error) {
     console.error("Failed to fetch anniversaries:", error)
     return NextResponse.json({ error: "获取纪念日失败" }, { status: 500 })
   }
 }
 
 export async function POST(request: Request) {
   try {
     const session = await auth()
     if (!session?.user?.id) {
       return NextResponse.json({ error: "未登录" }, { status: 401 })
     }
 
     const body = await request.json()
     const { title, date, type, isLunar, lunarMonth, lunarDay, repeated } = body
 
     if (!title || typeof title !== "string" || title.trim().length === 0) {
       return NextResponse.json({ error: "标题不能为空" }, { status: 400 })
     }
 
     if (!date || typeof date !== "string") {
       return NextResponse.json({ error: "日期不能为空" }, { status: 400 })
     }
 
     if (!["TOGETHER", "CUSTOM", "BIRTHDAY"].includes(type)) {
       return NextResponse.json({ error: "无效的类型" }, { status: 400 })
     }
 
     // Only allow creating TOGETHER type if one doesn't already exist
     if (type === "TOGETHER") {
       const existing = await getAnniversaries()
       if (existing.some((a) => a.type === "TOGETHER")) {
         return NextResponse.json({ error: "在一起纪念日已存在" }, { status: 400 })
       }
     }
 
     const anniversary = await createAnniversary(
       session.user.id,
       title.trim(),
       date,
       type
     )
     return NextResponse.json({ anniversary }, { status: 201 })
   } catch (error) {
     console.error("Failed to create anniversary:", error)
     return NextResponse.json({ error: "创建纪念日失败" }, { status: 500 })
   }
 }
