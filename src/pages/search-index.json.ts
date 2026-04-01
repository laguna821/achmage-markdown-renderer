import {loadHomeSearchPayload} from '../lib/content/home-search-index';

export const prerender = true;

export const GET = () =>
  new Response(JSON.stringify(loadHomeSearchPayload()), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
