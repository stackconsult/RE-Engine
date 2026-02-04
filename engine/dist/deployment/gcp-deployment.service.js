/**
 * Google Cloud Deployment Service
 * Integrates with Google Cloud SDK for deployment and management
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger, logSystemEvent, logError } from '../observability/logger.js';
const execAsync = promisify(exec);
export class GCPDeploymentService {
    config;
    initialized = false;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        try {
            logSystemEvent('gcp-deployment-init', 'info', { projectId: this.config.projectId });
            // Initialize gcloud CLI
            await this.executeCommand('gcloud version', 'Checking gcloud installation');
            // Set project
            await this.executeCommand(`gcloud config set project ${this.config.projectId}`, 'Setting project');
            // Set default region and zone
            await this.executeCommand(`gcloud config set compute/region ${this.config.region}`, 'Setting region');
            await this.executeCommand(`gcloud config set compute/zone ${this.config.zone}`, 'Setting zone');
            // Authenticate if service account key provided
            if (this.config.serviceAccountKey) {
                await this.executeCommand(`gcloud auth activate-service-account --key-file=${this.config.serviceAccountKey}`, 'Authenticating with service account');
            }
            this.initialized = true;
            logSystemEvent('gcp-deployment-init-success', 'info', { projectId: this.config.projectId });
        }
        catch (error) {
            logError(error, 'gcp-deployment-init-failed');
            throw error;
        }
    }
    async deployToCloudRun(imageName, serviceName) {
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            logSystemEvent('cloudrun-deploy-start', 'info', { imageName, serviceName });
            // Deploy to Cloud Run
            const deployCommand = [
                'gcloud run deploy',
                serviceName,
                `--image=${imageName}`,
                `--region=${this.config.region}`,
                '--platform=managed',
                '--allow-unauthenticated',
                '--memory=512Mi',
                '--cpu=1',
                '--timeout=300',
                '--concurrency=80',
                '--max-instances=100'
            ].join(' ');
            const { stdout } = await this.executeCommand(deployCommand, 'Deploying to Cloud Run');
            // Get service URL
            const { stdout: serviceInfo } = await this.executeCommand(`gcloud run services describe ${serviceName} --region=${this.config.region} --format="value(status.url)"`, 'Getting service URL');
            const serviceUrl = serviceInfo.trim();
            logSystemEvent('cloudrun-deploy-success', 'info', {
                serviceName,
                serviceUrl,
                projectId: this.config.projectId
            });
            return {
                success: true,
                message: `Successfully deployed ${serviceName} to Cloud Run`,
                details: {
                    serviceName,
                    serviceUrl,
                    region: this.config.region,
                    projectId: this.config.projectId
                }
            };
        }
        catch (error) {
            logError(error, 'cloudrun-deploy-failed', { serviceName, imageName });
            return {
                success: false,
                message: `Failed to deploy ${serviceName} to Cloud Run`,
                error: error.message
            };
        }
    }
    async deployToGKE(imageName, deploymentName, namespace = 'default') {
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            logSystemEvent('gke-deploy-start', 'info', { imageName, deploymentName, namespace });
            // Get cluster credentials
            if (this.config.clusterName) {
                await this.executeCommand(`gcloud container clusters get-credentials ${this.config.clusterName} --region=${this.config.region}`, 'Getting cluster credentials');
            }
            // Apply Kubernetes deployment
            const kubectlCommand = [
                'kubectl apply -f -',
                `--namespace=${namespace}`
            ].join(' ');
            // Create deployment manifest
            const deploymentManifest = this.createK8sDeploymentManifest(imageName, deploymentName, namespace);
            const { stdout } = await this.executeCommand(`echo '${deploymentManifest}' | ${kubectlCommand}`, 'Applying Kubernetes deployment');
            // Wait for deployment to be ready
            await this.executeCommand(`kubectl rollout status deployment/${deploymentName} --namespace=${namespace}`, 'Waiting for deployment rollout');
            // Get service information
            const { stdout: serviceInfo } = await this.executeCommand(`kubectl get service ${deploymentName}-service --namespace=${namespace} -o json`, 'Getting service information');
            const serviceData = JSON.parse(serviceInfo);
            const serviceUrl = serviceData.status?.loadBalancer?.ingress?.[0]?.ip
                ? `http://${serviceData.status.loadBalancer.ingress[0].ip}`
                : 'Service not externally exposed';
            logSystemEvent('gke-deploy-success', 'info', {
                deploymentName,
                serviceUrl,
                namespace,
                projectId: this.config.projectId
            });
            return {
                success: true,
                message: `Successfully deployed ${deploymentName} to GKE`,
                details: {
                    deploymentName,
                    serviceUrl,
                    namespace,
                    projectId: this.config.projectId
                }
            };
        }
        catch (error) {
            logError(error, 'gke-deploy-failed', { deploymentName, imageName });
            return {
                success: false,
                message: `Failed to deploy ${deploymentName} to GKE`,
                error: error.message
            };
        }
    }
    async buildAndPushImage(imageName, dockerfilePath = 'Dockerfile') {
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            logSystemEvent('image-build-start', 'info', { imageName });
            // Configure Docker to use gcloud as credential helper
            await this.executeCommand('gcloud auth configure-docker', 'Configuring Docker registry');
            // Build image
            await this.executeCommand(`docker build -t ${imageName} -f ${dockerfilePath} .`, 'Building Docker image');
            // Tag image for Google Container Registry
            const gcrImage = `gcr.io/${this.config.projectId}/${imageName}`;
            await this.executeCommand(`docker tag ${imageName} ${gcrImage}`, 'Tagging image for GCR');
            // Push image
            await this.executeCommand(`docker push ${gcrImage}`, 'Pushing image to GCR');
            logSystemEvent('image-build-success', 'info', { imageName, gcrImage });
            return {
                success: true,
                message: `Successfully built and pushed image ${imageName}`,
                details: {
                    localImage: imageName,
                    registryImage: gcrImage,
                    projectId: this.config.projectId
                }
            };
        }
        catch (error) {
            logError(error, 'image-build-failed', { imageName });
            return {
                success: false,
                message: `Failed to build and push image ${imageName}`,
                error: error.message
            };
        }
    }
    async createCloudSQLInstance(instanceName, databaseVersion = 'POSTGRES_15') {
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            logSystemEvent('cloudsql-create-start', 'info', { instanceName, databaseVersion });
            const createCommand = [
                'gcloud sql instances create',
                instanceName,
                `--database-version=${databaseVersion}`,
                `--region=${this.config.region}`,
                '--tier=db-f1-micro',
                '--storage-size=10GB',
                '--storage-type=SSD',
                '--backup-start-time=02:00',
                '--retained-backups-count=7',
                '--deletion-protection'
            ].join(' ');
            const { stdout } = await this.executeCommand(createCommand, 'Creating Cloud SQL instance');
            // Get connection details
            const { stdout: connectionInfo } = await this.executeCommand(`gcloud sql instances describe ${instanceName} --format="value(databaseVersion,region,ipAddresses.ipAddress)"`, 'Getting connection details');
            logSystemEvent('cloudsql-create-success', 'info', { instanceName });
            return {
                success: true,
                message: `Successfully created Cloud SQL instance ${instanceName}`,
                details: {
                    instanceName,
                    databaseVersion,
                    region: this.config.region,
                    connectionInfo: connectionInfo.trim()
                }
            };
        }
        catch (error) {
            logError(error, 'cloudsql-create-failed', { instanceName });
            return {
                success: false,
                message: `Failed to create Cloud SQL instance ${instanceName}`,
                error: error.message
            };
        }
    }
    async executeCommand(command, description) {
        logger.info({ message: `Executing: ${description}`, command });
        try {
            const result = await execAsync(command);
            logger.info({ message: `Command completed: ${description}`, stdout: result.stdout });
            return result;
        }
        catch (error) {
            logger.error({ message: `Command failed: ${description}`, command, errorMessage: error.message, stderr: error.stderr });
            throw new Error(`Failed to execute command: ${description}. Error: ${error.message}`);
        }
    }
    createK8sDeploymentManifest(imageName, deploymentName, namespace) {
        return `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${deploymentName}
  namespace: ${namespace}
  labels:
    app: ${deploymentName}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${deploymentName}
  template:
    metadata:
      labels:
        app: ${deploymentName}
    spec:
      containers:
      - name: ${deploymentName}
        image: ${imageName}
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ${deploymentName}-service
  namespace: ${namespace}
spec:
  selector:
    app: ${deploymentName}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
`;
    }
}
export default GCPDeploymentService;
//# sourceMappingURL=gcp-deployment.service.js.map