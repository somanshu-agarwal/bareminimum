// src/types/database.ts
export type Transaction = {
  id: string
  user_id: string
  amount: number
  category: string
  payment_method: string
  merchant: string
  description?: string
  date: string
}