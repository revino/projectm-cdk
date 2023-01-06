import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, ShellStep, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { INFRA_GIT_REPO } from '../../config/repositoryConfig'
import { RegistrationStage } from '../stages/RegistrationStage';

export class InfraCicdStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const githubConnection =  CodePipelineSource.gitHub(`${INFRA_GIT_REPO.owner}/${INFRA_GIT_REPO.repoName}`, INFRA_GIT_REPO.branch);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: `InfraPipeline`,
      synth: new ShellStep('Synth', {
        input: githubConnection,
        installCommands: [
          'npm install typescript -g'
        ],
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth'
        ],
      }),

    });

    pipeline.addStage(new RegistrationStage(this, 'serviceRegistration',{
      env: props?.env,
    }));


  }
}
