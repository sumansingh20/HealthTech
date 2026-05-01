'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, Check, Zap, Shield, Users, Activity, 
  BarChart3, FileText, ChevronRight, Download,
  Building2, Wallet, Receipt, AlertCircle
} from 'lucide-react';

type PlanTier = 'starter' | 'professional' | 'enterprise';

interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    description: 'Perfect for small clinics',
    features: [
      'Up to 10 beds',
      'Real-time monitoring',
      'Basic AI predictions',
      'Email alerts',
      '5 user accounts'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 299,
    description: 'For growing hospitals',
    popular: true,
    features: [
      'Up to 50 beds',
      'Advanced AI models',
      'SMS + Email alerts',
      'Unlimited users',
      'Analytics dashboard',
      'PDF reports',
      'Priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 799,
    description: 'Full healthcare network',
    features: [
      'Unlimited beds',
      'Custom ML models',
      'Multi-location',
      'HIPAA compliance',
      'Dedicated support',
      'API access',
      'SLA guarantee'
    ]
  }
];

interface UsageMetric {
  label: string;
  value: number;
  limit: number;
  unit: string;
}

const usageMetrics: UsageMetric[] = [
  { label: 'API Calls', value: 45230, limit: 100000, unit: 'requests' },
  { label: 'WebSocket Connections', value: 156, limit: 500, unit: 'connections' },
  { label: 'Storage Used', value: 2.4, limit: 10, unit: 'GB' },
  { label: 'Email Alerts', value: 892, limit: 5000, unit: 'sent' },
  { label: 'SMS Alerts', value: 234, limit: 1000, unit: 'sent' }
];

const invoices = [
  { id: 'INV-2026-005', date: '2026-05-01', amount: 299, status: 'paid' },
  { id: 'INV-2026-004', date: '2026-04-01', amount: 299, status: 'paid' },
  { id: 'INV-2026-003', date: '2026-03-01', amount: 299, status: 'paid' }
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanTier>('professional');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const currentPlanData = plans.find(p => p.id === currentPlan)!;
  const yearlySavings = Math.round(currentPlanData.price * 12 * 0.2);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-cyan-500" />
              <h1 className="text-lg font-semibold text-white">Billing & Subscription</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-2xl border border-cyan-500/30 p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Zap className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Current Plan</p>
                <h2 className="text-2xl font-bold text-white">{currentPlanData.name}</h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Next billing date</p>
              <p className="text-lg font-medium text-white">June 1, 2026</p>
              <p className="text-sm text-cyan-400">${currentPlanData.price}/month</p>
            </div>
          </div>
        </motion.div>

        {/* Usage Metrics */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Usage This Month</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usageMetrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-900/50 rounded-xl border border-slate-800 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{metric.label}</span>
                  <span className="text-xs text-slate-500">
                    {metric.value.toLocaleString()} / {metric.limit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${(metric.value / metric.limit) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {((metric.value / metric.limit) * 100).toFixed(1)}% used
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Available Plans</h3>
            <div className="flex items-center bg-slate-900/50 rounded-lg p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  billingCycle === 'monthly' 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  billingCycle === 'yearly' 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Yearly (-20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-slate-900/50 rounded-2xl border p-6 ${
                  plan.popular 
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/10' 
                    : 'border-slate-800'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <h4 className="text-lg font-semibold text-white mb-1">{plan.name}</h4>
                <p className="text-sm text-slate-400 mb-4">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">
                    ${billingCycle === 'yearly' ? Math.round(plan.price * 0.8) : plan.price}
                  </span>
                  <span className="text-sm text-slate-400">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-cyan-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setCurrentPlan(plan.id)}
                  disabled={currentPlan === plan.id}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentPlan === plan.id
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white'
                  }`}
                >
                  {currentPlan === plan.id ? 'Current Plan' : 'Upgrade'}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-400" />
              <h3 className="font-semibold text-white">Billing History</h3>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Download All
            </button>
          </div>
          <div className="divide-y divide-slate-800/50">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{invoice.id}</p>
                    <p className="text-xs text-slate-400">{invoice.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white">${invoice.amount}</span>
                  <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                    {invoice.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-8 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-cyan-500" />
              <h3 className="font-semibold text-white">Payment Method</h3>
            </div>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">Update</button>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">VISA</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">•••• •••• •••• 4242</p>
              <p className="text-xs text-slate-400">Expires 12/2027</p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Demo Mode</p>
            <p className="text-sm text-amber-200/70">
              This is a demonstration billing interface. In production, integrate with Stripe, PayPal, or similar payment providers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
