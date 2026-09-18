import {
  onRequestOptions as handleOptions,
  onRequestPost as handlePost,
} from './api/campaign-signatures.js';

export const onRequestOptions = (context) => handleOptions(context);
export const onRequestPost = (context) => handlePost(context);
