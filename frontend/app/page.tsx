'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Phone, Users, ArrowRight, Shield, Brain, CheckCircle, Wifi
} from 'lucide-react'
import MainButton from '@/components/ui/MainButton'
import BlurTextReveal from '@/components/ui/BlurTextReveal'
import InputField from '@/components/ui/InputField'
import { useNotification } from '@/components/ui/NotificationProvider'

export default function Home() {
  const router = useRouter()
  const [callerName, setCallerName] = useState('')
  const [agentName, setAgentName] = useState('')
  const [isDemoPlaying, setIsDemoPlaying] = useState(false)
  const { success, warning, info } = useNotification()

  const handleJoinAsCaller = () => {
    if (!callerName.trim()) {
      warning('Name Required', 'Please enter your name to continue')
      return
    }
    success('Joining as Caller', `Welcome ${callerName}!`)
    router.push(`/caller?name=${encodeURIComponent(callerName)}`)
  }

  const handleJoinAsAgent = () => {
    if (!agentName.trim()) {
      warning('Name Required', 'Please enter your name to continue')
      return
    }
    success('Joining as Agent', `Welcome ${agentName}!`)
    router.push(`/agent?name=${encodeURIComponent(agentName)}`)
  }

  const toggleDemo = () => {
    setIsDemoPlaying(!isDemoPlaying)
    if (!isDemoPlaying) {
      success('Demo Started', 'Interactive demo is now playing')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20">
          {/* Header */}
          <div className="text-center mb-20">
            <BlurTextReveal
              text="Warm Transfer System"
              fontSize="text-6xl"
              fontWeight="font-bold"
              color="text-white"
              className="mb-8"
            />
            <BlurTextReveal
              text="Professional AI-Powered Call Transfer Technology"
              fontSize="text-xl"
              color="text-zinc-300"
              className="mb-6"
              direction="up"
              stagger={0.02}
            />
            <BlurTextReveal
              text="Seamlessly transfer calls between agents with complete context preservation and real-time AI summaries"
              fontSize="text-lg"
              color="text-zinc-400"
              className="mb-8 max-w-3xl mx-auto"
              direction="up"
              stagger={0.02}
            />
          </div>

          {/* Quick Start Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {/* Caller Section */}
            <div className="bg-[#0D0D0D] border border-white/5 rounded-[20px] p-8 hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                  <Phone className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">
                  Join as Caller
                </h2>
                <p className="text-zinc-300 mb-6 text-sm">
                  Experience seamless call transfers with AI-powered context sharing
                </p>

                <div className="space-y-4">
                  <InputField
                    label="Your Name"
                    name="callerName"
                    type="text"
                    placeholder="Enter your name"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    required
                  />

                  <MainButton
                    name="Start Call"
                    variant="dark"
                    size="sm"
                    onClick={handleJoinAsCaller}
                  />
                </div>
              </div>
            </div>

            {/* Agent Section */}
            <div className="bg-[#0D0D0D] border border-white/5 rounded-[20px] p-8 hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">
                  Join as Agent
                </h2>
                <p className="text-zinc-300 mb-6 text-sm">
                  Handle calls and perform warm transfers with AI assistance
                </p>

                <div className="space-y-4">
                  <InputField
                    label="Agent Name"
                    name="agentName"
                    type="text"
                    placeholder="Enter agent name"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    required
                  />

                  <div className="space-y-2">
                    <MainButton
                      name="Join as Agent A"
                      variant="light"
                      size="sm"
                      onClick={handleJoinAsAgent}
                    />
                    <MainButton
                      name="Join as Agent B"
                      variant="dark"
                      size="sm"
                      onClick={() => router.push(`/agent-b?name=${encodeURIComponent(agentName)}`)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Key Features
            </h2>
            <p className="text-xl text-zinc-300 max-w-3xl mx-auto">
              Experience the future of call center technology with AI-powered transfers that preserve context and enhance customer experience
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="bg-[#0D0D0D] border border-white/5 rounded-[20px] p-8 hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                <ArrowRight className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="font-bold text-white mb-3">Smart Transfers</h4>
              <p className="text-zinc-300 text-sm">
                Seamless handoffs with complete context preservation between agents
              </p>
            </div>

            <div className="bg-[#0D0D0D] border border-white/5 rounded-[20px] p-8 hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                <Brain className="w-5 h-5 text-green-400" />
              </div>
              <h4 className="font-bold text-white mb-3">AI Summaries</h4>
              <p className="text-zinc-300 text-sm">
                Real-time conversation analysis and intelligent context generation
              </p>
            </div>

            <div className="bg-[#0D0D0D] border border-white/5 rounded-[20px] p-8 hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="font-bold text-white mb-3">Enterprise Security</h4>
              <p className="text-zinc-300 text-sm">
                Bank-grade security with end-to-end encryption and compliance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              How It Works
            </h2>
            <p className="text-xl text-zinc-300 max-w-3xl mx-auto">
              Experience the seamless flow of our AI-powered warm transfer system
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                <Phone className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">1. Call Initiation</h3>
              <p className="text-sm text-zinc-400">Customer connects with initial agent</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                <Brain className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">2. AI Analysis</h3>
              <p className="text-sm text-zinc-400">Real-time conversation analysis</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4">
                <ArrowRight className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">3. Smart Transfer</h3>
              <p className="text-sm text-zinc-400">Seamless handoff with context</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-4">
                <CheckCircle className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">4. Resolution</h3>
              <p className="text-sm text-zinc-400">Complete customer satisfaction</p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Section */}
      <div className="py-20 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              See It In Action
            </h2>
            <p className="text-xl text-zinc-300 max-w-3xl mx-auto mb-8">
              Experience our warm transfer system with this interactive demo
            </p>

            <div className="bg-[#0D0D0D] border border-white/5 rounded-[20px] p-8 max-w-2xl mx-auto hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
              </div>

              <div className="bg-[#0D0D0D] rounded-[10px] p-4 mb-6 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Customer Call</p>
                    <p className="text-zinc-400 text-xs">Connecting to agent...</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <p className="text-zinc-300 text-xs">AI analyzing conversation...</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <p className="text-zinc-300 text-xs">Generating context summary...</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    <p className="text-zinc-300 text-xs">Preparing warm transfer...</p>
                  </div>
                </div>
              </div>

              <MainButton
                name={isDemoPlaying ? 'Pause Demo' : 'Start Interactive Demo'}
                variant="dark"
                size="sm"
                onClick={toggleDemo}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-16 border-t border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Warm Transfer System</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Revolutionary AI-powered call transfer technology for modern call centers.
              </p>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-zinc-700/50 border border-zinc-600/30 rounded-lg flex items-center justify-center hover:bg-zinc-600/50 transition-colors">
                  <Wifi className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="w-8 h-8 bg-zinc-700/50 border border-zinc-600/30 rounded-lg flex items-center justify-center hover:bg-zinc-600/50 transition-colors">
                  <Brain className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="w-8 h-8 bg-zinc-700/50 border border-zinc-600/30 rounded-lg flex items-center justify-center hover:bg-zinc-600/50 transition-colors">
                  <Shield className="w-4 h-4 text-zinc-300" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>Smart Warm Transfers</li>
                <li>AI-Powered Summaries</li>
                <li>Real-time Analytics</li>
                <li>Enterprise Security</li>
                <li>WebRTC Technology</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Technology</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>LiveKit Real-time</li>
                <li>Next.js Framework</li>
                <li>LLM Integration</li>
                <li>WebRTC Audio</li>
                <li>Framer Motion</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Get Started</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Ready to revolutionize your call center?
              </p>
              <MainButton
                name="Try Demo Now"
                variant="light"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              />
            </div>
          </div>

          <div className="border-t border-zinc-800/60 pt-8 text-center">
            <p className="text-zinc-500 text-sm">
              © 2025 Warm Transfer System. Built with LiveKit and AI technology.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
