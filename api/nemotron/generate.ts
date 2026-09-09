import type { IncomingMessage, ServerResponse } from 'http'
import chatHandler from '../chat'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return chatHandler(req, res)
}
