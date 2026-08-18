import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Database,
  BarChart3,
  Brain,
  AlertCircle,
  CheckCircle2,
  Building2,
  User as UserIcon
} from 'lucide-react';
import { User, DemoAccount } from '../../types/auth';
import { SdaaLogo } from '../common/SdaaLogo';
import { ThreeBackground } from '../common/ThreeBackground';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'demo-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@analytics.corp',
    role: 'Lead Data Scientist',
    department: 'AI & Data Science',
    avatarColor: 'from-cyan-500 to-blue-600',
    description: 'Full administrative & AutoML predictive modeling access',
  },
  {
    id: 'demo-2',
    name: 'Marcus Vance',
    email: 'marcus.vance@executive.org',
    role: 'Executive Director',
    department: 'Strategic Planning',
    avatarColor: 'from-teal-500 to-emerald-600',
    description: 'Executive report generator & strategic dataset overview access',
  },
  {
    id: 'demo-3',
    name: 'Elena Rostova',
    email: 'elena.r@dataworks.io',
    role: 'Senior SQL & Data Engineer',
    department: 'Data Engineering',
    avatarColor: 'from-indigo-500 to-violet-600',
    description: 'SQL Workbench executor & raw dataset cleaning suite access',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Login form state
  const [email, setEmail] = useState('sarah.chen@analytics.corp');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [department, setDepartment] = useState('Data Analytics');
  const [role, setRole] = useState('Data Analyst');

  // Validation & status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle standard login submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid work email address.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);

    // Simulate authenticating against security provider
    setTimeout(() => {
      setIsLoading(false);
      // Create user object
      const user: User = {
        id: `user-${Date.now()}`,
        name: email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
        email: email.trim(),
        role: 'Verified Analyst',
        department: 'Enterprise Data Unit',
        lastLogin: new Date().toISOString(),
      };

      onLoginSuccess(user);
    }, 600);
  };

  // Handle signup submit
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMsg('Please enter a valid work email address.');
      return;
    }

    if (!signupPassword || signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: fullName.trim(),
        email: signupEmail.trim(),
        role: role,
        department: department,
        lastLogin: new Date().toISOString(),
      };

      setSuccessMsg('Account created successfully! Redirecting...');
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 500);
    }, 800);
  };

  // Handle 1-click Demo Account Login
  const handleDemoLogin = (demo: DemoAccount) => {
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const user: User = {
        id: demo.id,
        name: demo.name,
        email: demo.email,
        role: demo.role,
        department: demo.department,
        lastLogin: new Date().toISOString(),
      };

      onLoginSuccess(user);
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* 3D WebGL Background Canvas */}
      <ThreeBackground isDarkMode={true} />

      {/* Dynamic Background Glow Effect */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden relative z-10">
        
        {/* Left Side: Brand Showcase & Features */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
          <div>
            {/* Logo & Header */}
            <div>
              <SdaaLogo size="lg" showSubtitle={true} />
            </div>

            <p className="mt-6 text-xs text-slate-400 leading-relaxed">
              Enterprise workspace for automated AI data cleaning, interactive SQL querying, AutoML predictive modeling, and executive report generation.
            </p>

            {/* Feature Highlights List */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 mt-0.5">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">AI Dataset Intelligence</h4>
                  <p className="text-[11px] text-slate-400">Instant anomaly detection, statistical summary & automated key takeaways.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 mt-0.5">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Interactive Chart Studio</h4>
                  <p className="text-[11px] text-slate-400">Build interactive bar, scatter, line, pie, and radar visualizations.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 mt-0.5">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Browser SQL & Data Cleaning</h4>
                  <p className="text-[11px] text-slate-400">In-browser relational engine with missing value imputation & column tools.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Assurance Badge */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Role-Based Access Control
            </span>
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400">
              SOC2 Ready
            </span>
          </div>
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          
          {/* Form Header & Tab Switcher */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-cyan-400" />
                {activeTab === 'login' ? 'System Login' : 'Register Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'login'
                  ? 'Sign in with your authorized credentials to continue'
                  : 'Create a new analyst profile to access the workspace'}
              </p>
            </div>

            {/* Tab Pill Selector */}
            <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-750">
              <button
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setActiveTab('signup');
                  setErrorMsg(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'signup'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              /* LOGIN FORM */
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full rounded-2xl border border-slate-750 bg-slate-800/80 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Security Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setErrorMsg('For demo access, choose any password or use 1-click Demo Accounts below.')}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-750 bg-slate-800/80 pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30"
                    />
                    <span>Remember my session</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-4 text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      Authenticating User...
                    </span>
                  ) : (
                    <>
                      <span>Sign In to SDA Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              /* REGISTRATION FORM */
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleSignupSubmit}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Alex Vance"
                      className="w-full rounded-2xl border border-slate-750 bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="alex.vance@org.com"
                      className="w-full rounded-2xl border border-slate-750 bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-2xl border border-slate-750 bg-slate-800/80 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Data Analytics">Data Analytics</option>
                      <option value="AI & Engineering">AI & Engineering</option>
                      <option value="Business Operations">Business Operations</option>
                      <option value="Executive Management">Executive Management</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Target Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-2xl border border-slate-750 bg-slate-800/80 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Data Analyst">Data Analyst</option>
                      <option value="Data Scientist">Data Scientist</option>
                      <option value="SQL Engineer">SQL Engineer</option>
                      <option value="Executive Lead">Executive Lead</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Create Security Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-2xl border border-slate-750 bg-slate-800/80 pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-4 text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Creating Account...' : 'Register & Access System'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
                Quick 1-Click Valid Demo Users
              </span>
              <span className="text-[10px] text-slate-500">Instant Access</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleDemoLogin(demo)}
                  className="text-left p-2.5 rounded-2xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 hover:border-cyan-500/40 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full bg-gradient-to-r ${demo.avatarColor} flex items-center justify-center text-[10px] font-bold text-white shadow-xs`}>
                      {demo.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                        {demo.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {demo.role}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
