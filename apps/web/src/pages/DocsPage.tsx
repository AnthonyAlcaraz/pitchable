import { Link } from 'react-router-dom';
import { ArrowLeft, Key, Code, Cpu, CreditCard, Zap, Shield } from 'lucide-react';

export function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-gray-100">
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Pitchable
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold">Developer Documentation</h1>
        <p className="mb-12 text-gray-400">
          Programmatic access to Pitchable via REST API and MCP (Model Context Protocol)
        </p>

        {/* Authentication */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-semibold">Authentication</h2>
          </div>
          <p className="mb-4 text-sm text-gray-400">
            All API requests require an API key. Create one in{' '}
            <Link to="/settings/api-keys" className="text-blue-400 hover:underline">Settings &rarr; API Keys</Link>.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-sm">
{`# Via x-api-key header (recommended)
curl -H "x-api-key: pk_your_key_here" \\
  https://app.pitchable.ai/api/v1/presentations

# Via Authorization header
curl -H "Authorization: Bearer pk_your_key_here" \\
  https://app.pitchable.ai/api/v1/presentations`}
          </pre>
        </section>

        {/* REST API */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Code className="h-5 w-5 text-green-400" />
            <h2 className="text-xl font-semibold">REST API</h2>
          </div>
          <p className="mb-4 text-sm text-gray-400">Base URL: <code className="text-gray-300">https://app.pitchable.ai/api/v1</code></p>

          <div className="space-y-3">
            {[
              { method: 'GET', path: '/presentations', scope: 'presentations:read', desc: 'List all presentations' },
              { method: 'GET', path: '/presentations/:id', scope: 'presentations:read', desc: 'Get presentation with slides' },
              { method: 'POST', path: '/generate', scope: 'generation', desc: 'Generate a full presentation' },
              { method: 'DELETE', path: '/presentations/:id', scope: 'presentations:write', desc: 'Delete a presentation' },
              { method: 'POST', path: '/presentations/:id/fork', scope: 'presentations:write', desc: 'Fork with context swap' },
              { method: 'POST', path: '/presentations/:id/export', scope: 'export', desc: 'Export to PPTX/PDF/HTML' },
              { method: 'GET', path: '/briefs', scope: 'presentations:read', desc: 'List Pitch Briefs' },
              { method: 'GET', path: '/lenses', scope: 'presentations:read', desc: 'List Pitch Lenses' },
              { method: 'GET', path: '/credits/balance', scope: 'presentations:read', desc: 'Check credit balance' },
            ].map((ep) => (
              <div key={ep.path + ep.method} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                <span className={`w-16 rounded text-center text-xs font-bold ${ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : ep.method === 'POST' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {ep.method}
                </span>
                <code className="flex-1 text-sm text-gray-300">{ep.path}</code>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">{ep.scope}</span>
                <span className="text-xs text-gray-500">{ep.desc}</span>
              </div>
            ))}
          </div>

          {/* Generate example */}
          <h3 className="mb-2 mt-8 text-lg font-semibold">Generate a Presentation</h3>
          <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-sm">
{`curl -X POST https://app.pitchable.ai/api/v1/generate \\
  -H "x-api-key: pk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "AI-powered supply chain optimization for enterprise",
    "presentationType": "VC_PITCH",
    "briefId": "uuid-of-your-brief",
    "pitchLensId": "uuid-of-your-lens"
  }'`}
          </pre>
        </section>

        {/* MCP */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold">MCP (Model Context Protocol)</h2>
          </div>
          <p className="mb-4 text-sm text-gray-400">
            Connect Pitchable to any AI agent that supports MCP — Claude Code, Cursor, Windsurf, and more.
          </p>

          <h3 className="mb-2 text-base font-semibold">Claude Code</h3>
          <p className="mb-2 text-xs text-gray-400">Add to <code>.claude/mcp.json</code>:</p>
          <pre className="mb-6 overflow-x-auto rounded-lg bg-black/40 p-4 text-sm">
{`{
  "mcpServers": {
    "pitchable": {
      "type": "streamable-http",
      "url": "https://app.pitchable.ai/mcp",
      "headers": {
        "x-api-key": "pk_your_key_here"
      }
    }
  }
}`}
          </pre>

          <h3 className="mb-2 text-base font-semibold">Cursor</h3>
          <p className="mb-2 text-xs text-gray-400">Add to <code>.cursor/mcp.json</code>:</p>
          <pre className="mb-6 overflow-x-auto rounded-lg bg-black/40 p-4 text-sm">
{`{
  "mcpServers": {
    "pitchable": {
      "url": "https://app.pitchable.ai/mcp",
      "transport": "streamable-http",
      "headers": {
        "x-api-key": "pk_your_key_here"
      }
    }
  }
}`}
          </pre>

          <h3 className="mb-2 text-base font-semibold">Available Tools</h3>
          <div className="space-y-2">
            {[
              { name: 'generate_presentation', desc: 'Generate a complete narrative deck from topic (3 credits)', icon: String.fromCodePoint(0x1F3AF) },
              { name: 'list_presentations', desc: 'List your presentations with metadata', icon: String.fromCodePoint(0x1F4CB) },
              { name: 'get_presentation', desc: 'Get a presentation with all slides and speaker notes', icon: String.fromCodePoint(0x1F4CA) },
              { name: 'fork_presentation', desc: 'Fork with optional Brief/Lens swap', icon: String.fromCodePoint(0x1F500) },
              { name: 'export_presentation', desc: 'Export to PPTX, PDF, or Reveal.js HTML', icon: String.fromCodePoint(0x1F4E6) },
              { name: 'list_briefs', desc: 'List your Pitch Briefs (knowledge collections)', icon: String.fromCodePoint(0x1F4DA) },
              { name: 'list_lenses', desc: 'List your Pitch Lenses (strategy profiles)', icon: String.fromCodePoint(0x1F50D) },
              { name: 'check_credits', desc: 'Check credit balance and cost table', icon: String.fromCodePoint(0x1F4B3) },
            ].map((tool) => (
              <div key={tool.name} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                <span className="text-lg">{tool.icon}</span>
                <code className="text-sm font-medium text-purple-300">{tool.name}</code>
                <span className="text-xs text-gray-400">{tool.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Credits */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-yellow-400" />
            <h2 className="text-xl font-semibold">Credit Costs</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-400">Operation</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-400">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr><td className="px-4 py-2">Presentation generation</td><td className="px-4 py-2 text-right font-mono">3 credits</td></tr>
                <tr><td className="px-4 py-2">Image generation (per image)</td><td className="px-4 py-2 text-right font-mono">1 credit</td></tr>
                <tr><td className="px-4 py-2">Export (PPTX, PDF, HTML)</td><td className="px-4 py-2 text-right font-mono">Free</td></tr>
                <tr><td className="px-4 py-2">List / Get / Fork</td><td className="px-4 py-2 text-right font-mono">Free</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-semibold">Rate Limits</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-400">Tier</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-400">Requests / min</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr><td className="px-4 py-2">Free</td><td className="px-4 py-2 text-right font-mono">20</td></tr>
                <tr><td className="px-4 py-2">Starter</td><td className="px-4 py-2 text-right font-mono">60</td></tr>
                <tr><td className="px-4 py-2">Pro</td><td className="px-4 py-2 text-right font-mono">120</td></tr>
                <tr><td className="px-4 py-2">Enterprise</td><td className="px-4 py-2 text-right font-mono">300</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Scopes */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-semibold">Scopes Reference</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-400">Scope</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-400">Allows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr><td className="px-4 py-2 font-mono text-cyan-300">presentations:read</td><td className="px-4 py-2">List/get presentations, briefs, lenses, credits</td></tr>
                <tr><td className="px-4 py-2 font-mono text-cyan-300">presentations:write</td><td className="px-4 py-2">Create, delete, fork presentations</td></tr>
                <tr><td className="px-4 py-2 font-mono text-cyan-300">generation</td><td className="px-4 py-2">Generate presentations (costs credits)</td></tr>
                <tr><td className="px-4 py-2 font-mono text-cyan-300">export</td><td className="px-4 py-2">Export to PPTX, PDF, Reveal.js HTML</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DocsPage;
