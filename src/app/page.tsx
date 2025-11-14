// app/page.tsx
export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to BareMinimum
        </h2>
        <p className="text-gray-600">
          Let's track your expenses and build wealth together
        </p>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700">This Month</h3>
          <p className="text-2xl font-bold text-gray-900">₹0</p>
          <p className="text-sm text-gray-500">No expenses yet</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700">Savings Rate</h3>
          <p className="text-2xl font-bold text-green-600">0%</p>
          <p className="text-sm text-gray-500">Let's get started!</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700">Wealth Goal</h3>
          <p className="text-2xl font-bold text-blue-600">₹0</p>
          <p className="text-sm text-gray-500">Set your target</p>
        </div>
      </div>

      {/* Quick Actions */}
      
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="flex gap-4">
            <a 
              href="/add-expense"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
               >
              ➕ Add Expense
            </a>
            <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
              💰 Set Income
            </button>
            <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
              🎯 Set Goal
            </button>
          </div>
        </div>

      {/* Recent Expenses */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
        <p className="text-gray-500 text-center py-8">
          No expenses yet. Add your first expense to get started!
        </p>
      </div>
    </div>
  )
}