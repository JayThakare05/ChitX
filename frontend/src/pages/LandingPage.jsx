import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Wallet, Medal, Coins, BrainCircuit, ShieldCheck, AlertCircle,
  TrendingUp, FileText, Award, Users, DollarSign, Activity, Zap,
  Link, Cpu, Globe, LayoutGrid, Lock, LifeBuoy, RefreshCw, UserPlus
} from 'lucide-react';
import {
  Navbar, NavBody, NavItems, NavbarLogo, NavbarButton,
  MobileNav, MobileNavHeader, MobileNavToggle, MobileNavMenu,
} from '../components/ui/resizable-navbar';
import heroImg from '../assets/hero.png';
import Circular3DCarousel from '../components/features/Circular3DCarousel';
import MetaMaskFox3D from '../components/features/MetaMaskFox3D';
import { FloatingPaths } from '../components/ui/background-paths';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'About', link: '#about' },
    { name: 'Features', link: '#features' },
    { name: 'Workflow', link: '#how-it-works' },
  ];

  return (
    <div className="min-h-screen bg-[#f4fcf9] font-sans selection:bg-[#134e4a]/20 overflow-x-hidden text-[#134e4a]">

      {/* 0. Resizable Navigation */}
      <Navbar>
        {/* Desktop */}
        <NavBody>
          <NavbarLogo onClick={() => navigate('/')} />
          <NavItems items={navItems} />
          <div className="flex items-center gap-4">
            <NavbarButton variant="secondary" onClick={() => navigate('/auth')}>Log In</NavbarButton>
            <NavbarButton variant="primary" onClick={() => navigate('/auth')}>Launch App</NavbarButton>
          </div>
        </NavBody>

        {/* Mobile */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo onClick={() => navigate('/')} />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#134e4a]/70 hover:text-[#134e4a] font-medium text-sm transition-colors"
              >
                {item.name}
              </a>
            ))}
            <div className="flex flex-col gap-3 pt-2">
              <NavbarButton variant="secondary" className="w-full" onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }}>Log In</NavbarButton>
              <NavbarButton variant="primary" className="w-full" onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }}>Launch App</NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* 1. HERO SECTION */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-to-br from-[#d9f6ec] to-transparent rounded-full -translate-x-1/2 -translate-y-1/4 opacity-50 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
          {/* Left Text Block */}
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e3f7f1] text-[#134e4a] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#1aa08c]"></span>
              AI-Governed Decentralized Chit Fund System
            </div>

            <h1 className="text-5xl lg:text-[4rem] font-medium leading-[1.1] tracking-tight">
              A transparent and intelligent way to<br />
              <span className="text-[#1f8c7e]">participate in chit funds</span>
            </h1>

            <p className="text-[#134e4a]/70 max-w-lg text-lg leading-relaxed pt-2">
              Using KYC-based trust scoring, blockchain automation, and AI-assisted decision-making.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button onClick={() => navigate('/onboarding')} className="px-8 py-3.5 bg-[#134e4a] hover:bg-[#0f3d3a] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#134e4a]/20">
                <Play size={18} fill="currentColor" /> Get Started
              </button>
              <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-3.5 bg-white border border-[#134e4a] hover:bg-[#f4fcf9] text-[#134e4a] font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                <Activity size={18} /> Learn More
              </button>
            </div>

            <p className="text-[#134e4a]/50 text-sm italic pt-2">
              Trust is not assumed — it is calculated.
            </p>

            <div className="flex gap-10 pt-6">
              {[
                { value: "50K+", label: "Active Users" },
                { value: "$10M+", label: "Pooled Funds" },
                { value: "99.9%", label: "Trust Score" }
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl font-light text-[#134e4a]">{stat.value}</div>
                  <div className="text-xs text-[#134e4a]/60 mt-1 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual Block (Dashboard Mockup) */}
          <div className="flex-1 relative w-full h-[500px] mt-10 lg:mt-0 perspective-1000">
            <div className="absolute inset-0 bg-[#0a1917] rounded-3xl overflow-hidden shadow-2xl border-4 border-white transform rotate-y-[-5deg] rotate-x-[2deg]">
              <img
                src={heroImg}
                alt="Hero Illustration"
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0f2e2b] to-transparent opacity-40 mix-blend-multiply"></div>
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-12 -left-8 right-12 bg-[#f8fffc] rounded-2xl p-6 shadow-xl border border-teal-100 flex justify-between items-center z-10"
            >
              <div>
                <div className="text-xs text-[#134e4a]/60 font-medium mb-1">Your Trust Score</div>
                <div className="text-3xl font-medium text-[#134e4a]">95%</div>
              </div>
              <div className="w-14 h-14 rounded-full border-2 border-[#1f8c7e] flex items-center justify-center text-[#1f8c7e] font-medium text-lg">
                A+
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-5 shadow-2xl flex border border-teal-50 items-center gap-4 z-20"
            >
              <div className="w-12 h-12 bg-[#134e4a] rounded-xl flex items-center justify-center text-white">
                <Wallet size={20} />
              </div>
              <div>
                <div className="text-xs text-[#134e4a]/50 uppercase tracking-widest font-semibold">Active Pools</div>
                <div className="text-xl font-medium text-[#134e4a]">12</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. WHAT IS CHITX */}
      <section id="about" className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start mb-20">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f0f9f6] text-[#1aa08c] text-xs font-bold uppercase tracking-wider">
                🚀 Definition
              </div>
              <h2 className="text-4xl md:text-5xl font-medium text-[#134e4a] leading-tight">
                What is ChitX?
              </h2>
              <p className="text-[#134e4a]/80 leading-relaxed text-xl">
                ChitX is an <span className="text-[#1aa08c] font-semibold">AI-governed decentralized chit fund system</span> that replaces traditional trust-based models with data-driven decision making.
              </p>

              <div className="p-8 rounded-3xl bg-gradient-to-br from-[#134e4a] to-[#0f3d3a] text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl group-hover:bg-white/10 transition-colors"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4 text-[#7ce5d1]">
                    <Zap size={20} fill="currentColor" />
                    <span className="text-sm font-bold uppercase tracking-widest">Core Concept</span>
                  </div>
                  <blockquote className="text-2xl font-medium italic">
                    “Trust is not assumed — it is calculated.”
                  </blockquote>
                </div>
              </div>
            </div>

            <div className="flex-1 relative w-full h-[450px]">
              <div className="absolute inset-0 bg-[#0f2e2b] rounded-[2.5rem] overflow-hidden shadow-2xl">
                {/* Background wave grid */}
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-30">
                  <path d="M0,50 Q150,200 300,50 T600,50" fill="none" stroke="#adebdd" strokeWidth="2" />
                  <path d="M0,150 Q200,50 400,150 T800,150" fill="none" stroke="#1aa08c" strokeWidth="4" />
                  <path d="M-100,300 Q150,450 400,300 T900,300" fill="none" stroke="#2a706b" strokeWidth="8" />
                  <line x1="100" y1="0" x2="100" y2="500" stroke="#1aa08c" strokeWidth="1" strokeDasharray="10,10" />
                  <line x1="300" y1="0" x2="300" y2="500" stroke="#1aa08c" strokeWidth="1" strokeDasharray="10,10" />
                </svg>

                {/* Scanning line */}
                <motion.div
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7ce5d1] to-transparent z-10"
                />

                {/* 3D Rotating MetaMask Fox - centered */}
                <div className="absolute inset-0 flex items-center justify-center z-[5]">
                  <MetaMaskFox3D size={280} />
                </div>
              </div>

              <div className="absolute top-10 -right-6 bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center justify-center border border-teal-50 z-20 w-36 h-36">
                <div className="text-3xl font-bold text-[#1aa08c]">100%</div>
                <div className="text-[#134e4a]/60 text-xs font-medium uppercase tracking-tighter">Transparent</div>
                <ShieldCheck className="text-[#1aa08c] mt-2" size={24} />
              </div>
            </div>
          </div>

          <div className="mb-24">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-[2px] bg-[#1aa08c]"></div>
              <h3 className="text-2xl font-medium text-[#134e4a] flex items-center gap-2">
                <span role="img" aria-label="search">🔍</span> What Makes It Different?
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "AI-Based Trust Scoring",
                  desc: "Users are evaluated using financial data instead of assumptions.",
                  icon: BrainCircuit,
                  color: "bg-blue-50 text-blue-600",
                  emoji: "🧠"
                },
                {
                  title: "Blockchain Transparency",
                  desc: "Every transaction is secure, verifiable, and tamper-proof.",
                  icon: Link,
                  color: "bg-emerald-50 text-emerald-600",
                  emoji: "🔗"
                },
                {
                  title: "Smart Contract Automation",
                  desc: "No middleman — payouts happen automatically.",
                  icon: Cpu,
                  color: "bg-purple-50 text-purple-600",
                  emoji: "⚙️"
                }
              ].map((item, i) => (
                <div key={i} className="group p-8 rounded-[2rem] bg-[#f8fffc] border border-teal-50 hover:bg-white hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300">
                  <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <item.icon size={26} />
                  </div>
                  <h4 className="text-xl font-semibold text-[#134e4a] mb-3 flex items-center gap-2">
                    {item.emoji} {item.title}
                  </h4>
                  <p className="text-[#134e4a]/70 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#f0f9f6] rounded-[3rem] p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#1aa08c]/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1">
                <h3 className="text-3xl font-medium text-[#134e4a] mb-6 flex items-center gap-3">
                  <Globe className="text-[#1aa08c]" /> Impact
                </h3>
                <div className="space-y-6">
                  {[
                    "Eliminates fraud and human bias",
                    "Ensures fair participation",
                    "Builds a scalable and reliable savings ecosystem"
                  ].map((impact, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-6 h-6 rounded-full bg-[#1aa08c] flex items-center justify-center text-white shrink-0">
                        <ShieldCheck size={14} />
                      </div>
                      <span className="text-lg text-[#134e4a]/90 font-medium">{impact}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex justify-center">
                <div className="relative">
                  <div className="text-[10rem] font-bold text-[#1aa08c]/5 leading-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">🌍</div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-48 h-48 border-4 border-dashed border-[#1aa08c]/20 rounded-full flex items-center justify-center"
                  >
                    <div className="w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center text-[#1aa08c]">
                      <Activity size={48} />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. POWERFUL FEATURES */}
      <section id="features" className="py-24 px-6 bg-[#f4fcf9] overflow-visible">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-medium text-[#134e4a] mb-4">Powerful Features</h2>
            <p className="text-[#134e4a]/60 max-w-xl mx-auto">Everything you need for a secure, transparent, and intelligent chit fund experience.</p>
          </div>

          <div className="relative mt-8">
            <Circular3DCarousel 
              items={[
                { title: "Trust Score Engine", desc: "AI-powered scoring system that evaluates user credibility based on KYC data, transaction history, and behavior patterns.", icon: Medal },
                { title: "Token Economy", desc: "Native tokenomics with staking rewards, governance rights, and utility across the entire ChitX ecosystem.", icon: Coins },
                { title: "AI-Based Payout", desc: "Intelligent algorithms determine optimal payout timing and amounts, ensuring fairness and maximizing returns.", icon: BrainCircuit },
                { title: "Blockchain Transparency", desc: "All transactions recorded immutably on-chain. View complete audit trails and verify every action in real-time.", icon: ShieldCheck },
                { title: "Emergency Fund Protection", desc: "Automatic safety net mechanisms and insurance pools protect participants from unforeseen circumstances.", icon: AlertCircle },
                { title: "Dynamic Risk Profiling", desc: "Real-time risk assessment adapts to market conditions and user behavior, optimizing pool performance.", icon: TrendingUp }
              ]} 
            />
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-[1400px] mx-auto text-center">
          <h2 className="text-4xl font-medium text-[#134e4a] mb-4">How It Works</h2>
          <p className="text-[#134e4a]/60 mb-20 max-w-xl mx-auto">Simple, secure, and automated workflow powered by AI and blockchain technology.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 relative overflow-visible px-4">
            {[
              { step: "Step 1", title: "User Onboarding & KYC", desc: "Signs up via Phone OTP. Complete KYC: Income, Expenses, Employment, Bank statement.", output: "Verified User Profile", icon: UserPlus },
              { step: "Step 2", title: "Trust Score Engine (AI)", desc: "AI extracts savings ratio, spending stability, and consistency. ML models evaluate risk.", output: "Trust Score (0-100), Risk category", icon: BrainCircuit },
              { step: "Step 3", title: "Token Allocation", desc: "Tokens assigned based on (Trust Score × 10). Controls access and participation power.", purpose: "Participation Power", icon: Coins },
              { step: "Step 4", title: "Wallet Setup", desc: "Connects via Web3Auth/MetaMask. Securely manage assets.", output: "Tokens transferred to wallet", icon: Wallet },
              { step: "Step 5", title: "Intelligent Pool Formation", desc: "Users grouped by trust score and risk level (Beginner to Advanced).", example: "Grouping users by Risk", icon: LayoutGrid },
              { step: "Step 6", title: "Contribution Phase", desc: "Users deposit tokens into pool. Smart contract locks funds. Pool activates when full.", icon: Lock },
              { step: "Step 7", title: "AI Decision Engine", desc: "AI selects payout recipient based on behavior, and risk prediction.", ensures: "Fairness & Risk reduction", icon: Zap },
              { step: "Step 8", title: "Smart Contract Execution", desc: "Blockchain executes fund transfer and recording. No human involvement.", icon: ShieldCheck },
              { step: "Step 9", title: "Default Handling System", desc: "Emergency fund activated. Token penalty applied. Risk score reduced on failure.", icon: LifeBuoy },
              { step: "Step 10", title: "Dynamic Score Update", desc: "Score recalculated after each cycle. System becomes smarter over time.", icon: RefreshCw }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                className="group relative flex flex-col items-center text-center"
              >
                {i % 5 !== 4 && i < 9 && (
                  <div className="hidden lg:block absolute top-[28px] left-[calc(50%+4rem)] w-[calc(100%-8rem)] h-[2px] bg-gradient-to-r from-[#134e4a]/10 to-transparent z-0"></div>
                )}
                
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-teal-900/5 border border-teal-50/50 w-full hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/10 z-10 group mt-4">
                  <div className="w-14 h-14 bg-[#134e4a] text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#134e4a]/20 group-hover:scale-110 group-hover:rotate-3 transition-transform mx-auto">
                    <step.icon size={26} />
                  </div>
                  <div className="text-[10px] text-[#1aa08c] font-black uppercase tracking-[0.2em] mb-3">{step.step}</div>
                  <h3 className="text-sm font-bold text-[#134e4a] leading-tight mb-4 min-h-[40px] flex items-center justify-center">{step.title}</h3>
                  <p className="text-[11px] text-[#134e4a]/60 leading-relaxed mb-6 line-clamp-4">{step.desc}</p>
                  
                  {(step.output || step.purpose || step.ensures || step.example) && (
                    <div className="pt-4 border-t border-teal-50 flex flex-col gap-2">
                       <div className="text-[9px] font-black uppercase tracking-wider text-[#134e4a]/30">Result / Detail</div>
                       <div className="text-[10px] font-medium text-[#1aa08c] bg-teal-50/50 py-1.5 px-3 rounded-lg inline-block">
                          {step.output || step.purpose || step.ensures || step.example}
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TRUST SCORE BANNER (Dark Teal Layout) */}
      <section className="relative py-24 px-6 bg-[#205b57] overflow-hidden">
        {/* Animated Background Paths */}
        <div className="absolute inset-0 opacity-40">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl font-medium text-white leading-tight pr-4">
              Your Trust Score = Your Financial Power
            </h2>
            <p className="text-white/70 max-w-lg leading-relaxed pt-2">
              Build your reputation on-chain. Higher trust scores unlock better opportunities, lower fees, and priority access to premium pools.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 w-full max-w-3xl">
              {/* Trust Score Card */}
              <div className="group bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-teal-400/50 p-6 rounded-[2rem] flex-1 flex flex-col justify-center items-center text-center w-full min-h-[140px] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-teal-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-14 h-14 bg-teal-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 border border-teal-400/20 shadow-inner">
                  <ShieldCheck size={28} className="text-teal-300 drop-shadow-md" />
                </div>
                <div className="text-[11px] text-teal-50 font-bold uppercase tracking-[0.2em] leading-tight">Trust Score</div>
              </div>

              <div className="text-teal-300 font-light text-4xl drop-shadow-lg opacity-80">+</div>

              {/* Risk Score Card */}
              <div className="group bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-amber-400/50 p-6 rounded-[2rem] flex-1 flex flex-col justify-center items-center text-center w-full min-h-[140px] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 border border-amber-400/20 shadow-inner">
                  <AlertCircle size={28} className="text-amber-300 drop-shadow-md" />
                </div>
                <div className="text-[11px] text-amber-50 font-bold uppercase tracking-[0.2em] leading-tight">Risk Score</div>
              </div>

              <div className="text-teal-300 font-light text-4xl drop-shadow-lg opacity-80">=</div>

              {/* Priority Score Card (The Result - Most Prominent) */}
              <div className="group bg-gradient-to-br from-teal-400 to-emerald-500 p-px rounded-[2rem] flex-1 w-full min-h-[140px] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-teal-400/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-500 z-10"></div>
                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 w-full h-full rounded-[2rem] flex flex-col justify-center items-center text-center p-6 shadow-inner relative z-20 overflow-hidden">
                  {/* Glowing orb effect behind icon */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/30 rounded-full blur-2xl group-hover:bg-white/40 transition-colors duration-500"></div>
                  
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 border border-white/30 shadow-lg relative z-30">
                    <Award size={28} className="text-white drop-shadow-md" />
                  </div>
                  <div className="text-[11px] text-white font-black uppercase tracking-[0.2em] leading-tight drop-shadow-sm relative z-30">Priority Score</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-center items-center relative w-full min-h-[400px]">
            <div className="relative w-80 h-80 flex items-center justify-center z-10">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="160" cy="160" r="140" fill="none" stroke="#256e69" strokeWidth="20" />
                <circle cx="160" cy="160" r="140" fill="none" stroke="#adebdd" strokeWidth="20" strokeLinecap="round" strokeDasharray="879.6" strokeDashoffset={879.6 * (1 - 0.95)} />
              </svg>

              <div className="flex flex-col items-center justify-center text-center">
                <Award size={32} strokeWidth={1.5} className="text-[#a0e8d9] mb-2" />
                <div className="text-[4rem] leading-none font-medium text-white mb-2 tracking-tight">95%</div>
                <div className="text-white/70 text-sm mb-4">Trust Score</div>
                <div className="px-5 py-1.5 rounded-full bg-[#adebdd] text-[#134e4a] text-xs font-bold w-fit">
                  Excellent
                </div>
              </div>

              <div className="absolute -top-4 right-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-[#134e4a]">
                <Zap size={18} />
              </div>
              <div className="absolute bottom-4 left-4 w-10 h-10 bg-[#adebdd] rounded-full flex items-center justify-center shadow-lg text-[#134e4a]">
                <ShieldCheck size={18} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Base Footer (Added to complete layout cleanly) */}
      <footer className="bg-white py-8 border-t border-slate-100 text-center px-6">
        <p className="text-sm font-medium text-slate-400">© 2026 ChitX Platform. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
