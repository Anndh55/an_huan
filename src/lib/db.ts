﻿import { createClient } from "@libsql/client"

let client: ReturnType<typeof createClient> | null = null

export function getDb() {
  if (!client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is not set")
    client = createClient({ url })
  }
  return client
}

export interface UserRow {
  id: string
  phone: string
  password: string
  name: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export async function findUserByPhone(phone: string): Promise<UserRow | null> {
  const db = getDb()
  const { rows } = await db.execute({
    sql: 'SELECT * FROM "User" WHERE phone = ?',
    args: [phone],
  })
  if (rows.length === 0) return null
  return rows[0] as unknown as UserRow
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const db = getDb()
  const { rows } = await db.execute({
    sql: 'SELECT * FROM "User" WHERE id = ?',
    args: [id],
  })
  if (rows.length === 0) return null
 return rows[0] as unknown as UserRow
}

export interface MessageRow {
  id: string
  userId: string
  content: string
  type: string
| null
  lunarDay: number | null
  repeated: number
  createdAt: string
  userName: string
}

export async function createMessage(
  userId: string,
  content: string,
  type: string
): Promise<MessageRow> {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.execute({
    sql: 'INSERT INTO "Message" (id, userId, content, type, createdAt) VALUES (?, ?, ?, ?, ?)',
    args: [id, userId, content, type, now],
  })
  const { rows } = await db.execute({
    sql: 'SELECT m.*, u.name as userName FROM "Message" m JOIN "User" u ON u.id = m.userId WHERE m.id = ?',
    args: [id],
  })
  return rows[0] as unknown as MessageRow
}

export async function getVisibleMessages(currentUserId: string): Promise<MessageRow[]> {
  const db = getDb()
  const { rows } = await db.execute({
    sql: 'SELECT m.*, u.name as userName FROM "Message" m JOIN "User" u ON u.id = m.userId WHERE m.type = ? OR (m.type = ? AND m.userId = ?) ORDER BY m.createdAt DESC',
    args: ["MESSAGE", "DIARY", currentUserId],
  })
  return rows as unknown as MessageRow[]
}

export async function deleteMessage(id: string, userId: string): Promise<boolean> {
  const db = getDb()
  const { rows } = await db.execute({
    sql: 'SELECT id FROM "Message" WHERE id = ? AND userId = ?',
    args: [id, userId],
  })
  if (rows.length === 0) return false
  await db.execute({
    sql: 'DELETE FROM "Message" WHERE id = ?',
    args: [id],
  })
  return true
}

export interface PhotoRow {
  id: string
  userId: string
  imageUrl: string
  caption: string | null
  createdAt: string
  userName: string
}

export async function createPhoto(
  userId: string,
  imageUrl: string,
  caption?: string
): Promise<PhotoRow> {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.execute({
    sql: 'INSERT INTO "Photo" (id, userId, imageUrl, caption, createdAt) VALUES (?, ?, ?, ?, ?)',
    args: [id, userId, imageUrl, caption || null, now],
  })
  const { rows } = await db.execute({
    sql: 'SELECT p.*, u.name as userName FROM "Photo" p JOIN "User" u ON u.id = p.userId WHERE p.id = ?',
    args: [id],
  })
  return rows[0] as unknown as PhotoRow
}

export async function getPhotos(): Promise<PhotoRow[]> {
  const db = getDb()
  const { rows } = await db.execute({
    sql: 'SELECT p.*, u.name as userName FROM "Photo" p JOIN "User" u ON u.id = p.userId ORDER BY p.createdAt DESC',
    args: [],
  })
  return rows as unknown as PhotoRow[]
}

export async function deletePhoto(id: string): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM "Photo" WHERE id = ?',
    args: [id],
  })
}

