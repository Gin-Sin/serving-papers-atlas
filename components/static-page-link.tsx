import type { AnchorHTMLAttributes } from 'react';

type StaticPageLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

/** Uses a full document navigation so links also work on static GitHub Pages. */
export function StaticPageLink({ href, children, ...props }: StaticPageLinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
