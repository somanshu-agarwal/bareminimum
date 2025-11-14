// app/add-expense/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CATEGORIES = [
  '🥦 Groceries', '🍔 Food Delivery', '🚗 Transportation', 
  '💡 Bills', '🏠 Rent', '📈 Investments', '💰 Savings',
  '🎮 Entertainment', '👕 Personal', '🏥 Health', '✈️ Travel',
  '❓ Miscellaneous'
] as const

const PAYMENT_METHODS = ['UPI', 'Cash', 'Netbanking', 'Card'] as const

export default function AddExpense() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    category: '',
    paymentMethod: 'UPI' as typeof PAYMENT_METHODS[number],
    merchant: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || !form.category) return

    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          amount: parseFloat(form.amount),
          category: form.category,
          payment_method: form.paymentMethod,
          merchant: form.merchant,
          description: form.description,
          date: new Date().toISOString()
        }])

      if (error) throw error
      router.push('/')
    } catch (error) {
      console.error('Error adding expense:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }))
  }

  const autoSuggestCategory = (merchant: string) => {
    const m = merchant.toLowerCase()
    if (m.includes('blinkit')) return '🥦 Groceries'
    if (m.includes('zomato') || m.includes('swiggy')) return '🍔 Food Delivery'
    if (m.includes('uber') || m.includes('ola')) return '🚗 Transportation'
    return ''
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg border">
      <h1 className="text-2xl font-bold mb-6">Add Expense</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-1">Amount (₹)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => updateForm({ amount: e.target.value })}
            placeholder="0.00"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Category {form.category && `· ${form.category.replace(/[^a-zA-Z\s]/g, '')}`}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => updateForm({ category: cat })}
                className={`p-3 border rounded-lg text-sm ${
                  form.category === cat ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium mb-2">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => updateForm({ paymentMethod: method })}
                className={`p-3 border rounded-lg ${
                  form.paymentMethod === method ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Merchant with Auto-suggest */}
        <div>
          <label className="block text-sm font-medium mb-1">Merchant</label>
          <input
            type="text"
            value={form.merchant}
            onChange={(e) => {
              const merchant = e.target.value
              const category = autoSuggestCategory(merchant) || form.category
              updateForm({ merchant, category })
            }}
            placeholder="Blinkit, Zomato, etc."
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description (Optional)</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => updateForm({ description: e.target.value })}
            placeholder="What was this for?"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex-1 py-3 px-4 border rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !form.amount || !form.category}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </div>
      </form>
    </div>
  )
}