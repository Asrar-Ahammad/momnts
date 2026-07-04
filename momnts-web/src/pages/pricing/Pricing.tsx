import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Check, X, Crown, Lightning, ArrowLeft } from '@phosphor-icons/react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { useSubscription } from '../../features/subscription/hooks/useSubscription'
import { toast } from 'sonner'
import { useAuth } from '../../features/auth/hooks/useAuth'

const plans = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'Perfect for trying out Momnts with friends and family.',
    features: [
      { name: '3 events lifetime', included: true },
      { name: '25 attendees per event', included: true },
      { name: '50 organizer uploads per event', included: true },
      { name: '10 attendee uploads per event', included: true },
      { name: '1 secure event', included: true },
      { name: 'Invite code regeneration', included: true },
      { name: 'Unlimited events', included: false },
      { name: 'Unlimited secure events', included: false },
    ],
    cta: 'Current Plan',
    popular: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '₹199',
    period: '/month',
    description: 'For power users who host events regularly.',
    features: [
      { name: 'Unlimited events', included: true },
      { name: '150 attendees per event', included: true },
      { name: '500 organizer uploads per event', included: true },
      { name: '20 attendee uploads per event', included: true },
      { name: 'Unlimited secure events', included: true },
      { name: 'Invite code regeneration', included: true },
      { name: 'Priority support', included: true },
      { name: 'Early access to features', included: true },
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
]

const Pricing = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { plan: currentPlan, isLoading } = useSubscription()
  const isLoggedIn = !!user

  const handleUpgrade = () => {
    if (!isLoggedIn) {
      navigate('/register')
      return
    }
    toast.info('Pro plan coming soon! Stay tuned.', {
      description: 'We\'re working on payment integration. You\'ll be the first to know.',
      duration: 5000,
    })
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} weight="bold" />
          Back
        </button>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl sm:text-6xl font-bold text-neutral-900 dark:text-white mb-4 font-sirage tracking-tight">
            Choose your plan
          </h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Start free with 3 events. Upgrade to Pro when you need more power.
          </p>
        </motion.div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {plans.map((plan, index) => {
            const isCurrentPlan = isLoggedIn && currentPlan?.toUpperCase() === plan.id.toUpperCase()

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-[32px] p-8 sm:p-10 transition-all duration-300 ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground shadow-2xl'
                    : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white ring-1 ring-neutral-200 dark:ring-neutral-800'
                }`}
              >
                {/* Popular badge */}
                {/* {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-violet-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-violet-500/30">
                      <Crown size={12} weight="fill" />
                      Most Popular
                    </span>
                  </div>
                )} */}

                {/* Plan header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    {isCurrentPlan && (
                      <Badge className={`text-[10px] font-bold uppercase tracking-wider ${
                        plan.popular
                          ? 'bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                      }`}>
                        Current
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
                    <span className={`text-base font-medium ${
                      plan.popular
                        ? 'text-neutral-400 dark:text-neutral-500'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}>
                      {plan.period}
                    </span>
                  </div>

                  <p className={`text-sm leading-relaxed ${
                    plan.popular
                      ? 'text-neutral-400 dark:text-neutral-500'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}>
                    {plan.description}
                  </p>
                </div>

                {/* CTA */}
                <div className="mb-8">
                  {plan.popular ? (
                    isCurrentPlan ? (
                      <Button
                        disabled
                        className="w-full h-13 rounded-2xl text-base font-bold bg-white/10 text-white/50 dark:bg-neutral-900/10 dark:text-neutral-900/50 cursor-not-allowed"
                      >
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        onClick={handleUpgrade}
                        className="w-full h-13 rounded-2xl text-base font-bold bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/40 cursor-pointer"
                      >
                        <Lightning size={18} weight="fill" className="mr-2" />
                        Coming Soon
                      </Button>
                    )
                  ) : (
                    <Button
                      disabled
                      variant="outline"
                      className={`w-full h-13 rounded-2xl text-base font-bold cursor-not-allowed ${
                        isCurrentPlan
                          ? 'bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-800'
                          : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
                      }`}
                    >
                      {isCurrentPlan ? 'Current Plan' : plan.cta}
                    </Button>
                  )}
                </div>

                {/* Divider */}
                <div className={`h-px mb-8 ${
                  plan.popular
                    ? 'bg-white/10 dark:bg-neutral-900/10'
                    : 'bg-neutral-200 dark:bg-neutral-800'
                }`} />

                {/* Features */}
                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-start gap-3">
                      {feature.included ? (
                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          plan.popular
                            ? 'bg-violet-500/20 text-violet-400 dark:bg-violet-500/20 dark:text-violet-600'
                            : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400'
                        }`}>
                          <Check size={12} weight="bold" />
                        </div>
                      ) : (
                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          plan.popular
                            ? 'bg-white/5 text-neutral-500 dark:bg-neutral-900/5 dark:text-neutral-400'
                            : 'bg-neutral-100 text-neutral-300 dark:bg-neutral-800 dark:text-neutral-600'
                        }`}>
                          <X size={10} weight="bold" />
                        </div>
                      )}
                      <span className={`text-sm leading-relaxed ${
                        feature.included
                          ? ''
                          : plan.popular
                            ? 'text-neutral-500 dark:text-neutral-500'
                            : 'text-neutral-400 dark:text-neutral-500'
                      }`}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* FAQ / Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            All plans include face recognition, real-time notifications, and photo galleries.
          </p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            Questions? Reach out at{' '}
            <a href="mailto:asrarahammadshaik@gmail.com" className="text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 transition-colors">
              asrarahammadshaik@gmail.com
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Pricing
