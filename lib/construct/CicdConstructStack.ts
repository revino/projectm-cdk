import { Construct } from 'constructs';
import { Arn, CfnOutput, RemovalPolicy, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CodeBuildAction, CodeDeployEcsDeployAction, EcsDeployAction, GitHubSourceAction, ManualApprovalAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { BuildSpec, Cache, LinuxBuildImage, LocalCacheMode, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { EcsApplication, ServerDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';
import buildSpecContent from '../../config/buildSpecContent';
import { GitRepo } from '../../config/repositoryConfig';

export interface PipelineConfig{
  serviceName: string,
  gitRepo: GitRepo,
  ecrRepo: ecr.IRepository,
  service: ecsp.NetworkLoadBalancedEc2Service,
  stackProps?: StackProps,
}

export class CicdConstructStack extends Stack {

  private readonly config:PipelineConfig;

  constructor(scope: Construct, id: string, config: PipelineConfig) {
    super(scope, id, config.stackProps);
    
    this.config = config;
    
    //Code Pipeline
    const pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: config.serviceName, 
      artifactBucket: new s3.Bucket(this, `bucket`, {
        bucketName: `${config.serviceName}-pipeline`,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
    })});

    //Source Stage
    const sourceOutput = new Artifact();
    const sourceAction = this.getGitHubSourceAction(config.gitRepo, sourceOutput);
    pipeline.addStage({stageName: 'Source', actions: [sourceAction],})

    //Build Stage
    const buildOutput = new Artifact();
    const buildAction = this.getCodeBuildAction(sourceOutput, buildOutput);
    pipeline.addStage({stageName: 'Build', actions: [buildAction],})
    
    //Deploy Beta Stage
    const deployBetaAction = this.getEcsBetaDeployActioin(buildOutput);
    pipeline.addStage({stageName: 'Deploy-Beta', actions: [deployBetaAction],})

    /*
    확인 필요
    //Approve Stage
    const manualApprovalAction = this.getEcsApproveActioin();
    pipeline.addStage({stageName: 'Manual approval', actions: [manualApprovalAction],})

    //Deploy Prod Stage
    const deployProdAction = this.getEcsDeployActioin(buildOutput);
    pipeline.addStage({stageName: 'Deploy-Beta', actions: [deployProdAction],})
    */
  }
  
  private getGitHubSourceAction = (repo:GitRepo, output:Artifact) : GitHubSourceAction => {
    return new GitHubSourceAction({
        actionName: 'GitHubSourceAction',
        owner: repo.owner,
        output: output,
        repo: repo.repoName,
        branch: repo.branch,
        oauthToken: SecretValue.secretsManager(repo.tokenName),
    });
  }

  private getCodeBuildAction = (input: Artifact, output: Artifact): CodeBuildAction => {
    return new CodeBuildAction({
        actionName: "BuildAction",
        input: input,
        project: this.createCodeBuildProject(),
        outputs: [output]
    });
  }
  
  private getEcsBetaDeployActioin = (buildArtifact: Artifact):EcsDeployAction => {
    return new EcsDeployAction({
        actionName: `DeployAction`,
        service: this.config.service.service,
        input: buildArtifact,
    });
  }
                                              
  private getEcsApproveActioin = () : ManualApprovalAction => {

    const action = new ManualApprovalAction({
        actionName: `DeployAction`,
    });

    const role = iam.Role.fromRoleArn(this, 'Admin', Arn.format({ service: 'iam', resource: 'role', resourceName: 'Admin' }));
    action.grantManualApproval(role);

    return action;
  }

  private createCodeBuildProject = (): PipelineProject => {
    const buildspec = buildSpecContent;
    
    buildspec.phases.post_build.commands.push(
      `printf \'[{"name":"${this.config.serviceName}-container","imageUri":"%s"}]\' $ECR_REPO:latest > imagedefinitions.json`
    )
    
    const codeBuildProject = new PipelineProject(this, `${this.config.serviceName}-Codebuild`, {
        projectName: `${this.config.serviceName}-Codebuild`,
        environment: {
            buildImage: LinuxBuildImage.STANDARD_5_0,
            privileged: true,
        },
        environmentVariables: this.getEnvironmentVariables(),
        buildSpec: BuildSpec.fromObject(buildspec),
        cache: Cache.local(LocalCacheMode.DOCKER_LAYER, LocalCacheMode.CUSTOM),
    });

    codeBuildProject.role?.addManagedPolicy(
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser')
    );

    return codeBuildProject;
  }

  private getEnvironmentVariables = () => {
    return {
        ACCOUNT_ID: {
            value: this.account
        },
        ACCOUNT_REGION: {
            value: this.region
        },
        ECR_REPO: {
            value:  this.config.ecrRepo.repositoryUri
        },
        IMAGE_NAME: {
            value: this.config.ecrRepo.repositoryName
        },
    };
}

  
}
  