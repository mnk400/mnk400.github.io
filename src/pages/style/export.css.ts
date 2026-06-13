import type { APIRoute } from 'astro';
import { compile } from 'sass';
import { join } from 'node:path';

export const prerender = true;

export const GET: APIRoute = () => {
  const source = join(process.cwd(), 'src/styles/export.scss');
  const result = compile(source, {
    style: 'compressed',
  });

  return new Response(result.css, {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
    },
  });
};
