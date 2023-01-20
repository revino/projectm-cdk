
import { Construct } from 'constructs';
import { StackProps, Stack, Fn } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { VpcConstructStack } from '../construct/VpcConstructStack';
import { MAIN_GIT_REPO } from '../../config/repositoryConfig';
import { RepoConstructStack } from '../construct/RepoConstructStack';
import { RdsConstructStack } from '../construct/RdsConstructStack';
import { Secret } from 'aws-cdk-lib/aws-ecs';
import { backendSecretEnv } from '../../config/enviromentConfig';
import { EcsConstructStack } from '../construct/EcsConstructStack';
import { ApiGatewayStack } from './ApiGatewayStack';
import { CloudWatchStack } from './CloudWatchStack';
import { UserApi } from '../api/UserApi';
import { ChannelApi } from '../api/ChannelApi';


export type ServiceProps = {
  appllicationName: string,
  vpc: ec2.Vpc,
  stackProps: StackProps,
} 

export class MainStack extends Stack{

  constructor(scope: Construct, id: string, props: StackProps){
    super(scope, id, props);

    const betaConfig = {
      serviceName : `${props.stackName}`,
      ContainerPort : 8080,
      dbInstanceName: `${props.stackName}`,
      dbPort : 3306,
      dbAdminName : 'admin',
    }

    //VPC Setting
    const vpc = new VpcConstructStack(this, `vpc`, {
      serviceName: betaConfig.serviceName,
      cidr:  '10.0.0.0/16',
      stackProps: {stackName: `${props.stackName}-vpc`, env: props.env}
    });
    
    //GitHub & ECR repository Setting
     const serviceRepo = new RepoConstructStack(this, `repo`, {
      ecrName: betaConfig.serviceName.toLocaleLowerCase(),
      gitRepo: MAIN_GIT_REPO,
      ecrLoad: false,
      stackProps: {stackName : `${props.stackName}-repo`, env: props.env}
    });

    //Rds Setting
    const rdsInsatnce = new RdsConstructStack(this, `rds`, {
      dbName: betaConfig.serviceName,
      allocatedStorageGb: 5,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc.vpc,
      port: betaConfig.dbPort,
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_28
      }),
      dbAdminName: betaConfig.dbAdminName,
      dbKeyName: betaConfig.serviceName,
      stackProps: {stackName : `${props.stackName}-rds`, env: props.env}
    })

    if(!rdsInsatnce.db.secret) throw 'db secret error';

    const secret = secretsmanager.Secret.fromSecretNameV2(this, 'ImportedSecret', backendSecretEnv.name);

    const secretEnv = {
      DATABASE_USERNAME: Secret.fromSecretsManager(rdsInsatnce.db.secret, "username"),
      DATABASE_PASSWORD: Secret.fromSecretsManager(rdsInsatnce.db.secret, "password"),
      DATABASE_HOST: Secret.fromSecretsManager(rdsInsatnce.db.secret, "host"),
      DATABASE_NAME: Secret.fromSecretsManager(rdsInsatnce.db.secret, "dbname"),
      DATABASE_PORT: Secret.fromSecretsManager(rdsInsatnce.db.secret, "port"),

      //oauth
      JWT_SECRET: Secret.fromSecretsManager(secret, backendSecretEnv.JWT_SECRET),
      AUTH_TOKEN_SECRET: Secret.fromSecretsManager(secret, backendSecretEnv.AUTH_TOKEN_SECRET),
      AUTH_TOKEN_EXPIRY: Secret.fromSecretsManager(secret, backendSecretEnv.AUTH_TOKEN_EXPIRY),
      AUTH_REFRESH_TOKEN_EXPIRY: Secret.fromSecretsManager(secret, backendSecretEnv.AUTH_REFRESH_TOKEN_EXPIRY),
      AUTH_REDIRECT_URI: Secret.fromSecretsManager(secret, backendSecretEnv.AUTH_REDIRECT_URI),
      
      //google
      GOOGLE_OAUTH_CLIENT_ID: Secret.fromSecretsManager(secret, backendSecretEnv.GOOGLE_OAUTH_CLIENT_ID),
      GOOGLE_OAUTH_CLIENT_SECRET: Secret.fromSecretsManager(secret, backendSecretEnv.GOOGLE_OAUTH_CLIENT_SECRET),
      GOOGLE_OAUTH_REDIRECT_URI: Secret.fromSecretsManager(secret, backendSecretEnv.GOOGLE_OAUTH_REDIRECT_URI),
      GOOGLE_OAUTH_SCOPE: Secret.fromSecretsManager(secret, backendSecretEnv.GOOGLE_OAUTH_SCOPE),

    };

    const normalEnv = {};

    //Ecs Setting
    const service = new EcsConstructStack(this, `ecs`,  {
      serviceName: betaConfig.serviceName,
      clusterName: `${betaConfig.serviceName}-cluster`,
      dbKeyName: betaConfig.serviceName,
      vpc: vpc.vpc,
      containerSecretEnv: secretEnv,
      containerEnv: normalEnv,
      ecrRepo: serviceRepo.ecrRepo,
      containerPort: betaConfig.ContainerPort,
      stackProps: {stackName : `${props.stackName}-ecs`, env: props.env},
    });

    //cloudwatch 
    const cloudwatch = new CloudWatchStack(this, `cloudwatch`,  {
      service: service.service,
      stackProps: {stackName : `${props.stackName}-cloudwatch`, env: props.env},
    });

    const apigateway = new ApiGatewayStack(this, `apigateway`,  {
      vpc: vpc.vpc,
      loadBalancer: service.loadbalancer,
      stackProps: {stackName : `${props.stackName}-apiGateway`, env: props.env},
    });
    
    new UserApi(this, `userApi`,  {
      loadbalancer: service.loadbalancer,
      api: apigateway.api,
      vpclink : apigateway.vpclink,
      stackProps: {stackName : `${props.stackName}-api-user`, env: props.env},
    });

    new ChannelApi(this, `channelApi`,  {
      loadbalancer: service.loadbalancer,
      api: apigateway.api,
      vpclink : apigateway.vpclink,
      stackProps: {stackName : `${props.stackName}-api-channel`, env: props.env},
    });

    /*
    //CI / CD Setting
    const serviceCicd = new CicdConstructStack(this, `cicd`, {
      serviceName: `${applicationName}`,
      gitRepo: serviceRepo.gitRepo,
      ecrRepo: serviceRepo.ecrRepo,
      service: service.service,
      stackProps: {stackName : `${props.stackProps.stackName}-cicd`, env: props.stackProps.env}
    });
    */
    
  }
  
}