import {buildHomeSearchPayload} from './home-search';
import {loadSourceDocuments} from './source';

export const loadHomeSearchPayload = () => buildHomeSearchPayload(loadSourceDocuments());
