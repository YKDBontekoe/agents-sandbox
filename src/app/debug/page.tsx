'use client'

import { useEffect, useState } from 'react'
import { publicConfig as config } from "@infrastructure/config"

interface EnvStatus {
  hasSupabaseUrl: boolean
  hasSupabaseServiceKey: boolean
  hasSupabaseJwtSecret: boolean
  hasPublicSupabaseUrl: boolean
  hasPublicSupabaseAnonKey: boolean
  hasOpenAiKey: boolean
  apiStatus: 'loading' | 'success' | 'error'
  apiError?: string
}

export default function DebugPage() {
  const [envStatus, setEnvStatus] = useState<EnvStatus>({
    hasSupabaseUrl: false,
    hasSupabaseServiceKey: false,
    hasSupabaseJwtSecret: false,
    hasPublicSupabaseUrl: false,
    hasPublicSupabaseAnonKey: false,
    hasOpenAiKey: false,
    apiStatus: 'loading'
  })

  useEffect(() => {
    // Check client-side environment variables
    const clientEnv = {
      hasPublicSupabaseUrl: !!config.nextPublicSupabaseUrl,
      hasPublicSupabaseAnonKey: !!config.nextPublicSupabaseAnonKey
    }

    // Check API status
    fetch('/api/debug')
      .then(res => res.json())
      .then(data => {
        setEnvStatus({
          ...clientEnv,
          hasSupabaseUrl: data.hasSupabaseUrl,
          hasSupabaseServiceKey: data.hasSupabaseServiceKey,
          hasSupabaseJwtSecret: data.hasSupabaseJwtSecret,
          hasOpenAiKey: data.hasOpenAiKey,
          apiStatus: 'success'
        })
      })
      .catch(error => {
        setEnvStatus({
          ...clientEnv,
          hasSupabaseUrl: false,
          hasSupabaseServiceKey: false,
          hasSupabaseJwtSecret: false,
          hasOpenAiKey: false,
          apiStatus: 'error',
          apiError: error.message
        })
      })
  }, [])

  const allConfigured = envStatus.hasSupabaseUrl && 
    envStatus.hasSupabaseServiceKey && 
    envStatus.hasSupabaseJwtSecret && 
    envStatus.hasPublicSupabaseUrl && 
    envStatus.hasPublicSupabaseAnonKey && 
    envStatus.hasOpenAiKey

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Environment Configuration Debug</h1>
        
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Overall Status</h2>
          <div className={`text-lg font-medium ${
            allConfigured ? 'text-green-400' : 'text-red-400'
          }`}>
            {allConfigured ? '✅ All environment variables configured' : '❌ Missing environment variables'}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Server Environment</h2>
            <div className="space-y-2">
              <EnvItem label="SUPABASE_URL" status={envStatus.hasSupabaseUrl} />
              <EnvItem label="SUPABASE_SERVICE_ROLE_KEY" status={envStatus.hasSupabaseServiceKey} />
              <EnvItem label="SUPABASE_JWT_SECRET" status={envStatus.hasSupabaseJwtSecret} />
              <EnvItem label="OPENAI_API_KEY" status={envStatus.hasOpenAiKey} />
            </div>
            {envStatus.apiStatus === 'error' && (
              <div className="mt-4 p-3 bg-red-900/50 rounded text-red-200 text-sm">
                API Error: {envStatus.apiError}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Client Environment</h2>
            <div className="space-y-2">
              <EnvItem label="NEXT_PUBLIC_SUPABASE_URL" status={envStatus.hasPublicSupabaseUrl} />
              <EnvItem label="NEXT_PUBLIC_SUPABASE_ANON_KEY" status={envStatus.hasPublicSupabaseAnonKey} />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Instructions</h2>
          <div className="text-gray-300 space-y-2">
            <p>If any environment variables are missing:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Check your Vercel project settings → Environment Variables</li>
              <li>Ensure all 6 required variables are set for Production environment</li>
              <li>Redeploy your application after adding missing variables</li>
              <li>For local development, create a <code className="bg-slate-700 px-1 rounded">.env.local</code> file</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/play" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Back to Game
          </a>
        </div>
      </div>
    </div>
  )
}

function EnvItem({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-300">{label}</span>
      <span className={`font-medium ${
        status ? 'text-green-400' : 'text-red-400'
      }`}>
        {status ? '✅ Set' : '❌ Missing'}
      </span>
    </div>
  )
}