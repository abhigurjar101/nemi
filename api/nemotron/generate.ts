export const config = {
  runtime: 'edge',
}

import chatHandler from '../chat'

export default function handler(req: Request) {
  return chatHandler(req)
}
