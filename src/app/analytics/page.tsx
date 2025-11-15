// src/app/analytics/page.tsx
import { getCurrentUserIdSafe } from '@/lib/auth'
import { expenseService } from '@/lib/supabase/client'
import { investmentService } from '@/lib/supabase/investments'

async function getAnalyticsData() {
  //const testUserId = 'test-user-123'
  // 🚀 CHANGED: Use dual-mode auth helper
  const userId = await getCurrentUserIdSafe()
   
  try {
    const [expenses, portfolio] = await Promise.all([
      expenseService.getByUser(userId),
      investmentService.getPortfolioSummary(userId)
    ])

    const currentMonth = new Date().toISOString().slice(0, 7)
    const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth))

    // Category breakdown
    const categoryData = monthlyExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    // Monthly trend (last 6 months)
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toISOString().slice(0, 7)
      const monthExpenses = expenses.filter(exp => exp.date.startsWith(monthKey))
      const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      
      return {
        month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        expenses: total,
        investments: i === 0 ? (portfolio?.totalInvested || 0) : 0
      }
    }).reverse()

    return {
      categoryData,
      monthlyTrend,
      portfolio,
      totalExpenses: monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return {
      categoryData: {},
      monthlyTrend: [],
      portfolio: null,
      totalExpenses: 0
    }
  }
}

export default async function Analytics() {
  const data = await getAnalyticsData()

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Financial Analytics</h1>
        <p className="text-gray-600">Deep insights into your spending and investments</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-600 mb-1">Monthly Spending</p>
          <p className="text-2xl font-bold text-gray-900">
            ₹{data.totalExpenses.toLocaleString('en-IN')}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-600 mb-1">Total Invested</p>
          <p className="text-2xl font-bold text-green-600">
            ₹{data.portfolio?.totalInvested.toLocaleString('en-IN') || '0'}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-600 mb-1">Portfolio Return</p>
          <p className="text-2xl font-bold text-blue-600">
            {data.portfolio?.returnPercentage.toFixed(1) || '0'}%
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-600 mb-1">Net Worth Impact</p>
          <p className="text-2xl font-bold text-purple-600">
            ₹{((data.portfolio?.totalReturn || 0) - data.totalExpenses).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-xl font-semibold mb-6">Spending by Category</h3>
          <div className="space-y-4">
            {Object.entries(data.categoryData).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">{category.replace(/[^a-zA-Z\s]/g, '')}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">₹{amount.toLocaleString('en-IN')}</div>
                  <div className="text-sm text-gray-500">
                    {((amount / data.totalExpenses) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Investment Allocation */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-xl font-semibold mb-6">Investment Allocation</h3>
          {data.portfolio ? (
            <div className="space-y-4">
              {Object.entries(data.portfolio.allocation)
                .filter(([_, amount]) => amount > 0)
                .map(([type, amount]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="font-medium">{type}</span>
                    <div className="text-right">
                      <div className="font-semibold">₹{amount.toLocaleString('en-IN')}</div>
                      <div className="text-sm text-gray-500">
                        {((amount / data.portfolio!.totalInvested) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No investment data yet
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-xl font-semibold mb-6">6-Month Trend</h3>
        <div className="space-y-4">
          {data.monthlyTrend.map((month, index) => (
            <div key={month.month} className="flex items-center justify-between">
              <span className="font-medium w-20">{month.month}</span>
              
              <div className="flex-1 mx-4">
                <div className="flex space-x-1">
                  {/* Expense Bar */}
                  <div 
                    className="bg-red-400 rounded-l h-6"
                    style={{ width: `${Math.min((month.expenses / 100000) * 100, 100)}%` }}
                  ></div>
                  {/* Investment Bar */}
                  <div 
                    className="bg-green-400 rounded-r h-6"
                    style={{ width: `${Math.min((month.investments / 500000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-right w-48">
                <div className="text-sm">
                  <span className="text-red-600">₹{month.expenses.toLocaleString('en-IN')}</span>
                  {' • '}
                  <span className="text-green-600">₹{month.investments.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center space-x-6 mt-4 text-sm text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 rounded mr-2"></div>
            Expenses
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded mr-2"></div>
            Investments
          </div>
        </div>
      </div>

      {/* Wealth Building Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8">
        <h3 className="text-xl font-semibold mb-4">Wealth Building Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-4 rounded-lg">
            <div className="font-semibold text-purple-600 mb-2">💰 Emergency Fund</div>
            <p>Ensure you have 6 months of expenses saved for emergencies</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="font-semibold text-green-600 mb-2">📈 Investment Rule</div>
            <p>Try to invest at least 20% of your monthly income</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="font-semibold text-blue-600 mb-2">🎯 Debt Management</div>
            <p>Pay off high-interest debts before increasing investments</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="font-semibold text-orange-600 mb-2">📊 Portfolio Diversity</div>
            <p>Spread investments across different asset classes</p>
          </div>
        </div>
      </div>
    </div>
  )
}