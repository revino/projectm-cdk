
import { Construct } from 'constructs';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

export type EcsConstructProps = {
  serviceName: string,
  ecrRepo: ecr.IRepository,
  containerPort: number,
  vpc: ec2.Vpc
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

    const autoScalingGroup = new AutoScalingGroup(this, 'asg', {
      autoScalingGroupName: `${props.serviceName}-asg`,
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      desiredCapacity: 1,
      maxCapacity: 2,
      minCapacity: 1,
      securityGroup: instanceSecurityGroup,
    });

    autoScalingGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    //
    const nlb = new elb.NetworkLoadBalancer(this, 'nlb', {
      loadBalancerName: `${props.serviceName}-nlb`,
      vpc,
      crossZoneEnabled: false,
      internetFacing: false,
    });

    const cluster = new ecs.Cluster(this, `cluster`, { 
      clusterName: `${props.clusterName}`,
      vpc,
    });

    cluster.addAsgCapacityProvider(new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', {
      autoScalingGroup,
    }));

    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDef', {
      compatibility: ecs.Compatibility.EC2,
      memoryMiB: '256',
      cpu: '1024',
    });

    const logGroup = new LogGroup(this, 'loggroup', {
      logGroupName: props.serviceName+"-prod",
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    taskDefinition.addContainer(`container`, {
      containerName: `${props.serviceName}-container`,
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest'),
      memoryLimitMiB: 256,
      secrets: props.containerSecretEnv,
      environment: props.containerEnv,
      cpu: 1024,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "prod",
        logGroup: logGroup,
      }),
    }).addPortMappings({ 
      hostPort:80,
      containerPort: props.containerPort, 
      protocol:ecs.Protocol.TCP 
    });

    const service = new ecsp.NetworkLoadBalancedEc2Service(this, `${props.serviceName}`, {
      cluster: cluster,
      cpu: 1024,
      loadBalancer: nlb,
      listenerPort: 80,
      memoryLimitMiB: 256,
      desiredCount: 1,
      minHealthyPercent: 50,
      maxHealthyPercent: 100,
      serviceName: props.serviceName,
      taskDefinition: taskDefinition,
      publicLoadBalancer: false,
    });

    service.targetGroup.configureHealthCheck({
      "interval": Duration.seconds(10),
      "timeout": Duration.seconds(5),
      "healthyThresholdCount": 2,
      "unhealthyThresholdCount": 2,
    });

    //scaling
    /*
    const scaleableTaskCount = service.service.autoScaleTaskCount({
      maxCapacity: 2,
    })

    scaleableTaskCount.scaleOnCpuUtilization('Scaling', {
      targetUtilizationPercent: 60,
    })
    */

    this.loadbalancer = service.loadBalancer;
    this.listner = service.listener;
    this.service = service;

    

  }
  
}