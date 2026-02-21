import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Key, Code, Cpu, CreditCard, Zap, Shield } from 'lucide-react';

export function DocsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t('docs.back_to_pitchable')}
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold">{t('docs.title')}</h1>
        <p className="mb-12 text-muted-foreground">
          {t('docs.subtitle')}
        </p>

        {/* Authentication */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-semibold">{t('docs.auth_title')}</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('docs.auth_desc')}{' '}
            <Link to="/settings/api-keys" className="text-orange-400 hover:underline">{t('docs.auth_link')}</Link>.
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
            <h2 className="text-xl font-semibold">{t('docs.rest_api_title')}</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{t('docs.rest_api_base_url')} <code className="text-foreground/80">https://app.pitchable.ai/api/v1</code></p>

          <div className="space-y-3">
            {[
              { method: 'GET', path: '/presentations', scope: 'presentations:read', desc: t('docs.rest_api_endpoints.list_presentations') },
              { method: 'GET', path: '/presentations/:id', scope: 'presentations:read', desc: t('docs.rest_api_endpoints.get_presentation') },
              { method: 'POST', path: '/generate', scope: 'generation', desc: t('docs.rest_api_endpoints.generate') },
              { method: 'DELETE', path: '/presentations/:id', scope: 'presentations:write', desc: t('docs.rest_api_endpoints.delete_presentation') },
              { method: 'POST', path: '/presentations/:id/fork', scope: 'presentations:write', desc: t('docs.rest_api_endpoints.fork_presentation') },
              { method: 'POST', path: '/presentations/:id/export', scope: 'export', desc: t('docs.rest_api_endpoints.export_presentation') },
              { method: 'GET', path: '/briefs', scope: 'presentations:read', desc: t('docs.rest_api_endpoints.list_briefs') },
              { method: 'GET', path: '/lenses', scope: 'presentations:read', desc: t('docs.rest_api_endpoints.list_lenses') },
              { method: 'GET', path: '/credits/balance', scope: 'presentations:read', desc: t('docs.rest_api_endpoints.check_credits') },
            ].map((ep) => (
              <div key={ep.path + ep.method} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3">
                <span className={`w-16 rounded text-center text-xs font-bold ${ep.method === 'GET' ? 'bg-orange-500/20 text-orange-400' : ep.method === 'POST' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {ep.method}
                </span>
                <code className="flex-1 text-sm text-foreground/80">{ep.path}</code>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted-foreground">{ep.scope}</span>
                <span className="text-xs text-muted-foreground/70">{ep.desc}</span>
              </div>
            ))}
          </div>

          {/* Generate example */}
          <h3 className="mb-2 mt-8 text-lg font-semibold">{t('docs.generate_title')}</h3>
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
            <h2 className="text-xl font-semibold">{t('docs.mcp_title')}</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('docs.mcp_desc')}
          </p>

          <h3 className="mb-2 text-base font-semibold">{t('docs.mcp_claude_code')}</h3>
          <p className="mb-2 text-xs text-muted-foreground">Add to <code>.claude/mcp.json</code>:</p>
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

          <h3 className="mb-2 text-base font-semibold">{t('docs.mcp_cursor')}</h3>
          <p className="mb-2 text-xs text-muted-foreground">Add to <code>.cursor/mcp.json</code>:</p>
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

          <h3 className="mb-2 text-base font-semibold">{t('docs.mcp_available_tools')}</h3>
          <div className="space-y-2">
            {[
              { name: 'generate_presentation', desc: t('docs.mcp_tools.generate_presentation'), icon: String.fromCodePoint(0x1F3AF) },
              { name: 'list_presentations', desc: t('docs.mcp_tools.list_presentations'), icon: String.fromCodePoint(0x1F4CB) },
              { name: 'get_presentation', desc: t('docs.mcp_tools.get_presentation'), icon: String.fromCodePoint(0x1F4CA) },
              { name: 'fork_presentation', desc: t('docs.mcp_tools.fork_presentation'), icon: String.fromCodePoint(0x1F500) },
              { name: 'export_presentation', desc: t('docs.mcp_tools.export_presentation'), icon: String.fromCodePoint(0x1F4E6) },
              { name: 'list_briefs', desc: t('docs.mcp_tools.list_briefs'), icon: String.fromCodePoint(0x1F4DA) },
              { name: 'list_lenses', desc: t('docs.mcp_tools.list_lenses'), icon: String.fromCodePoint(0x1F50D) },
              { name: 'check_credits', desc: t('docs.mcp_tools.check_credits'), icon: String.fromCodePoint(0x1F4B3) },
            ].map((tool) => (
              <div key={tool.name} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3">
                <span className="text-lg">{tool.icon}</span>
                <code className="text-sm font-medium text-purple-300">{tool.name}</code>
                <span className="text-xs text-muted-foreground">{tool.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Credits */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-yellow-400" />
            <h2 className="text-xl font-semibold">{t('docs.credits_title')}</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('docs.credits_table.operation')}</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('docs.credits_table.cost')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-2">{t('docs.credits_table.presentation_generation')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.credits_table.presentation_generation_cost')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.credits_table.image_generation')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.credits_table.image_generation_cost')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.credits_table.document_ingestion')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.credits_table.document_ingestion_cost')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.credits_table.entity_extraction')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.credits_table.entity_extraction_cost')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.credits_table.chat_message')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.credits_table.chat_message_cost')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.credits_table.website_crawl')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.credits_table.website_crawl_cost')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.credits_table.export')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.credits_table.export_cost')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.credits_table.list_get_fork')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.credits_table.list_get_fork_cost')}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-semibold">{t('docs.rate_limits_title')}</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('docs.rate_limits_table.tier')}</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('docs.rate_limits_table.requests_per_min')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-2">{t('docs.rate_limits_table.free')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.rate_limits_table.free_limit')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.rate_limits_table.starter')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.rate_limits_table.starter_limit')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.rate_limits_table.pro')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.rate_limits_table.pro_limit')}</td></tr>
                <tr><td className="px-4 py-2">{t('docs.rate_limits_table.enterprise')}</td><td className="px-4 py-2 text-right font-mono">{t('docs.rate_limits_table.enterprise_limit')}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Scopes */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-semibold">{t('docs.scopes_title')}</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('docs.scopes_table.scope')}</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('docs.scopes_table.allows')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-2 font-mono text-orange-300">presentations:read</td><td className="px-4 py-2">{t('docs.scopes_table.presentations_read')}</td></tr>
                <tr><td className="px-4 py-2 font-mono text-orange-300">presentations:write</td><td className="px-4 py-2">{t('docs.scopes_table.presentations_write')}</td></tr>
                <tr><td className="px-4 py-2 font-mono text-orange-300">generation</td><td className="px-4 py-2">{t('docs.scopes_table.generation')}</td></tr>
                <tr><td className="px-4 py-2 font-mono text-orange-300">export</td><td className="px-4 py-2">{t('docs.scopes_table.export')}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DocsPage;
