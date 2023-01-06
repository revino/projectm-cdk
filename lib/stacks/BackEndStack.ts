
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Stack } from 'aws-cdk-lib';
import { RdsConstructStack } from '../construct/RdsConstructStack';
import { Secret } from 'aws-cdk-lib/aws-ecs';
import { CicdConstructStack } from '../construct/CicdConstructStack';
import { MAIN_GIT_REPO } from '../../config/repositoryConfig';
import { ServiceProps } from './MainStack';
import { RepoConstructStack } from '../construct/RepoConstructStack';
import { EcsConstructStack } from '../construct/EcsConstructStack';

export class BackEndStack extends Stack{

  constructor(scope: Construct, id: string, props: ServiceProps){
    super(scope, id, props.stackProps);
 
    const applicationName = props.appllicationName.toLocaleLowerCase();

    const betaConfig = {
      serviceName : `${applicationName}`,
      ContainerPort : 8080,
      dbInstanceName: `${applicationName}`,
      dbPort : 5432,
      dbAdminName : 'postgres',
    }
    
    const vpc = props.vpc;
    
    //GitHub & ECR repository Setting
     const serviceRepo = new RepoConstructStack(this, `repo`, {
      ecrName: applicationName, 
      gitRepo: MAIN_GIT_REPO,
      ecrLoad: false,
      stackProps: {stackName : `${props.stackProps.stackName}-repo`, env: props.stackProps.env}
    });

    //Rds Setting
    const rdsInsatnce = new RdsConstructStack(this, `rds`, {
      dbName: betaConfig.serviceName,
      allocatedStorageGb: 5,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      port: betaConfig.dbPort,
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_28
      }),
      dbAdminName: betaConfig.dbAdminName,
      dbKeyName: betaConfig.serviceName,
      stackProps: {stackName : `${props.stackProps.stackName}-rds`, env: props.stackProps.env}
    })

    if(!rdsInsatnce.db.secret) throw 'db secret error';

    const secretEnv = {
      DATABASE_USERNAME: Secret.fromSecretsManager(rdsInsatnce.db.secret, "username"),
      DATABASE_PASSWORD: Secret.fromSecretsManager(rdsInsatnce.db.secret, "password"),
      DATABASE_HOST: Secret.fromSecretsManager(rdsInsatnce.db.secret, "host"),
      DATABASE_NAME: Secret.fromSecretsManager(rdsInsatnce.db.secret, "dbname"),
      DATABASE_PORT: Secret.fromSecretsManager(rdsInsatnce.db.secret, "port"),
    };

    const normalEnv = {
    };

    //Ecs Setting
    const service = new EcsConstructStack(this, `ecs`,  {
      serviceName: betaConfig.serviceName,
      clusterName: `${betaConfig.serviceName}-cluster`,
      dbKeyName: betaConfig.serviceName,
      vpc,
      loadbalancer: props.loadbalancer,
      containerSecretEnv: secretEnv,
      containerEnv: normalEnv,
      ecrRepo: serviceRepo.ecrRepo,
      containerPort: betaConfig.ContainerPort,
      stackProps: {stackName : `${props.stackProps.stackName}-ecs`, env: props.stackProps.env},
    });
    
    //CI / CD Setting
    const serviceCicd = new CicdConstructStack(this, `cicd`, {
      serviceName: `${applicationName}`,
      gitRepo: serviceRepo.gitRepo,
      ecrRepo: serviceRepo.ecrRepo,
      service: service.service,
      stackProps: {stackName : `${props.stackProps.stackName}-cicd`, env: props.stackProps.env}
    });
    
  }

}