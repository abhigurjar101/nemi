import type { IncomingMessage, ServerResponse } from 'http'
import { spawn } from 'child_process'

async function parseBody(req: IncomingMessage): Promise<any> {
  if ((req as any).body) {
    if (typeof (req as any).body === 'string') {
      try {
        return JSON.parse((req as any).body)
      } catch {
        return {}
      }
    }
    return (req as any).body
  }
  if ((req as any).readableEnded || !(req as any).readable) {
    return {}
  }
  return new Promise((resolve) => {
    let data = ''
    const timer = setTimeout(() => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    }, 1500)

    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      clearTimeout(timer)
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
    req.on('error', () => {
      clearTimeout(timer)
      resolve({})
    })
  })
}

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

  if (req.method === 'GET') {
    res.statusCode = 200
    res.end(
      JSON.stringify({
        ready: true,
        service: 'NEMI Jupyter Hub Bridge',
        version: '4.5',
        features: ['create_notebook', 'execute_code', 'colab_export'],
      })
    )
    return
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req)
      const { action, code, taskName, prompt } = body

      // Action: execute code in Python sandbox
      if (action === 'execute') {
        if (!code) {
          res.statusCode = 400
          res.end(JSON.stringify({ executed: false, error: 'No code provided' }))
          return
        }

        // Run python3 with a 5 second execution timeout
        const pythonProcess = spawn('python3', ['-c', code])
        let stdout = ''
        let stderr = ''

        const timeout = setTimeout(() => {
          try {
            pythonProcess.kill('SIGKILL')
          } catch {}
        }, 5000)

        pythonProcess.stdout.on('data', (chunk) => {
          stdout += chunk.toString()
        })
        pythonProcess.stderr.on('data', (chunk) => {
          stderr += chunk.toString()
        })

        pythonProcess.on('close', (exitCode) => {
          clearTimeout(timeout)
          res.statusCode = 200
          res.end(
            JSON.stringify({
              executed: true,
              success: exitCode === 0,
              output: stdout.trim() || stderr.trim(),
              exitCode,
              error: exitCode !== 0 ? stderr.trim() : undefined,
            })
          )
        })

        pythonProcess.on('error', (_err) => {
          clearTimeout(timeout)
          // Fallback if python3 is not in serverless path
          res.statusCode = 200
          res.end(
            JSON.stringify({
              executed: false,
              message: 'Local Python execution not available in serverless container; use Colab or client runner.',
            })
          )
        })
        return
      }

      // Action: create notebook
      const cleanTitle = (taskName || 'NEMI Task').replace(/[^a-zA-Z0-9_-]/g, '_')
      const filename = `NEMI_${cleanTitle}_${Date.now()}.ipynb`

      res.statusCode = 200
      res.end(
        JSON.stringify({
          success: true,
          filename,
          message: 'Notebook ready for export',
        })
      )
      return
    } catch (err: any) {
      res.statusCode = 500
      res.end(JSON.stringify({ success: false, error: err.message || 'Internal server error' }))
      return
    }
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
