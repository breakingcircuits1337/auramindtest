// Previous imports remain the same...

const PricingPlan: React.FC<PricingPlanProps> = ({ 
  name, 
  price, 
  description, 
  features, 
  popular, 
  buttonText,
  productId,
  index
}) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { loading, startFreeTrial } = useSubscription();

  const handleSubscribe = async () => {
    try {
      const plan = productId === 'basic_tier' ? 'basic' : 'premium';
      const result = await startFreeTrial(plan);
      
      if (result.success) {
        // Redirect to onboarding or dashboard
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Trial start error:', error);
    }
  };

  return (
    <motion.div
      // ... Previous motion props remain the same ...
    >
      {/* Previous JSX remains the same until the button */}
      
      <div className="mt-8">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className={`block w-full px-4 py-2.5 text-sm font-semibold text-center rounded-md ${
            popular
              ? 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
          } transition-colors`}
        >
          {loading ? 'Processing...' : 'Start 30-Day Free Trial'}
        </button>
        <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          No credit card required
        </p>
      </div>
    </motion.div>
  );
};

// Rest of the component remains the same...