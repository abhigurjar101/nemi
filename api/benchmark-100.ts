import type { IncomingMessage, ServerResponse } from 'http'
import {
  WORLDS_HARDEST_100_PROBLEMS,
  runFull100Benchmark,
  getProblemById,
  getProblemsByCategory,
} from '../n8n'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
  const problemId = url.searchParams.get('id')
  const category = url.searchParams.get('category')
  const runLive = url.searchParams.get('run') === 'true' || req.method === 'POST'

  if (problemId) {
    const problem = getProblemById(Number(problemId))
    if (!problem) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: `Problem ${problemId} not found` }))
      return
    }
    res.statusCode = 200
    res.end(JSON.stringify({ problem }))
    return
  }

  if (category) {
    const filtered = getProblemsByCategory(category as any)
    res.statusCode = 200
    res.end(JSON.stringify({ category, total: filtered.length, problems: filtered }))
    return
  }

  if (runLive) {
    const benchmark = runFull100Benchmark()
    res.statusCode = 200
    res.end(JSON.stringify({ success: true, ...benchmark }))
    return
  }

  // Default: Return summary of catalog
  res.statusCode = 200
  res.end(
    JSON.stringify({
      title: "World's Hardest 100 Coding Problems — NEMI Neural Benchmark",
      totalProblems: WORLDS_HARDEST_100_PROBLEMS.length,
      categories: [
        'Advanced Competitive & IOI/ICPC (25 Problems)',
        'LeetCode Apex Hard (25 Problems)',
        'Distributed Systems & Concurrency (25 Problems)',
        'AI/ML & Deep Neural Mechanics (25 Problems)',
      ],
      mandates: '100% complete, maximum parsimony, zero trivial comments, optimal theoretical complexity',
      queryHelp: 'Pass ?run=true or POST to execute full live benchmark, or ?id=1..100 for specific problem',
    })
  )
}
