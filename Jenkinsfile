pipeline {
    agent any

    tools {
        nodejs "nodeJS_22"
    }

    options { buildDiscarder(logRotator(numToKeepStr: '5')) }

    environment {
        DOCKER_CREDENTIALS = credentials('codevertDocker')
        DOCKER_TAG = "${env.BRANCH_NAME == 'main' ? 'latest' : env.BRANCH_NAME}"
        ENV_ID = "${env.BRANCH_NAME == 'main' ? 'streamaccess_backend_env' : "streamacces_backend_env_" + env.BRANCH_NAME}"
        DISCORD_WEBHOOK = credentials('discord-osg-webhook')
    }

    stages {
        stage('Clean') {
            steps {
                cleanWs()
            }
        }

        stage('Pull sources') {
            steps {
                git branch: '${BRANCH_NAME}',
                credentialsId: 'github_key',
                url: 'git@github.com:WhitedogWarren/OldSchoolGamesV2_backend.git'
                script {
                    env.GIT_COMMIT_MSG = sh(script: 'git log -1 --pretty=%B ${GIT_COMMIT}', returnStdout: true).trim()
                }
            }
        }

        stage('install') {
            steps {
                echo 'performing install...'
                sh '''
                    npm install
                '''
            }
        }
    }

    post {
        always {
            script {
                def messageResult = "is unknown"
                def footer = "What happened ?"
                def smiley = "🤔"
                if (currentBuild.currentResult == 'SUCCESS') {
                    messageResult = "succeed"
                    footer = "Good job !"
                    smiley = "😎"
                }
                if (currentBuild.currentResult == 'UNSTABLE') {
                    messageResult = "is unstable"
                    footer = "Let's make it cleaner !"
                    smiley = "🫤"
                }
                if (currentBuild.currentResult == 'FAILURE') {
                    messageResult = "failed"
                    footer = "Better luck next try ?"
                    smiley = "😭"
                }
                sh 'echo ${GIT_COMMIT_MSG}'
                discordSend description: "Jenkins Pipeline Build for StreamAccess-Backend ${BRANCH_NAME} ${messageResult} ! ${smiley}\n\ngit commit message :\n${GIT_COMMIT_MSG}",
                footer: "${footer}",
                link: "$BUILD_URL",
                result: currentBuild.currentResult,
                title: JOB_NAME,
                webhookURL: "${DISCORD_WEBHOOK}"
            }
        }
    }
}