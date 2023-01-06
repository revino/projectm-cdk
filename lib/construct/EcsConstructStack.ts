
import { Construct } from 'constructs';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

export type EcsConstructProps = {
  serviceName: string,
  ecrRepo: ecr.IRepository,
  containerPort: number,
  vpc: ec2.Vpc
  loadbalancer: elb.NetworkLoadBalancer,
  dbKeyName: string,
  clusterName: String,
  containerEnv: {[key : string]: string},
  containerSecretEnv: {[key : string]: ecs.Secret},
  stackProps?: StackProps,
}

export class EcsConstructStack extends Stack{

  public readonly loadbalancer: elb.NetworkLoadBalancer;
  public readonly listner: elb.NetworkListener;
  public readonly service: ecsp.NetworkLoadBalancedEc2Service;

  constructor(scope: Construct, id: string, props: EcsConstructProps){
    super(scope, id, props.stackProps);
    
    //find service
    const vpc = props.vpc
    const ecrRepo = props.ecrRepo;

    const instanceSecurityGroup = new ec2.SecurityGroup(this, 'instanceSecurityGroup', { 
      securityGroupName: `${props.serviceName}-asg-instance-sg`,
      vpc,
      allowAllOutbound: true,
    });

    instanceSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(),ec2.Port.allTraffic())
    instanceSecurityGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const autoScalingGroup = new AutoScalingGroup(this, 'asg', {
      autoScalingGroupName: `${props.serviceName}-asg`,
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      desiredCapacity: 2,
      maxCapacity: 4,
      minCapacity: 2,
      securityGroup: instanceSecurityGroup,
      requireImdsv2: true,
    });

    autoScalingGroup.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      cooldown: Duration.minutes(5),
    });

    autoScalingGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const cluster = new ecs.Cluster(this, `cluster`, { 
      clusterName: `${props.clusterName}`,
      vpc,
    });

    cluster.addAsgCapacityProvider(new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', {
      autoScalingGroup,
    }));
    
    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDef', {
      compatibility: ecs.Compatibility.EC2,
      memoryMiB: '512',
      cpu: '256',
    });

    const logGroup = new LogGroup(this, 'loggroup', {
      logGroupName: props.serviceName+"-prod",
      retention: RetentionDays.ONE_WEEK,
    })

    taskDefinition.addContainer(`container`, {
      containerName: `${props.serviceName}-container`,
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest'),
      memoryLimitMiB: 256,
      secrets: props.containerSecretEnv,
      environment: props.containerEnv,
      cpu: 256,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "prod",
        logGroup: logGroup,
      }),
      portMappings:[
        {hostPort:80, containerPort: props.containerPort, protocol: ecs.Protocol.TCP},
      ]
    })

    const service = new ecsp.NetworkLoadBalancedEc2Service(this, `${props.serviceName}`, {
      cluster: cluster,
      cpu: 256,
      loadBalancer: props.loadbalancer,
      memoryLimitMiB: 256,
      desiredCount: 2,
      minHealthyPercent: 80,
      maxHealthyPercent: 100,
      serviceName: props.serviceName,
      taskDefinition: taskDefinition,
      publicLoadBalancer: false,
    });
    
    service.targetGroup.configureHealthCheck({
      timeout: Duration.seconds(10),
    })
    
    this.loadbalancer = service.loadBalancer;
    this.listner = service.listener;
    this.service = service;

  }
  
}