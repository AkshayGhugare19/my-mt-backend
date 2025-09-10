podTemplate(inheritFrom: 'default kaniko') {
    node(POD_LABEL) {
        stage ('Checkout') {
            checkout scm
        }
        
        stage('Build and push docker image') {            
            container('kaniko') {
                sh '/kaniko/executor --insecure --skip-tls-verify --cleanup --dockerfile=$PWD/Dockerfile --context=dir://$PWD --destination=registry.digitalocean.com/royalstakes-registry/royalstakes-backend:latest'
            }
        }
    }
}