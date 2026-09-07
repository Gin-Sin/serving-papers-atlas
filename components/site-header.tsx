import { BookOpenText } from 'lucide-react';
import { StaticPageLink } from '@/components/static-page-link';
import { articles } from '@/lib/articles';

export function SiteHeader({ article = false }: { article?: boolean }) {
  return (
    <header className="site-header">
      <StaticPageLink className="wordmark" href="/serving-papers-atlas/" aria-label="回到首页">
        <span className="wordmark-icon"><BookOpenText aria-hidden="true" /></span>
        <span><strong>Serving Papers</strong><small>MODEL → TOPOLOGY → SLO</small></span>
      </StaticPageLink>
      <nav aria-label="主导航">
        <StaticPageLink href="/serving-papers-atlas/#map">知识地图</StaticPageLink>
        <StaticPageLink href="/serving-papers-atlas/#roadmap">阅读路线</StaticPageLink>
        {article ? <StaticPageLink className="active" href="/serving-papers-atlas/#roadmap">文章</StaticPageLink> : null}
      </nav>
      <span className="edition">{articles.length} 篇 · 2024—2026</span>
    </header>
  );
}
