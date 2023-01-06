
import { Construct } from 'constructs';
import { StackProps, Stack, Fn } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { CommonStack } from './CommonStack';
import { VpcConstructStack } from '../construct/VpcConstructStack';
import { BackEndStack } from './BackEndStack';

export enum SERVICE{
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  DELIVERY = 'DELIVERY',
  LOGISTICS = 'LOGISTICS',
}

export type ServiceProps = {
  appllicationName: string,
  vpc: ec2.Vpc,
  loadbalancer: elb.NetworkLoadBalancer,
  endpoints: {id: SERVICE, serviceName: string}[],
  stackProps: StackProps,
} 

export class MainStack extends Stack{

  constructor(scope: Construct, id: string, props: StackProps){
    super(scope, id, props);

    const appllicationName = "chan";

    const common = new CommonStack(this, 'common', {
      appllicationName: appllicationName,
      stackProps: {env: props.env, stackName: `${appllicationName}-common`},
    })

    //VPC Setting
    const customerVpc = new VpcConstructStack(this, `prj-vpc`, {
      serviceName: `${appllicationName}customer`,
      cidr:  '10.0.0.0/16',
      stackProps: {env: props.env, stackName : `${appllicationName}-customer-vpc`}
    });

    const endpoints = [
        {id: SERVICE.CUSTOMER , serviceName: customerVpc .endpointService.vpcEndpointServiceName },
    ];

    
    const customer = new BackEndStack(this, 'customer', {
      appllicationName: `${appllicationName}customer`,
      vpc: customerVpc.vpc,
      loadbalancer: customerVpc.loadbalancer,
      endpoints,
      stackProps: {env: props.env, stackName: `${appllicationName}-customer`},
    });
    
  }
  
}