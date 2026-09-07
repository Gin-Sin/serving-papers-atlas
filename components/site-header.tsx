import Link from 'next/link';
import { BookOpenText } from 'lucide-react';

export function SiteHeader({ article = false }: { article?: boolean }) {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="回到首页">
        <span className="wordmark-icon"><BookOpenText aria-hidden="true" /></span>
        <span><strong>Serving Papers</strong><small>MODEL → TOPOLOGY → SLO</small></span>
      </Link>
      <nav aria-label="主导航">
        <Link href="/#map">知识地图</Link>
        <Link href="/#roadmap">阅读路线</Link>
        {article ? <Link className="active" href="/#roadmap">文章</Link> : null}
      </nav>
      <span className="edition">15 篇 · 2025—2026</span>
    </header>
  );
}
