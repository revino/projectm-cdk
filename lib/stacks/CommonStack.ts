
import { Construct } from 'constructs';
import { StackProps, Stack, aws_gamelift, RemovalPolicy } from 'aws-cdk-lib';
import { NetworkListener, NetworkLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Vpc } from 'aws-cdk-lib/aws-ec2';

export type ChanCommonProps = {
  appllicationName: string,
  stackProps: StackProps,
} 

export type ApiProps = {
  serviceName: string,
  loadbalancer: NetworkLoadBalancer,
  listener: NetworkListener,
  vpc: Vpc,
  stackProps?: StackProps,
} 

export class CommonStack extends Stack{


  constructor(scope: Construct, id: string, props: ChanCommonProps){
    super(scope, id, props.stackProps);


  }
}