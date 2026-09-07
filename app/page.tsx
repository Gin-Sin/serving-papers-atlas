import { ArrowRight, BookOpen, Cpu, Database, Network, Orbit, Waves } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { StaticPageLink } from '@/components/static-page-link';
import { articles, stages } from '@/lib/articles';

const mapColumns = [
  { label: '输入约束', icon: Orbit, items: ['模型架构', '流量形态', '硬件互联', 'TTFT / TPOT'] },
  { label: '运行时调度', icon: Cpu, items: ['Continuous Batch', 'Token Budget', 'Chunked Prefill', 'Spec Decode'] },
  { label: '状态管理', icon: Database, items: ['Paged KV', 'Radix Cache', 'Hierarchical KV', 'Distributed KV'] },
  { label: '并行拓扑', icon: Network, items: ['TP · PP', 'DP Attention', 'Wide-EP', 'P/D · DCP'] },
  { label: '生产结果', icon: Waves, items: ['Goodput', 'Tail Latency', 'Capacity', 'Failure Radius'] },
];

export default function Home() {
  const orderedArticles = [...articles].sort((a, b) => Number(a.no) - Number(b.no));
  const questionCount = articles.reduce((total, article) => total + article.questions.length, 0);
  return (
    <main>
      <SiteHeader />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span />LMSYS × vLLM · CURATED FIELD NOTES</p>
          <h1>从模型结构，<br />推导 <em>Serving 拓扑。</em></h1>
          <p className="hero-lede">{articles.length} 篇前沿推理系统文章的章节化导读。沿着并行拓扑、调度执行与 KV 状态三条线，读懂每一个架构选择背后的瓶颈。</p>
          <div className="hero-actions">
            <a className="primary-action" href="#roadmap">开始阅读 <ArrowRight /></a>
            <a href="#map">先看知识地图</a>
          </div>
        </div>
        <aside className="field-card">
          <span>READING FIELD</span>
          <dl><div><dt>{articles.length}</dt><dd>核心文章</dd></div><div><dt>{String(stages.length).padStart(2, '0')}</dt><dd>学习阶段</dd></div><div><dt>{questionCount}</dt><dd>深度问题</dd></div></dl>
          <p>从 DeepSeek、Kimi K3 等前沿模型拓扑，延伸到 vLLM / SGLang 的 scheduler、KV cache 与 kernel 内核。</p>
        </aside>
      </section>

      <section className="map-section" id="map">
        <div className="section-heading"><span>01 / KNOWLEDGE MAP</span><h2>五层看清<br />Serving 决策链</h2><p>从 workload 进入调度与状态层，再决定并行拓扑，最终用线上 SLO 收束。</p></div>
        <div className="knowledge-map">
          {mapColumns.map((column, index) => {
            const Icon = column.icon;
            return <article key={column.label}><div className="map-index">0{index + 1}</div><Icon aria-hidden="true" /><h3>{column.label}</h3><ul>{column.items.map((item) => <li key={item}>{item}</li>)}</ul>{index < mapColumns.length - 1 ? <ArrowRight className="map-arrow" aria-hidden="true" /> : null}</article>;
          })}
        </div>
        <p className="map-caption">WORKLOAD <i /> SCHEDULING <i /> STATE <i /> TOPOLOGY <i /> SLO</p>
      </section>

      <section className="roadmap-section" id="roadmap">
        <div className="section-heading"><span>02 / READING ROADMAP</span><h2>五个阶段，<br />逐步加上复杂度</h2><p>每章保留原文结构、加入推导注解，并以开放题检查是否真正理解。</p></div>
        <div className="stage-list">
          {stages.map((stage) => {
            const stageArticles = orderedArticles.filter((article) => article.stageNo === stage.no);
            return <section className="stage" key={stage.no}>
              <header><span>{stage.no}</span><div><h3>{stage.title}</h3><p>{stage.caption}</p></div><small>{String(stageArticles.length).padStart(2, '0')} PAPERS</small></header>
              {stageArticles.length ? <div className="article-list">{stageArticles.map((article) => <StaticPageLink className="article-row" href={`/serving-papers-atlas/articles/${article.slug}/`} key={article.slug}>
                <span className="paper-no">{article.no}</span><div className="paper-title"><div><b>{article.source}</b><span>{article.date}</span><span>{article.difficulty}</span></div><h4>{article.shortTitle}</h4><p>{article.dek}</p></div><div className="paper-tags">{article.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div><span className="read-link"><BookOpen />阅读</span>
              </StaticPageLink>)}</div> : <div className="stage-coming">更多精选文章正在写入这一阶段。</div>}
            </section>;
          })}
        </div>
      </section>

      <section className="copyright-note"><strong>关于原文</strong><p>本站提供章节化导读、原创注解与理解题，不重新托管受版权保护的全文。每章均保留醒目的官方原文入口，建议与原文并排阅读。</p></section>
    </main>
  );
}
