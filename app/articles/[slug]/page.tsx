import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ExternalLink, Lightbulb, Route, Target } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { articles, getArticle } from '@/lib/articles';

type PageProps = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return articles.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = getArticle((await params).slug);
  return article ? {
    title: `${article.shortTitle} · Serving Papers`,
    description: article.dek,
    openGraph: { title: article.shortTitle, description: article.dek, images: [] },
    twitter: { card: 'summary', title: article.shortTitle, description: article.dek, images: [] },
  } : {};
}

export default async function ArticlePage({ params }: PageProps) {
  const article = getArticle((await params).slug); if (!article) notFound();
  const orderedArticles = [...articles].sort((a, b) => Number(a.no) - Number(b.no));
  const index = orderedArticles.findIndex((item) => item.slug === article.slug); const previous = orderedArticles[index - 1]; const next = orderedArticles[index + 1];
  return <main className="reading-page"><SiteHeader article />
    <header className="reading-hero"><Link className="back-link" href="/#roadmap"><ArrowLeft />返回路线图</Link><div className="reading-meta"><span>PAPER {article.no}</span><span>{article.source}</span><span>{article.date}</span><span>{article.readTime}</span><span>{article.difficulty}</span></div><h1>{article.shortTitle}</h1><p>{article.dek}</p><p className="original-title">ORIGINAL · {article.title}</p><div className="topology-strip"><Route /><span>{article.topology}</span></div></header>
    <nav className="section-rail" aria-label="文章章节">{article.sections.map((section,index)=><Link key={section.title} href={`#section-${index+1}`}><span>0{index+1}</span>{section.title}</Link>)}</nav>
    <div className="reading-layout"><article className="reading-main">
      <section className="reading-thesis"><span>CORE THESIS</span><h2>{article.thesis}</h2><p>{article.why}</p></section>
      <section className="source-notice"><div><ExternalLink /><strong>建议先打开官方原文</strong><p>本站按原文论证顺序提供中文导读与注解，不重新托管全文。</p></div><a href={article.url} target="_blank" rel="noreferrer">阅读官方原文 <ArrowRight /></a></section>
      {article.sections.map((section,index)=><section className="reading-section" id={`section-${index+1}`} key={section.title}><div className="section-number">0{index+1}</div><div><span>ARGUMENT {String(index+1).padStart(2,'0')}</span><h2>{section.title}</h2><div className="source-summary">{section.summary.map(item=><p key={item}>{item}</p>)}</div><aside className="annotation"><Lightbulb /><div><strong>阅读注解</strong><p>{section.annotation}</p></div></aside><p className="takeaway"><Target />{section.takeaway}</p></div></section>)}
      <section className="quiz-section"><span>COMPREHENSION CHECK</span><h2>把结论重新推导一遍</h2><p className="quiz-intro">先独立作答，再展开提示或参考思路。设计题没有唯一答案，重点是能否明确约束、关键路径与验证方法。</p><div className="quiz-list">{article.questions.map((question,index)=><article key={question.prompt}><div><span>{String(index+1).padStart(2,'0')}</span><b>{question.level}</b></div><h3>{question.prompt}</h3><details><summary>查看提示</summary><p>{question.hint}</p></details><details><summary>参考推导</summary><p>{question.answer}</p></details></article>)}</div></section>
    </article><aside className="reading-aside"><span>本章关键词</span><div>{article.tags.map(tag=><Link key={tag} href="/#map">{tag}</Link>)}</div><p><strong>阅读方法</strong>每读完一节，尝试用“瓶颈 → 状态所有权 → 通信 → SLO”复述一次。</p><section className="related-reading"><strong>关联阅读</strong>{article.related.map(slug=>{const item=getArticle(slug);return item?<Link href={`/articles/${item.slug}`} key={slug}>{item.no} · {item.shortTitle}</Link>:null})}</section></aside></div>
    <nav className="paper-pagination">{previous?<Link href={`/articles/${previous.slug}`}><ArrowLeft /><span><small>上一篇 · {previous.no}</small>{previous.shortTitle}</span></Link>:<span/>}{next?<Link href={`/articles/${next.slug}`}><span><small>下一篇 · {next.no}</small>{next.shortTitle}</span><ArrowRight /></Link>:<Link href="/#roadmap"><span><small>完成本轮</small>返回路线图</span><ArrowRight /></Link>}</nav>
  </main>;
}