export async function getPhotoById(id: string): Promise<PhotoRow | null> {
  const db = getDb()
  const { rows } = await db.execute({
    sql: 'SELECT p.*, u.name as userName FROM "Photo" p JOIN "User" u ON u.id = p.userId WHERE p.id = ?',
    args: [id],
  })
  if (rows.length === 0) return null
  return rows[0] as unknown as PhotoRow
}
 export interface AnniversaryRow {
   id: string
   userId: string
   title: string
   date: string
   type: "TOGETHER" | "CUSTOM" | "BIRTHDAY"
   createdAt: string
   userName: string
 }
 
 export async function getAnniversaries(): Promise<AnniversaryRow[]> {
   const db = getDb()
   const { rows } = await db.execute({
     sql: 'SELECT a.*, u.name as userName FROM "Anniversary" a JOIN "User" u ON u.id = a.userId ORDER BY a.date ASC',
     args: [],
   })
   return rows as unknown as AnniversaryRow[]
 }
 
 export async function createAnniversary(
   userId: string,
   title: string,
   date: string,
   type: "TOGETHER" | "CUSTOM" | "BIRTHDAY",
  isLunar?: boolean,
  lunarMonth?: number | null,
  lunarDay?: number | null,
  repeated?: boolean
): Promise<AnniversaryRow> {
   const db = getDb()
   const id = crypto.randomUUID()
   const now = new Date().toISOString()
   await db.execute({
     sql: 'INSERT INTO "Anniversary" (id, userId, title, date, type, isLunar, lunarMonth, lunarDay, repeated, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
     args: [id, userId, title, date, type, isLunar ? 1 : 0, lunarMonth ?? null, lunarDay ?? null, repeated ? 1 : 0, now],
   })
   const { rows } = await db.execute({
     sql: 'SELECT a.*, u.name as userName FROM "Anniversary" a JOIN "User" u ON u.id = a.userId WHERE a.id = ?',
     args: [id],
   })
   return rows[0] as unknown as AnniversaryRow
 }
 
 export async function updateAnniversary(
   id: string,
   title: string,
   date: string
 ): Promise<void> {
   const db = getDb()
   await db.execute({
     sql: 'UPDATE "Anniversary" SET title = ?, date = ? WHERE id = ?',
     args: [title, date, id],
   })
 }
 
 export async function deleteAnniversary(id: string): Promise<void> {
   const db = getDb()
   await db.execute({
     sql: 'DELETE FROM "Anniversary" WHERE id = ?',
     args: [id],
   })
 }
 
