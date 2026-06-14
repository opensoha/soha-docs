import { getPageMap } from 'nextra/page-map'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { type Locale, isLocale, locales, withLocale } from '../i18n'
import { SiteThemeLayout } from '../theme-layout'

type PageProps = {
  params: Promise<{
    locale: string
  }>
}

const homeCopy = {
  zh: {
    kicker: 'OpenSoha Documentation',
    title: '面向平台团队的开源控制平面',
    lead:
      'OpenSoha 是开源、自托管、可审计的平台控制平面。它把 Kubernetes 多集群管理、应用交付、AI Gateway、MCP / Skills 和 Agent Runtime 收敛到一套统一的身份、策略、审批和审计模型里。',
    primaryAction: '开始阅读文档',
    secondaryAction: 'API 与 Contracts',
    signalLabel: 'OpenSoha focus areas',
    panelLabel: 'OpenSoha governed request flow',
    guarded: 'self-hosted',
    consoleStatus: 'principal checked · policy matched · audit written',
    connectsKicker: 'What OpenSoha connects',
    connectsTitle: '不是资源浏览器，而是一条平台治理链路',
    connectsBody:
      '文档首页先从能力边界开始：OpenSoha 负责把平台资源、发布动作、Agent 工具调用和运行证据放在同一套控制面里。',
    scenariosKicker: 'When to use it',
    scenariosTitle: '适合先落地的场景',
    startingPointsLabel: 'OpenSoha starting points',
    signals: [
      ['Kubernetes', '多集群与运行时'],
      ['Delivery', '应用交付闭环'],
      ['AI Gateway', '工具调用治理'],
    ],
    governanceSteps: [
      ['Identity', '用户、Agent 与 CLI 请求进入统一身份上下文。'],
      ['Policy', 'RBAC、scope grant、risk policy 在执行前完成判定。'],
      ['Approval', '高风险动作进入审批流，低风险动作直接写入证据。'],
      ['Audit', '调用结果、变更证据和操作上下文可回放。'],
    ],
    capabilities: [
      ['平台资源治理', '把 Kubernetes 集群、命名空间、工作负载、运行环境和访问范围组织在同一套平台模型里。'],
      ['应用交付证据', '围绕应用、环境、发布包、执行任务和回调结果建立可追踪的交付链路。'],
      ['AI Gateway 管控', '在工具调用前完成权限、授权、策略、审批和脱敏，并在调用后记录审计。'],
      ['MCP / Skills 扩展', '通过 MCP presets、Skills、Connectors 和 Agent profiles 扩展平台能力，同时保留清晰边界。'],
    ],
    docRoutes: [
      ['自托管部署', '/docs/self-hosted', '先把 OpenSoha 作为自己的平台控制平面跑起来。'],
      ['第一次交付', '/docs/tutorials/first-delivery', '从应用、环境到发布任务，串起交付闭环。'],
      ['接入 AI Gateway', '/docs/tutorials/first-ai-gateway-mcp', '把 Agent 工具调用纳入权限、策略和审计模型。'],
      ['API 与 Contracts', '/docs/api/contracts', '查看 OpenAPI、DTO 和兼容性约束。'],
    ],
    scenarios: [
      '平台团队需要把多集群、交付、权限和审计统一到一个操作面。',
      'AI Agent 已经开始操作基础设施，需要把工具调用纳入可治理边界。',
      '团队希望自托管平台控制面，并保留清晰的运行证据与发布记录。',
    ],
  },
  en: {
    kicker: 'OpenSoha Documentation',
    title: 'An open control plane for platform teams',
    lead:
      'OpenSoha is an open-source, self-hosted, auditable control plane. It brings Kubernetes multi-cluster operations, application delivery, AI Gateway, MCP / Skills, and Agent Runtime into one identity, policy, approval, and audit model.',
    primaryAction: 'Read the docs',
    secondaryAction: 'API and Contracts',
    signalLabel: 'OpenSoha focus areas',
    panelLabel: 'OpenSoha governed request flow',
    guarded: 'self-hosted',
    consoleStatus: 'principal checked · policy matched · audit written',
    connectsKicker: 'What OpenSoha connects',
    connectsTitle: 'Not a resource browser, but a platform governance path',
    connectsBody:
      'The docs start with boundaries: OpenSoha connects platform resources, release actions, Agent tool calls, and runtime evidence inside one governed control plane.',
    scenariosKicker: 'When to use it',
    scenariosTitle: 'Good first landing scenarios',
    startingPointsLabel: 'OpenSoha starting points',
    signals: [
      ['Kubernetes', 'Multi-cluster runtime'],
      ['Delivery', 'Application delivery loop'],
      ['AI Gateway', 'Tool-call governance'],
    ],
    governanceSteps: [
      ['Identity', 'User, Agent, and CLI requests enter one identity context.'],
      ['Policy', 'RBAC, scope grants, and risk policies are evaluated before execution.'],
      ['Approval', 'High-risk actions enter approval, while low-risk actions record evidence directly.'],
      ['Audit', 'Invocation results, change evidence, and operation context can be reviewed later.'],
    ],
    capabilities: [
      ['Platform resource governance', 'Organize Kubernetes clusters, namespaces, workloads, runtime environments, and access scopes in one platform model.'],
      ['Delivery evidence', 'Build a traceable delivery path around applications, environments, release bundles, execution tasks, and callbacks.'],
      ['AI Gateway control', 'Apply permission, grant, policy, approval, and redaction before tool calls, then write audit records after execution.'],
      ['MCP / Skills extension', 'Extend the platform through MCP presets, Skills, Connectors, and Agent profiles while keeping explicit boundaries.'],
    ],
    docRoutes: [
      ['Self-hosted setup', '/docs/self-hosted', 'Run OpenSoha as your own platform control plane first.'],
      ['First delivery', '/docs/tutorials/first-delivery', 'Connect applications, environments, and release tasks into a delivery loop.'],
      ['AI Gateway onboarding', '/docs/tutorials/first-ai-gateway-mcp', 'Bring Agent tool calls into permission, policy, and audit controls.'],
      ['API and Contracts', '/docs/api/contracts', 'Review OpenAPI, DTOs, and compatibility constraints.'],
    ],
    scenarios: [
      'Platform teams need one operation surface for multi-cluster operations, delivery, permissions, and audit.',
      'AI Agents have started operating infrastructure and need governed tool-call boundaries.',
      'Teams want a self-hosted platform control plane with clear runtime evidence and release records.',
    ],
  },
} satisfies Record<Locale, {
  capabilities: [string, string][]
  connectsBody: string
  connectsKicker: string
  connectsTitle: string
  consoleStatus: string
  docRoutes: [string, string, string][]
  governanceSteps: [string, string][]
  guarded: string
  kicker: string
  lead: string
  panelLabel: string
  primaryAction: string
  scenarios: string[]
  scenariosKicker: string
  scenariosTitle: string
  secondaryAction: string
  signalLabel: string
  signals: [string, string][]
  startingPointsLabel: string
  title: string
}>

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function HomePage({ params }: PageProps) {
  const { locale: rawLocale } = await params
  if (!isLocale(rawLocale)) {
    notFound()
  }

  const locale = rawLocale
  const copy = homeCopy[locale]

  return (
    <SiteThemeLayout locale={locale} pageMap={await getPageMap(`/${locale}/docs`)}>
      <main className="home-shell">
        <section className="home-hero">
          <div className="home-copy">
            <p className="home-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p className="home-lead">{copy.lead}</p>
            <div className="home-signals" aria-label={copy.signalLabel}>
              {copy.signals.map(([label, value]) => (
                <div className="home-signal" key={label}>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <div className="home-actions">
              <Link className="home-primary" href={withLocale(locale, '/docs')}>
                {copy.primaryAction}
              </Link>
              <Link className="home-secondary" href={withLocale(locale, '/docs/api/contracts')}>
                {copy.secondaryAction}
              </Link>
            </div>
          </div>

          <aside className="home-panel" aria-label={copy.panelLabel}>
            <div className="home-panel-top">
              <span>Governed request</span>
              <strong>{copy.guarded}</strong>
            </div>
            <div className="home-flow">
              {copy.governanceSteps.map(([title, body], index) => (
                <article className="home-flow-row" key={title}>
                  <span className="home-flow-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h2>{title}</h2>
                    <p>{body}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="home-console">
              <span>$ soha tool call cluster.list</span>
              <span>{copy.consoleStatus}</span>
            </div>
          </aside>
        </section>

        <section className="home-band" aria-labelledby="home-capabilities-title">
          <div className="home-section-heading">
            <p className="home-kicker">{copy.connectsKicker}</p>
            <h2 id="home-capabilities-title">{copy.connectsTitle}</h2>
            <p>{copy.connectsBody}</p>
          </div>
          <div className="home-capability-grid">
            {copy.capabilities.map(([title, body]) => (
              <article className="home-card" key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-split" aria-label={copy.startingPointsLabel}>
          <div className="home-surface">
            <p className="home-kicker">{copy.scenariosKicker}</p>
            <h2>{copy.scenariosTitle}</h2>
            <ul className="home-scenario-list">
              {copy.scenarios.map((scenario) => (
                <li key={scenario}>{scenario}</li>
              ))}
            </ul>
          </div>

          <div className="home-route-grid">
            {copy.docRoutes.map(([title, href, body]) => (
              <Link className="home-route-card" href={withLocale(locale, href)} key={title}>
                <span>{title}</span>
                <p>{body}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </SiteThemeLayout>
  )
}
