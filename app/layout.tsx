import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://gin-sin.github.io/serving-papers-atlas';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: { icon: `${siteUrl}/favicon.svg` },
  title: 'Serving Papers · 前沿模型推理系统阅读地图',
  description: 'LMSYS 与 vLLM 精选文章的混合并行、P/D 分离和前沿模型 Serving 深度导读。',
  openGraph: {
    title: 'Serving Papers · 前沿模型推理系统阅读地图',
    description: '从模型结构推导 Serving 拓扑：15 篇 LMSYS 与 vLLM 深度导读。',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: `${siteUrl}/og.png`, width: 1730, height: 909, alt: 'Serving Papers 阅读地图' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Serving Papers · 前沿模型推理系统阅读地图',
    description: '从模型结构推导 Serving 拓扑：15 篇 LMSYS 与 vLLM 深度导读。',
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
