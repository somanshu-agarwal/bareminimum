// src/app/add-investment/page.tsx
'use client'

import { getCurrentUserIdSafe } from '@/lib/auth'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { InvestmentType } from '@/types/investments'

const INVESTMENT_TYPES: { type: InvestmentType; emoji: string; description: string }[] = [
  { type: 'Equity Stocks', emoji: '📈', description: 'Individual company stocks' },
  { type: 'Mutual Funds & SIP', emoji: '💰', description: 'Systematic investment plans' },
  { type: 'NPS (Tier 1)', emoji: '🏦', description: 'National Pension System - Tier 1' },
  { type: 'NPS (Tier 2)', emoji: '💳', description: 'National Pension System - Tier 2' },
  { type: 'EPF', emoji: '👨‍💼', description: 'Employee Provident Fund' },
  { type: 'PPF', emoji: '👨‍🌾', description: 'Public Provident Fund' },
  { type: 'Fixed Deposit', emoji: '🏛️', description: 'Bank fixed deposits' },
  { type: 'Recurring Deposit', emoji: '🔄', description: 'Recurring deposits' },
  { type: 'Gold/Commodities', emoji: '🥇', description: 'Gold and commodities' },
  { type: 'Crypto/Digital', emoji: '₿', description: 'Cryptocurrency and digital assets' }
]

export default function AddInvestment() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: '' as InvestmentType,
    name: '',
    amount: '',
    current_value: '',
    expected_return: '12',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!form.type || !form.amount || !form.current_value) {
    toast.error('Please fill in required fields')
    return
  }

  setLoading(true)
  const toastId = toast.loading('Adding investment...')

  try {
    // 🚀 CHANGED: Use dual-mode auth helper instead of hardcoded ID
    const userId = await getCurrentUserIdSafe()
    
    const { data, error } = await supabase
      .from('investments')
      .insert([{
        user_id: userId, // 🚀 Now uses real user ID or safe fallback
        type: form.type,
        name: form.name || `${form.type} Investment`,
        amount: parseFloat(form.amount),
        current_value: parseFloat(form.current_value),
        expected_return: parseFloat(form.expected_return),
        date: form.date,
        notes: form.notes || null
      }])
      .select()

    if (error) throw error

    toast.success('Investment added successfully!', { id: toastId })
    
    setTimeout(() => {
      router.push('/investments')
    }, 1000)

  } catch (error: any) {
    console.error('Error adding investment:', error)
    toast.error(`Failed to add investment: ${error.message}`, { id: toastId })
  } finally {
    setLoading(false)
  }
}

  const updateForm = (updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }))
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg border">
      <h1 className="text-2xl font-bold mb-6">Add Investment</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Investment Type */}
        <div>
          <label className="block text-sm font-medium mb-3">Investment Type</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {INVESTMENT_TYPES.map(({ type, emoji, description }) => (
              <button
                key={type}
                type="button"
                onClick={() => updateForm({ type })}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  form.type === type 
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="text-lg mb-1">{emoji}</div>
                <div className="font-medium text-sm">{type.split(' ')[0]}</div>
                <div className="text-xs text-gray-500 mt-1">{description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount & Current Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Invested Amount (₹)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => updateForm({ amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Current Value (₹)</label>
            <input
              type="number"
              value={form.current_value}
              onChange={(e) => updateForm({ current_value: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
        </div>

        {/* Name & Expected Return */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Investment Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder="e.g., Reliance Stocks, SBI Mutual Fund"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Expected Return (%)</label>
            <input
              type="number"
              value={form.expected_return}
              onChange={(e) => updateForm({ expected_return: e.target.value })}
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Date & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Investment Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => updateForm({ date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateForm({ notes: e.target.value })}
            placeholder="Any additional notes about this investment..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !form.type || !form.amount || !form.current_value}
            className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Adding...' : 'Add Investment'}
          </button>
        </div>
      </form>
    </div>
  )
}