export async function getAnniversaryById(id: string): Promise<AnniversaryRow | null> {
  const db = getDb()
  const { rows } = await db.execute({
    sql: 'SELECT a.*, u.name as userName FROM "Anniversary" a JOIN "User" u ON u.id = a.userId WHERE a.id = ?',
    args: [id],
  })
  if (rows.length === 0) return null
  return rows[0] as unknown as AnniversaryRow
}
 
 export interface CapsuleRow {
   id: string
   fromUserId: string
   toUserId: string
   title: string
   content: string
   unlockAt: string
   createdAt: string
   fromUserName: string
   toUserName: string
 }
 
 export async function getVisibleCapsules(userId: string): Promise<CapsuleRow[]> {
   const db = getDb()
   const now = new Date().toISOString()
   const { rows } = await db.execute({
     sql: `SELECT tc.*, fu.name as fromUserName, tu.name as toUserName 
           FROM "TimeCapsule" tc 
           JOIN "User" fu ON fu.id = tc.fromUserId 
           JOIN "User" tu ON tu.id = tc.toUserId 
           WHERE tc.fromUserId = ? OR (tc.toUserId = ? AND tc.unlockAt <= ?) 
           ORDER BY tc.unlockAt ASC`,
     args: [userId, userId, now],
   })
   return rows as unknown as CapsuleRow[]
 }
 
 export async function createCapsule(
   fromUserId: string,
   toUserId: string,
   title: string,
   content: string,
   unlockAt: string
 ): Promise<CapsuleRow> {
   const db = getDb()
   const id = crypto.randomUUID()
   const now = new Date().toISOString()
   await db.execute({
     sql: 'INSERT INTO "TimeCapsule" (id, fromUserId, toUserId, title, content, unlockAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
     args: [id, fromUserId, toUserId, title, content, unlockAt, now],
   })
   const { rows } = await db.execute({
     sql: `SELECT tc.*, fu.name as fromUserName, tu.name as toUserName 
           FROM "TimeCapsule" tc 
           JOIN "User" fu ON fu.id = tc.fromUserId 
           JOIN "User" tu ON tu.id = tc.toUserId 
           WHERE tc.id = ?`,
     args: [id],
   })
   return rows[0] as unknown as CapsuleRow
 }
 
 export async function getCapsuleById(id: string, userId: string): Promise<CapsuleRow | null> {
   const db = getDb()
   const { rows } = await db.execute({
     sql: `SELECT tc.*, fu.name as fromUserName, tu.name as toUserName 
           FROM "TimeCapsule" tc 
           JOIN "User" fu ON fu.id = tc.fromUserId 
           JOIN "User" tu ON tu.id = tc.toUserId 
           WHERE tc.id = ?`,
     args: [id],
   })
   if (rows.length === 0) return null
   const capsule = rows[0] as unknown as CapsuleRow
   // 可见性检查：写信人始终可见，收信人需已解锁
   const now = new Date().toISOString()
   if (capsule.fromUserId !== userId && capsule.toUserId === userId && capsule.unlockAt > now) {
     return capsule
   }
  if (capsule.fromUserId !== userId && capsule.toUserId !== userId) {
    return null
  }
  return capsule
}
 
 export async function getAllUsers(): Promise<Pick<UserRow, "id" | "name">[]> {
   const db = getDb()
   const { rows } = await db.execute({
     sql: 'SELECT id, name FROM "User" ORDER BY name ASC',
     args: [],
   })
  return rows as unknown as Pick<UserRow, "id" | "name">[]
}
 
 export async function updateCapsule(
   id: string,
   userId: string,
   data: { title?: string; content?: string; unlockAt?: string }
  ): Promise<CapsuleRow | null> {
    const db = getDb()
   // 只有写信人可以修改
   const { rows: check } = await db.execute({
     sql: 'SELECT id FROM "TimeCapsule" WHERE id = ? AND fromUserId = ?',
     args: [id, userId],
   })
   if (check.length === 0) return null
 
   const sets: string[] = []
   const args: string[] = []
   if (data.title !== undefined) { sets.push('"title" = ?'); args.push(data.title) }
   if (data.content !== undefined) { sets.push('"content" = ?'); args.push(data.content) }
   if (data.unlockAt !== undefined) { sets.push('"unlockAt" = ?'); args.push(data.unlockAt) }
   if (sets.length === 0) return null
 
   args.push(id)
   await db.execute({
     sql: `UPDATE "TimeCapsule" SET ${sets.join(', ')} WHERE id = ?`,
     args,
   })
 
   // 重新查询返回完整数据
   const { rows } = await db.execute({
     sql: `SELECT tc.*, fu.name as fromUserName, tu.name as toUserName 
           FROM "TimeCapsule" tc 
           JOIN "User" fu ON fu.id = tc.fromUserId 
           JOIN "User" tu ON tu.id = tc.toUserId 
           WHERE tc.id = ?`,
     args: [id],
   })
   return rows[0] as unknown as CapsuleRow
 }
 
 export async function deleteCapsule(id: string, userId: string): Promise<boolean> {
   const db = getDb()
   // 只有写信人可以删除
   const { rows } = await db.execute({
     sql: 'SELECT id FROM "TimeCapsule" WHERE id = ? AND fromUserId = ?',
     args: [id, userId],
   })
   if (rows.length === 0) return false
   await db.execute({
     sql: 'DELETE FROM "TimeCapsule" WHERE id = ?',
     args: [id],
   })
   return true
 }

