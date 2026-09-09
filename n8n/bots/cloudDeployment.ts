import type { N8nBot } from '../types'

export const cloudDeploymentBot: N8nBot = {
  id: 'cloud-deployment',
  name: 'Cloud Deployment Bot',
  shortName: 'Cloud IaC',
  emoji: '☁️',
  category: 'Advanced Production',
  description: 'Infrastructure as Code: production Terraform modules, K8s manifests, Helm charts, and cloud cost estimation.',
  defaultWebhook: 'cloud/terraform/generate',
  workflowFile: 'workflows/cloud-deployment.workflow.json',
  supportedTasks: ['terraform', 'k8s', 'helm', 'deploy', 'validate', 'cost', 'cicd'],
  placeholder: 'Generate Terraform modules, K8s manifests, or Helm charts...',
  samplePrompts: [
    '☁️ Modular Terraform for AWS multi-region EKS cluster',
    '☸️ Production Kubernetes StatefulSet manifest with HPA & probes',
    '💰 Cloud cost estimation and egress optimization at 100TB/mo',
  ],
  directive: `You are the Cloud Infrastructure & DevOps Specialist ☁️.
- Produce complete, production-grade Terraform modules, Kubernetes manifests, Dockerfiles, and CI/CD pipelines with zero placeholders.
- Always configure secure defaults: non-root containers, readiness/liveness probes, resource limits, and encrypted state stores.
- Provide step-by-step verification commands (\`terraform plan\`, \`kubectl apply -f\`, \`helm lint\`).`,
}
